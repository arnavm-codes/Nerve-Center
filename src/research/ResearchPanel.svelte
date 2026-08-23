<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { App } from 'obsidian';
	import { dashboardData, updateWidgetSettings } from '../settings/store';
	import { getResearchNotes } from './researchNotes';
	import { fetchAiNews } from './fetchNews';
	import type { NewsItem, ResearchNote, ResearchSettings } from './types';

	const RESEARCH_ID = 'research-news';
	const app = getContext<App>('app');

	let notes: ResearchNote[] = [];
	let news: NewsItem[] = [];
	let newsLoading = false;
	let newsError = '';

	function todayLocal(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	async function loadNews(force: boolean): Promise<void> {
		const settings = (get(dashboardData).widgets[RESEARCH_ID]?.settings ?? {}) as ResearchSettings;
		const today = todayLocal();

		if (!force && settings.lastFetchedDate === today && settings.cachedNews) {
			news = settings.cachedNews;
			return;
		}

		newsLoading = true;
		newsError = '';
		try {
			const fresh = await fetchAiNews();
			news = fresh;
			updateWidgetSettings(RESEARCH_ID, (s) => ({ ...s, cachedNews: fresh, lastFetchedDate: today }));
		} catch (err) {
			newsError = err instanceof Error ? err.message : String(err);
			// Fall back to whatever was cached, even if stale, rather than showing nothing.
			if (settings.cachedNews) news = settings.cachedNews;
		} finally {
			newsLoading = false;
		}
	}

	function openNote(note: ResearchNote): void {
		void app.workspace.openLinkText(note.path, '', false);
	}

	onMount(() => {
		notes = getResearchNotes(app);
		void loadNews(false); // auto-fetch caps at once/day; cached results are free
	});
</script>

<div class="sbd-research">
	<div class="sbd-research-section">
		<div class="sbd-research-section-header">
			<span class="sbd-research-section-title">AI/ML News</span>
			<button class="sbd-icon-btn" on:click={() => loadNews(true)} disabled={newsLoading} title="Refresh now (uses Claude/DuckDuckGo)">
				↻
			</button>
		</div>
		{#if newsLoading}
			<div class="sbd-muted">Searching…</div>
		{:else if newsError}
			<div class="sbd-error">{newsError}</div>
		{:else if news.length === 0}
			<div class="sbd-muted">No news fetched yet.</div>
		{:else}
			<ol class="sbd-news-list">
				{#each news as item, i (item.url + i)}
					<li>
						<span class="sbd-row-index">{i + 1}</span>
						<a href={item.url} target="_blank" rel="noopener" class="sbd-news-title">{item.title}</a>
						<span class="sbd-news-meta">{item.source}{item.date ? ` · ${item.date}` : ''}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<div class="sbd-research-section">
		<div class="sbd-research-section-header">
			<span class="sbd-research-section-title">Research Notes</span>
		</div>
		{#if notes.length === 0}
			<div class="sbd-muted">No notes in a "Research/" folder or tagged #research yet.</div>
		{:else}
			<div class="sbd-note-buttons">
				{#each notes as note (note.path)}
					<button class="sbd-note-btn" on:click={() => openNote(note)}>{note.basename}</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
