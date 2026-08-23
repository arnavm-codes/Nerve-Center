<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import { FileSystemAdapter, type App } from 'obsidian';
	import { readUsageStats, type UsageStats } from './readUsage';

	// No local event source for ~/.claude log changes (an external process
	// writes them), so poll on a timer rather than the event-driven approach
	// the Tasks widget uses for in-vault changes.
	const POLL_INTERVAL_MS = 60_000;

	const app = getContext<App>('app');
	const vaultPath = app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : null;

	let stats: UsageStats | null = null;
	let vaultQaStats: UsageStats | null = null;
	let error = false;
	let pollHandle: ReturnType<typeof setInterval> | null = null;

	function load(): void {
		try {
			stats = readUsageStats();
			vaultQaStats = vaultPath ? readUsageStats(vaultPath) : null;
			error = false;
		} catch {
			error = true;
		}
	}

	export function refresh(): void {
		load();
	}

	onMount(() => {
		load();
		pollHandle = setInterval(load, POLL_INTERVAL_MS);
	});

	onDestroy(() => {
		if (pollHandle) clearInterval(pollHandle);
	});

	function formatTokens(n: number): string {
		if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}m`;
		if (n >= 1_000) return `~${(n / 1_000).toFixed(1)}k`;
		return `${n}`;
	}

	function formatAgo(ms: number | null): string {
		if (ms === null) return '—';
		const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60000));
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.round(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return `${Math.round(diffHr / 24)}d ago`;
	}
</script>

{#if error}
	<div class="sbd-muted">Couldn't read ~/.claude session logs.</div>
{:else if !stats}
	<div class="sbd-muted">Loading…</div>
{:else}
	<ul class="sbd-stat-list">
		<li><span class="sbd-stat-label">Sessions today</span><span class="sbd-stat-value">{stats.sessionsToday}</span></li>
		<li><span class="sbd-stat-label">Tokens today</span><span class="sbd-stat-value">{formatTokens(stats.tokensToday)}</span></li>
		<li><span class="sbd-stat-label">Tokens this wk</span><span class="sbd-stat-value">{formatTokens(stats.tokensThisWeek)}</span></li>
		<li><span class="sbd-stat-label">Last session</span><span class="sbd-stat-value">{formatAgo(stats.lastSessionMs)}</span></li>
		{#if vaultQaStats}
			<li><span class="sbd-stat-label">Vault Q&A tokens today</span><span class="sbd-stat-value">{formatTokens(vaultQaStats.tokensToday)}</span></li>
		{/if}
	</ul>
{/if}
