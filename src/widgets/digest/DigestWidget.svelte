<script lang="ts">
	import { getContext } from 'svelte';
	import { get } from 'svelte/store';
	import { FileSystemAdapter, type App } from 'obsidian';
	import { gatherDigestContext } from './gatherDigestContext';
	import { runDigest } from './runDigest';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import type { DigestWidgetSettings } from './types';

	const WIDGET_ID = 'digest';
	const app = getContext<App>('app');

	let generating = false;
	let errorMsg = '';

	$: cache = (($dashboardData.widgets[WIDGET_ID]?.settings ?? {}) as DigestWidgetSettings).cache;

	function vaultPath(): string | null {
		return app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : null;
	}

	async function generate(): Promise<void> {
		const base = vaultPath();
		if (!base) {
			errorMsg = 'Weekly Digest requires desktop Obsidian (needs local filesystem access).';
			return;
		}
		errorMsg = '';
		generating = true;
		try {
			const ctx = await gatherDigestContext(app);
			const text = await runDigest(ctx.text, base);
			updateWidgetSettings(WIDGET_ID, (s) => ({
				...s,
				cache: { rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, generatedAt: Date.now(), text },
			}));
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			generating = false;
		}
	}

	// Deliberately no refresh() export: digest generation spends Claude tokens,
	// so it must only fire from its own dedicated button, never swept up by
	// the dashboard's global "refresh all" (same reasoning as Vault Q&A).
	function formatDate(ms: number): string {
		return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function formatAgo(ms: number): string {
		const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60000));
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.round(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return `${Math.round(diffHr / 24)}d ago`;
	}
</script>

<div class="sbd-digest">
	{#if generating}
		<div class="sbd-muted">Generating this week's digest…</div>
	{:else if errorMsg}
		<div class="sbd-error">{errorMsg}</div>
	{:else if cache}
		<div class="sbd-digest-text">{cache.text}</div>
		<div class="sbd-muted sbd-digest-meta">
			{formatDate(cache.rangeStart)} – {formatDate(cache.rangeEnd)} · generated {formatAgo(cache.generatedAt)}
		</div>
	{:else}
		<div class="sbd-muted">Click to see your weekly digest.</div>
	{/if}

	<button on:click={generate} disabled={generating}>
		{generating ? 'Generating…' : cache ? 'Regenerate' : 'Generate digest'}
	</button>
</div>
