<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { readUsageStats } from '../widgets/claude-usage/readUsage';

	// Self-set daily budget, not Anthropic's actual plan limit (that isn't
	// available locally - see the Claude Usage widget). Purely a personal
	// reference point to visualize burn against, matching the "TOKEN BURN"
	// strip from the command-center reference screenshot.
	const DAILY_TOKEN_BUDGET = 5_000_000;
	const POLL_INTERVAL_MS = 60_000;

	let tokensToday = 0;
	let lastPullMs = Date.now();
	let pollHandle: ReturnType<typeof setInterval> | null = null;

	function load(): void {
		try {
			tokensToday = readUsageStats().tokensToday;
			lastPullMs = Date.now();
		} catch {
			// Leave the last known value on screen rather than blanking the bar.
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

	function formatCompact(n: number): string {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
		return `${n}`;
	}

	function formatAgo(ms: number): string {
		const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60000));
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		return `${Math.round(diffMin / 60)}h ago`;
	}

	$: percent = Math.min(100, (tokensToday / DAILY_TOKEN_BUDGET) * 100);
</script>

<div class="sbd-burn">
	<div class="sbd-burn-header">
		<span class="sbd-burn-title">$ TOKEN BURN · DAILY WINDOW · <span class="sbd-burn-live">LIVE</span></span>
		<span class="sbd-burn-pull">last pull {formatAgo(lastPullMs)}</span>
	</div>
	<div class="sbd-burn-row">
		<span class="sbd-burn-percent">{percent.toFixed(0)}%</span>
		<div class="sbd-burn-track">
			<div class="sbd-burn-fill" style="width: {percent}%"></div>
		</div>
		<span class="sbd-burn-total">{formatCompact(tokensToday)} / {formatCompact(DAILY_TOKEN_BUDGET)}</span>
	</div>
</div>
