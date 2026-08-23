<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import { FileSystemAdapter, type App } from 'obsidian';
	import { askVault, type RunClaudeHandle } from './runClaude';
	import { buildLiveContext } from './liveContext';

	const app = getContext<App>('app');

	let question = '';
	let answer = '';
	let errorMsg = '';
	let asking = false;
	let activeHandle: RunClaudeHandle | null = null;
	let askedByVoice = false;

	let listening = false;
	let recognition: SpeechRecognition | null = null;
	const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

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

	function toggleListening(): void {
		if (listening) {
			recognition?.stop();
			return;
		}
		if (!SpeechRecognitionCtor) {
			errorMsg = 'Voice input is not available in this environment (Obsidian/Electron does not expose speech recognition here).';
			return;
		}

		errorMsg = '';
		recognition = new SpeechRecognitionCtor();
		recognition.lang = 'en-US';
		recognition.continuous = false;
		recognition.interimResults = false;

		recognition.onresult = (event) => {
			const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
			if (transcript.trim()) {
				question = transcript.trim();
				void ask(true);
			}
		};
		recognition.onerror = (event) => {
			errorMsg = `Voice input error: ${event.error}`;
			listening = false;
		};
		recognition.onend = () => {
			listening = false;
		};

		listening = true;
		recognition.start();
	}

	onDestroy(() => {
		activeHandle?.kill();
		recognition?.abort();
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
			disabled={asking}
		/>
		<button
			class="sbd-mic-btn"
			class:sbd-mic-active={listening}
			on:click={toggleListening}
			disabled={asking}
			aria-label={listening ? 'Stop listening' : 'Ask by voice'}
			title={listening ? 'Stop listening' : 'Ask by voice'}
		>
			🎤
		</button>
		{#if asking}
			<button on:click={stop}>Stop</button>
		{:else}
			<button on:click={() => ask()} disabled={!question.trim()}>Ask</button>
		{/if}
	</div>

	{#if listening}
		<div class="sbd-muted">Listening…</div>
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
