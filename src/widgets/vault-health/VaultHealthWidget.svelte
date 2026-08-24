<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { App, EventRef, TAbstractFile } from 'obsidian';
	import { computeVaultHealth, type VaultHealth } from './computeVaultHealth';
	import { dashboardData } from '../../settings/store';
	import type { VaultHealthWidgetSettings } from './types';

	const WIDGET_ID = 'vault-health';
	const DEBOUNCE_MS = 500;

	const app = getContext<App>('app');
	const eventRefs: EventRef[] = [];
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;

	let health: VaultHealth | null = null;
	let showOrphaned = false;
	let showStale = false;

	function compute(): void {
		const settings = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as VaultHealthWidgetSettings;
		health = computeVaultHealth(app, settings.staleDays);
	}

	export function refresh(): void {
		compute();
	}

	function onVaultChange(file: TAbstractFile): void {
		if (!file.path.endsWith('.md')) return;
		if (debounceHandle) clearTimeout(debounceHandle);
		debounceHandle = setTimeout(compute, DEBOUNCE_MS);
	}

	function openFile(path: string): void {
		const file = app.vault.getFileByPath(path);
		if (file) void app.workspace.getLeaf(false).openFile(file);
	}

	onMount(() => {
		compute();
		eventRefs.push(app.vault.on('modify', onVaultChange));
		eventRefs.push(app.vault.on('create', onVaultChange));
		eventRefs.push(app.vault.on('delete', onVaultChange));
	});

	onDestroy(() => {
		if (debounceHandle) clearTimeout(debounceHandle);
		for (const ref of eventRefs) app.vault.offref(ref);
	});
</script>

{#if !health}
	<div class="sbd-muted">Scanning vault…</div>
{:else}
	<ul class="sbd-stat-list">
		<li><span class="sbd-stat-label">Total notes</span><span class="sbd-stat-value">{health.totalNotes}</span></li>
		<li><span class="sbd-stat-label">Created this wk</span><span class="sbd-stat-value">{health.createdThisWeek}</span></li>
		<li><span class="sbd-stat-label">Modified this wk</span><span class="sbd-stat-value">{health.modifiedThisWeek}</span></li>
		<li>
			<button class="sbd-stat-toggle" on:click={() => (showOrphaned = !showOrphaned)}>
				<span class="sbd-stat-label">Orphaned</span><span class="sbd-stat-value">{health.orphaned.length}</span>
			</button>
		</li>
		{#if showOrphaned && health.orphaned.length > 0}
			<ul class="sbd-health-detail-list">
				{#each health.orphaned as path (path)}
					<li><button class="sbd-task-link" on:click={() => openFile(path)}>{path}</button></li>
				{/each}
			</ul>
		{/if}
		<li>
			<button class="sbd-stat-toggle" on:click={() => (showStale = !showStale)}>
				<span class="sbd-stat-label">Stale</span><span class="sbd-stat-value">{health.stale.length}</span>
			</button>
		</li>
		{#if showStale && health.stale.length > 0}
			<ul class="sbd-health-detail-list">
				{#each health.stale as path (path)}
					<li><button class="sbd-task-link" on:click={() => openFile(path)}>{path}</button></li>
				{/each}
			</ul>
		{/if}
	</ul>
	{#if health.topTags.length > 0}
		<div class="sbd-muted sbd-health-tags">
			{health.topTags.map((t) => `${t.tag} (${t.count})`).join(' · ')}
		</div>
	{/if}
{/if}
