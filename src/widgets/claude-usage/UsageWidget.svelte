<script lang="ts">
	import { onMount } from 'svelte';
	import { readUsageStats, type UsageStats } from './readUsage';

	let stats: UsageStats | null = null;
	let error = false;

	function load(): void {
		try {
			stats = readUsageStats();
			error = false;
		} catch {
			error = true;
		}
	}

	export function refresh(): void {
		load();
	}

	onMount(load);

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
		<li><span class="sbd-stat-label">Tokens this wk</span><span class="sbd-stat-value">{formatTokens(stats.tokensThisWeek)}</span></li>
		<li><span class="sbd-stat-label">Last session</span><span class="sbd-stat-value">{formatAgo(stats.lastSessionMs)}</span></li>
	</ul>
{/if}
