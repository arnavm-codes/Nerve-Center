<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { App } from 'obsidian';
	import { scanTasks, type TaskItem } from './scanTasks';

	const app = getContext<App>('app');

	let tasks: TaskItem[] = [];
	let loading = true;

	async function load(): Promise<void> {
		loading = true;
		tasks = await scanTasks(app);
		loading = false;
	}

	export function refresh(): void {
		void load();
	}

	onMount(() => void load());

	$: openTasks = tasks.filter((t) => !t.checked);
	$: doneCount = tasks.length - openTasks.length;
</script>

{#if loading}
	<div class="sbd-muted">Scanning vault…</div>
{:else if tasks.length === 0}
	<div class="sbd-muted">No tasks found.</div>
{:else if openTasks.length === 0}
	<div class="sbd-muted">All tasks done ({doneCount}).</div>
{:else}
	<ol class="sbd-task-list">
		{#each openTasks.slice(0, 20) as task, i (task.file + task.text + i)}
			<li>
				<span class="sbd-row-index">{i + 1}</span>
				<span class="sbd-checkbox">☐</span>
				<span class="sbd-task-text">{task.text}</span>
				<span class="sbd-task-file">{task.file}</span>
			</li>
		{/each}
	</ol>
	<div class="sbd-muted sbd-task-summary">{openTasks.length} open · {doneCount} done</div>
{/if}
