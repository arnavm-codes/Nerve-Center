import type { App, TFile } from 'obsidian';
import type { ResearchNote } from './types';

const RESEARCH_FOLDER_PREFIX = 'Research/';
const RESEARCH_TAG = 'research';

function hasResearchTag(app: App, file: TFile): boolean {
	const cache = app.metadataCache.getFileCache(file);
	const inlineTags = cache?.tags?.map((t) => t.tag.replace(/^#/, '').toLowerCase()) ?? [];

	const fmTagsRaw: unknown = cache?.frontmatter?.tags;
	const fmTags = Array.isArray(fmTagsRaw)
		? fmTagsRaw.map(String)
		: typeof fmTagsRaw === 'string'
			? [fmTagsRaw]
			: [];

	return [...inlineTags, ...fmTags.map((t) => t.toLowerCase())].includes(RESEARCH_TAG);
}

/** Notes living under a "Research/" folder or tagged #research, deduped and sorted by name. */
export function getResearchNotes(app: App): ResearchNote[] {
	const matches = app.vault
		.getMarkdownFiles()
		.filter((f) => f.path.startsWith(RESEARCH_FOLDER_PREFIX) || hasResearchTag(app, f));

	const unique = Array.from(new Map(matches.map((f) => [f.path, f])).values());
	unique.sort((a, b) => a.basename.localeCompare(b.basename));

	return unique.map((f) => ({ path: f.path, basename: f.basename }));
}
