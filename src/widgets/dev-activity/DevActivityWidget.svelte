<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { dashboardData } from '../../settings/store';
	import { fetchRepoActivity } from './github';
	import type { DevActivityWidgetSettings, RepoActivity } from './types';

	const WIDGET_ID = 'dev-activity';
	// No local event source for repo activity (an external service), so poll
	// on a timer like the Claude Usage widget rather than an event-driven
	// approach - kept well above GitHub's unauthenticated 60/hr rate limit.
	const POLL_INTERVAL_MS = 20 * 60_000;

	let activity: RepoActivity[] = [];
	let loading = true;
	let lastSyncMs: number | null = null;
	let pollHandle: ReturnType<typeof setInterval> | null = null;

	async function load(): Promise<void> {
		const settings = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as DevActivityWidgetSettings;
		const repos = settings.repos ?? [];
		if (repos.length === 0) {
			activity = [];
			loading = false;
			return;
		}
		loading = true;
		activity = await Promise.all(repos.map((r) => fetchRepoActivity(r, settings.token)));
		lastSyncMs = Date.now();
		loading = false;
	}

	export function refresh(): void {
		void load();
	}

	onMount(() => {
		void load();
		pollHandle = setInterval(() => void load(), POLL_INTERVAL_MS);
	});

	onDestroy(() => {
		if (pollHandle) clearInterval(pollHandle);
	});

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

{#if loading && activity.length === 0}
	<div class="sbd-muted">Loading…</div>
{:else if activity.length === 0}
	<div class="sbd-muted">No repos configured — add some in settings.</div>
{:else}
	<ul class="sbd-dev-list">
		{#each activity as repo (repo.owner + '/' + repo.repo)}
			<li>
				<span class="sbd-dev-repo">{repo.owner}/{repo.repo}</span>
				{#if repo.error}
					<span class="sbd-error">couldn't reach GitHub</span>
				{:else}
					<span class="sbd-dev-commit" title={repo.lastCommitMessage ?? ''}>
						{repo.lastCommitMessage ? `"${repo.lastCommitMessage}"` : 'no commits'} ({formatAgo(repo.lastCommitMs)})
					</span>
					<span class="sbd-dev-counts">{repo.openIssues} issues, {repo.openPRs} PRs</span>
				{/if}
			</li>
		{/each}
	</ul>
	<div class="sbd-muted sbd-dev-synced">last synced {formatAgo(lastSyncMs)}</div>
{/if}
