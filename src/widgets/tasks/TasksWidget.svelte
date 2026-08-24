<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { App, EventRef, TAbstractFile } from 'obsidian';
	import { scanTasks, type TaskItem } from './scanTasks';

	const app = getContext<App>('app');
	const DEBOUNCE_MS = 500;

	let tasks: TaskItem[] = [];
	let loading = true;
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	const eventRefs: EventRef[] = [];

	async function load(): Promise<void> {
		loading = true;
		tasks = await scanTasks(app);
		loading = false;
	}

	export function refresh(): void {
		void load();
	}

	function openTask(task: TaskItem): void {
		const file = app.vault.getFileByPath(task.path);
		if (!file) return;
		void app.workspace.getLeaf(false).openFile(file, { eState: { line: task.line } });
	}

	function onVaultChange(file: TAbstractFile): void {
		if (!file.path.endsWith('.md')) return;
		if (debounceHandle) clearTimeout(debounceHandle);
		debounceHandle = setTimeout(() => void load(), DEBOUNCE_MS);
	}

	onMount(() => {
		void load();
		// Refresh reactively on vault changes instead of polling - a task
		// checkbox toggle should show up right away, not after a fixed delay.
		eventRefs.push(app.vault.on('modify', onVaultChange));
		eventRefs.push(app.vault.on('create', onVaultChange));
		eventRefs.push(app.vault.on('delete', onVaultChange));
	});

	onDestroy(() => {
		if (debounceHandle) clearTimeout(debounceHandle);
		for (const ref of eventRefs) app.vault.offref(ref);
	});

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
				<button class="sbd-task-link" on:click={() => openTask(task)} title="Open in {task.file}">
					<span class="sbd-task-text">{task.text}</span>
					<span class="sbd-task-file">{task.file}</span>
				</button>
			</li>
		{/each}
	</ol>
	<div class="sbd-muted sbd-task-summary">{openTasks.length} open · {doneCount} done</div>
{/if}
