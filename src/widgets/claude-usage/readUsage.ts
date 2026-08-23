import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface UsageStats {
	sessionsToday: number;
	tokensThisWeek: number;
	lastSessionMs: number | null;
}

interface LogEntry {
	type?: string;
	timestamp?: string;
	sessionId?: string;
	message?: {
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
			if (usage && ts >= weekAgo) {
				tokensThisWeek +=
					(usage.input_tokens ?? 0) +
					(usage.output_tokens ?? 0) +
					(usage.cache_creation_input_tokens ?? 0) +
					(usage.cache_read_input_tokens ?? 0);
			}
		}
	}

	return { sessionsToday: sessionsToday.size, tokensThisWeek, lastSessionMs };
}
