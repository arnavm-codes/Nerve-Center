<script lang="ts">
	import { get } from 'svelte/store';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import type { DevActivityWidgetSettings, RepoConfig } from './types';

	const WIDGET_ID = 'dev-activity';

	const initial = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as DevActivityWidgetSettings;
	let token = initial.token ?? '';
	let repos: RepoConfig[] = initial.repos ? [...initial.repos] : [];
	let newOwner = '';
	let newRepo = '';

	function save(): void {
		updateWidgetSettings(WIDGET_ID, (s) => ({ ...s, token, repos }));
	}

	function addRepo(): void {
		const owner = newOwner.trim();
		const repo = newRepo.trim();
		if (!owner || !repo) return;
		repos = [...repos, { owner, repo }];
		newOwner = '';
		newRepo = '';
		save();
	}

	function removeRepo(index: number): void {
		repos = repos.filter((_, i) => i !== index);
		save();
	}
</script>

<div class="sbd-settings-form">
	<label>
		GitHub personal access token (optional)
		<input type="password" bind:value={token} on:change={save} placeholder="ghp_…" />
	</label>
	<p class="sbd-muted sbd-settings-help">
		Without a token, GitHub allows 60 requests/hr per IP; with one, 5000/hr. A token needs no
		special scopes for public repos.
	</p>

	<div class="sbd-repo-list">
		{#each repos as r, i (r.owner + '/' + r.repo)}
			<div class="sbd-repo-row">
				<span>{r.owner}/{r.repo}</span>
				<button on:click={() => removeRepo(i)}>Remove</button>
			</div>
		{/each}
	</div>

	<div class="sbd-repo-add-row">
		<input type="text" bind:value={newOwner} placeholder="owner" />
		<input type="text" bind:value={newRepo} placeholder="repo" />
		<button on:click={addRepo} disabled={!newOwner.trim() || !newRepo.trim()}>Add</button>
	</div>
</div>
