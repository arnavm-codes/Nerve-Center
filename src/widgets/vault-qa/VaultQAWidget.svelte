<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { FileSystemAdapter, type App } from 'obsidian';
	import * as fs from 'fs';
	import * as os from 'os';
	import * as path from 'path';
	import { askVault, type RunClaudeHandle } from './runClaude';
	import { buildLiveContext } from './liveContext';
	import { startRecording, encodeWav, type Recorder } from './recordAudio';
	import { resolveWhisperBinary, resolveWhisperModel, transcribeWav } from './runWhisper';
	import { dashboardData } from '../../settings/store';
	import type { VaultQAWidgetSettings } from './types';

	interface ChatMessage {
		id: string;
		question: string;
		answer: string;
		errorMsg: string;
		askedByVoice: boolean;
		done: boolean;
	}

	const WIDGET_ID = 'vault-qa';
	const app = getContext<App>('app');

	let messages: ChatMessage[] = [];
	let currentQuestion = '';
	let setupError = '';
	let asking = false;
	let activeHandle: RunClaudeHandle | null = null;

	let recording = false;
	let transcribing = false;
	let activeRecorder: Recorder | null = null;

	function vaultPath(): string | null {
		return app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : null;
	}

	async function ask(byVoice = false): Promise<void> {
		const q = currentQuestion.trim();
		if (!q || asking) return;

		const base = vaultPath();
		if (!base) {
			setupError = 'Vault Q&A requires desktop Obsidian (needs local filesystem access).';
			return;
		}

		setupError = '';
		asking = true;
		currentQuestion = '';

		const msg: ChatMessage = { id: `${Date.now()}-${Math.random()}`, question: q, answer: '', errorMsg: '', askedByVoice: byVoice, done: false };
		messages = [...messages, msg];

		const liveContext = await buildLiveContext(app);
		if (!asking) return; // Stop was hit while context was still being gathered.

		const handle = askVault(q, base, liveContext);
		activeHandle = handle;
		handle.onChunk((chunk) => {
			msg.answer += chunk;
			messages = messages;
		});
		handle.onError((message) => {
			msg.errorMsg = msg.errorMsg ? `${msg.errorMsg}\n${message}` : message;
			messages = messages;
		});
		handle.onClose(() => {
			msg.done = true;
			messages = messages;
			asking = false;
			activeHandle = null;
			if (msg.askedByVoice && msg.answer) speak(msg.answer);
		});
	}

	function stop(): void {
		activeHandle?.kill();
		asking = false;
		activeHandle = null;
		window.speechSynthesis?.cancel();
		const last = messages[messages.length - 1];
		if (last && !last.done) {
			last.done = true;
			messages = messages;
		}
	}

	function deleteMessage(id: string): void {
		messages = messages.filter((m) => m.id !== id);
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void ask();
		}
	}

	function speak(text: string): void {
		if (!window.speechSynthesis) return;
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
	}

	async function toggleMic(): Promise<void> {
		if (recording) {
			await finishRecording();
			return;
		}
		if (transcribing || asking) return;

		setupError = '';
		try {
			activeRecorder = await startRecording();
			recording = true;
		} catch (err) {
			setupError = `Couldn't access the microphone: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	async function finishRecording(): Promise<void> {
		const recorder = activeRecorder;
		activeRecorder = null;
		recording = false;
		if (!recorder) return;

		const settings = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as VaultQAWidgetSettings;
		const binary = resolveWhisperBinary(settings.whisperBinaryPath);
		const model = resolveWhisperModel(settings.whisperModelPath);
		if (!binary || !model) {
			recorder.cancel();
			setupError =
				'Voice input needs a local whisper.cpp binary + model. Set them up via [Configure] in settings.';
			return;
		}

		transcribing = true;
		let tmpFile: string | null = null;
		try {
			const samples = await recorder.stop();
			const wav = encodeWav(samples);
			tmpFile = path.join(os.tmpdir(), `secondbrain-dashboard-${Date.now()}.wav`);
			fs.writeFileSync(tmpFile, wav);

			const transcript = await transcribeWav(tmpFile, binary, model);
			if (transcript) {
				currentQuestion = transcript;
				await ask(true);
			}
		} catch (err) {
			setupError = `Transcription failed: ${err instanceof Error ? err.message : String(err)}`;
		} finally {
			transcribing = false;
			if (tmpFile) {
				try {
					fs.unlinkSync(tmpFile);
				} catch {
					// best-effort cleanup, not worth surfacing to the user
				}
			}
		}
	}

	// Deliberately no kill here: the widget now stays mounted across tab
	// switches (Dashboard.svelte hides inactive tabs with CSS instead of
	// destroying them), so onDestroy only fires on a real plugin/view
	// teardown - which is exactly when an in-flight process should be killed.
	onDestroy(() => {
		activeHandle?.kill();
		activeRecorder?.cancel();
		window.speechSynthesis?.cancel();
	});
</script>

<div class="sbd-qa">
	{#if messages.length > 0}
		<div class="sbd-qa-messages">
			{#each messages as msg (msg.id)}
				<div class="sbd-qa-message">
					<div class="sbd-qa-question">&gt; "{msg.question}"</div>
					{#if msg.answer}
						<div class="sbd-qa-answer">{msg.answer}</div>
					{:else if !msg.done}
						<div class="sbd-muted">Claude: thinking…</div>
					{/if}
					{#if msg.errorMsg}
						<div class="sbd-error">{msg.errorMsg}</div>
					{/if}
					{#if msg.done}
						<button class="sbd-qa-delete" on:click={() => deleteMessage(msg.id)} aria-label="Delete" title="Delete">
							🗑
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if setupError}
		<div class="sbd-error">{setupError}</div>
	{/if}

	{#if recording}
		<div class="sbd-muted">Recording… click the mic again to stop.</div>
	{:else if transcribing}
		<div class="sbd-muted">Transcribing…</div>
	{/if}

	<div class="sbd-qa-input-row">
		<input
			type="text"
			bind:value={currentQuestion}
			on:keydown={handleKeydown}
			placeholder="Ask your vault…"
			disabled={asking || recording || transcribing}
		/>
		<button
			class="sbd-mic-btn"
			class:sbd-mic-active={recording}
			on:click={toggleMic}
			disabled={asking || transcribing}
			aria-label={recording ? 'Stop recording' : 'Ask by voice'}
			title={recording ? 'Stop recording' : 'Ask by voice'}
		>
			🎤
		</button>
		{#if asking}
			<button on:click={stop}>Stop</button>
		{:else}
			<button on:click={() => ask()} disabled={!currentQuestion.trim() || recording || transcribing}>Ask</button>
		{/if}
	</div>
</div>
