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

	const WIDGET_ID = 'vault-qa';
	const app = getContext<App>('app');

	let question = '';
	let answer = '';
	let errorMsg = '';
	let asking = false;
	let activeHandle: RunClaudeHandle | null = null;
	let askedByVoice = false;

	let recording = false;
	let transcribing = false;
	let activeRecorder: Recorder | null = null;

	function vaultPath(): string | null {
		return app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : null;
	}

	async function ask(byVoice = false): Promise<void> {
		const q = question.trim();
		if (!q || asking) return;

		const base = vaultPath();
		if (!base) {
			errorMsg = 'Vault Q&A requires desktop Obsidian (needs local filesystem access).';
			return;
		}

		answer = '';
		errorMsg = '';
		asking = true;
		askedByVoice = byVoice;

		const liveContext = await buildLiveContext(app);
		if (!asking) return; // Stop was hit while context was still being gathered.

		const handle = askVault(q, base, liveContext);
		activeHandle = handle;
		handle.onChunk((chunk) => {
			answer += chunk;
		});
		handle.onError((message) => {
			errorMsg = errorMsg ? `${errorMsg}\n${message}` : message;
		});
		handle.onClose(() => {
			asking = false;
			activeHandle = null;
			if (askedByVoice && answer) speak(answer);
		});
	}

	function stop(): void {
		activeHandle?.kill();
		asking = false;
		activeHandle = null;
		window.speechSynthesis?.cancel();
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

		errorMsg = '';
		try {
			activeRecorder = await startRecording();
			recording = true;
		} catch (err) {
			errorMsg = `Couldn't access the microphone: ${err instanceof Error ? err.message : String(err)}`;
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
			errorMsg =
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
				question = transcript;
				await ask(true);
			}
		} catch (err) {
			errorMsg = `Transcription failed: ${err instanceof Error ? err.message : String(err)}`;
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

	onDestroy(() => {
		activeHandle?.kill();
		activeRecorder?.cancel();
		window.speechSynthesis?.cancel();
	});
</script>

<div class="sbd-qa">
	<div class="sbd-qa-input-row">
		<input
			type="text"
			bind:value={question}
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
			<button on:click={() => ask()} disabled={!question.trim() || recording || transcribing}>Ask</button>
		{/if}
	</div>

	{#if recording}
		<div class="sbd-muted">Recording… click the mic again to stop.</div>
	{:else if transcribing}
		<div class="sbd-muted">Transcribing…</div>
	{/if}

	{#if question && (answer || asking || errorMsg)}
		<div class="sbd-qa-question">&gt; "{question}"</div>
	{/if}

	{#if answer}
		<div class="sbd-qa-answer">{answer}</div>
	{:else if asking}
		<div class="sbd-muted">Claude: thinking…</div>
	{/if}

	{#if errorMsg}
		<div class="sbd-error">{errorMsg}</div>
	{/if}
</div>
