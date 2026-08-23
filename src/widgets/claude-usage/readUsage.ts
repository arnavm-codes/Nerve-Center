import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface UsageStats {
	sessionsToday: number;
	tokensToday: number;
	tokensThisWeek: number;
	lastSessionMs: number | null;
}

interface LogEntry {
	type?: string;
	timestamp?: string;
	sessionId?: string;
	message?: {
		id?: string;
		usage?: {
			input_tokens?: number;
			output_tokens?: number;
			cache_creation_input_tokens?: number;
			cache_read_input_tokens?: number;
		};
	};
}

function listSessionFiles(projectsDir: string): string[] {
	let projectDirs: string[];
	try {
		projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
	} catch {
		return [];
	}
	const files: string[] = [];
	for (const dir of projectDirs) {
		const full = path.join(projectsDir, dir);
		let entries: string[];
		try {
			entries = fs.readdirSync(full);
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (entry.endsWith('.jsonl')) files.push(path.join(full, entry));
		}
	}
	return files;
}

export function readUsageStats(): UsageStats {
	const projectsDir = path.join(os.homedir(), '.claude', 'projects');
	const files = listSessionFiles(projectsDir);

	const now = Date.now();
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);
	const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

	const sessionsToday = new Set<string>();
	// Claude Code logs one JSONL line per content block (thinking, text,
	// tool_use, ...) within a single assistant turn, and repeats that turn's
	// full `usage` totals on every one of those lines - so summing per line
	// overcounts by however many content blocks each message had. Dedupe by
	// message id to count each turn's usage exactly once.
	const countedMessageIds = new Set<string>();
	let tokensToday = 0;
	let tokensThisWeek = 0;
	let lastSessionMs: number | null = null;

	for (const file of files) {
		let content: string;
		try {
			content = fs.readFileSync(file, 'utf8');
		} catch {
			continue;
		}
		for (const line of content.split('\n')) {
			if (!line.trim()) continue;
			let entry: LogEntry;
			try {
				entry = JSON.parse(line);
			} catch {
				continue;
			}
			if (!entry.timestamp) continue;
			const ts = Date.parse(entry.timestamp);
			if (Number.isNaN(ts)) continue;

			if (lastSessionMs === null || ts > lastSessionMs) lastSessionMs = ts;
			if (ts >= startOfToday.getTime() && entry.sessionId) sessionsToday.add(entry.sessionId);

			const usage = entry.message?.usage;
			const messageId = entry.message?.id;
			if (usage && ts >= weekAgo) {
				if (messageId) {
					if (countedMessageIds.has(messageId)) continue;
					countedMessageIds.add(messageId);
				}
				// Excludes cache_read_input_tokens: Claude Code re-reads the full
				// conversation context from cache on every turn, so including it
				// makes this "new tokens this turn" figure balloon into the tens
				// of millions and stops being a useful at-a-glance number.
				const total =
					(usage.input_tokens ?? 0) +
					(usage.output_tokens ?? 0) +
					(usage.cache_creation_input_tokens ?? 0);
				tokensThisWeek += total;
				if (ts >= startOfToday.getTime()) tokensToday += total;
			}
		}
	}

	return { sessionsToday: sessionsToday.size, tokensToday, tokensThisWeek, lastSessionMs };
}
