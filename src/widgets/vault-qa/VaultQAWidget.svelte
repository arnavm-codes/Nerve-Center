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

	function vaultPath(): string | null {
		return app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : null;
	}

	async function ask(): Promise<void> {
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
		});
	}

	function stop(): void {
		activeHandle?.kill();
		asking = false;
		activeHandle = null;
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			ask();
		}
	}

	onDestroy(() => activeHandle?.kill());
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
		{#if asking}
			<button on:click={stop}>Stop</button>
		{:else}
			<button on:click={ask} disabled={!question.trim()}>Ask</button>
		{/if}
	</div>

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
