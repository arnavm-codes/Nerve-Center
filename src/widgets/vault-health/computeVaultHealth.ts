import type { App, TFile } from 'obsidian';

export interface VaultHealth {
	totalNotes: number;
	createdThisWeek: number;
	modifiedThisWeek: number;
	orphaned: string[];
	stale: string[];
	topTags: Array<{ tag: string; count: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STALE_DAYS = 30;
const TOP_TAGS_LIMIT = 5;

export function computeVaultHealth(app: App, staleDays: number = DEFAULT_STALE_DAYS): VaultHealth {
	const files = app.vault.getMarkdownFiles();
	const now = Date.now();
	const weekAgo = now - 7 * DAY_MS;
	const staleThreshold = now - staleDays * DAY_MS;

	let createdThisWeek = 0;
	let modifiedThisWeek = 0;
	const stale: string[] = [];

	// resolvedLinks maps sourcePath -> { targetPath: count } for outgoing links.
	// Build the reverse (incoming) map once so orphan detection is O(files),
	// not O(files^2) - Obsidian doesn't ship an incoming-links index directly.
	const resolvedLinks = app.metadataCache.resolvedLinks;
	const hasIncoming = new Set<string>();
	for (const source of Object.keys(resolvedLinks)) {
		for (const target of Object.keys(resolvedLinks[source] ?? {})) {
			hasIncoming.add(target);
		}
	}

	const orphaned: string[] = [];
	const tagCounts = new Map<string, number>();

	for (const file of files) {
		if (file.stat.ctime >= weekAgo) createdThisWeek++;
		if (file.stat.mtime >= weekAgo) modifiedThisWeek++;
		if (file.stat.mtime < staleThreshold) stale.push(file.path);

		const outgoing = resolvedLinks[file.path] ?? {};
		const hasOutgoing = Object.keys(outgoing).length > 0;
		if (!hasOutgoing && !hasIncoming.has(file.path)) orphaned.push(file.path);

		const tags = app.metadataCache.getFileCache(file)?.tags ?? [];
		for (const t of tags) {
			tagCounts.set(t.tag, (tagCounts.get(t.tag) ?? 0) + 1);
		}
	}

	const topTags = [...tagCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, TOP_TAGS_LIMIT)
		.map(([tag, count]) => ({ tag, count }));

	return { totalNotes: files.length, createdThisWeek, modifiedThisWeek, orphaned, stale, topTags };
}

export function fileByPath(app: App, path: string): TFile | null {
	const file = app.vault.getFileByPath(path);
	return file ?? null;
}
