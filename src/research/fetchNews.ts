import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveClaudeBinary } from '../widgets/vault-qa/runClaude';
import type { NewsItem } from './types';

// uvx (from the `uv` Python toolchain) runs the duckduckgo-mcp-server package
// on demand with no persistent install. Same "GUI apps can have a stripped
// PATH" reasoning as resolveClaudeBinary().
const UVX_FALLBACKS = [
	path.join(os.homedir(), '.local', 'bin', 'uvx'),
	path.join(os.homedir(), '.cargo', 'bin', 'uvx'),
	'/usr/local/bin/uvx',
	'/opt/homebrew/bin/uvx',
];

function resolveUvxBinary(): string {
	for (const candidate of UVX_FALLBACKS) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return 'uvx';
}

const FETCH_TIMEOUT_MS = 150_000; // cold uvx install + a live web search can take a while
const NEWS_PROMPT =
	'Use the duckduckgo search tool to find 6 recent, notable AI/ML news headlines or ' +
	'trends from the last few days. Respond with ONLY a JSON array (no prose, no markdown ' +
	'fences) of objects shaped exactly as: {"title": string, "source": string, ' +
	'"date": string (YYYY-MM-DD if known, else ""), "url": string}. Nothing else in your response.';

function parseNewsJson(raw: string): NewsItem[] {
	const start = raw.indexOf('[');
	const end = raw.lastIndexOf(']');
	if (start === -1 || end === -1) throw new Error('No JSON array found in response.');
	const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
	if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array.');
	return parsed.map((item) => ({
		title: String((item as Partial<NewsItem>).title ?? ''),
		source: String((item as Partial<NewsItem>).source ?? ''),
		date: String((item as Partial<NewsItem>).date ?? ''),
		url: String((item as Partial<NewsItem>).url ?? ''),
	}));
}

/** Runs a single claude -p call restricted to the DuckDuckGo MCP search tool. One process, one exit - no background service. */
export async function fetchAiNews(): Promise<NewsItem[]> {
	const mcpConfigPath = path.join(os.tmpdir(), `secondbrain-dashboard-mcp-${Date.now()}.json`);
	const mcpConfig = {
		mcpServers: {
			duckduckgo: {
				command: resolveUvxBinary(),
				args: ['duckduckgo-mcp-server'],
			},
		},
	};
	fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig));

	try {
		const raw = await new Promise<string>((resolve, reject) => {
			const proc = spawn(
				resolveClaudeBinary(),
				[
					'-p',
					NEWS_PROMPT,
					'--mcp-config',
					mcpConfigPath,
					'--strict-mcp-config',
					'--allowedTools',
					'mcp__duckduckgo__search',
				],
				{ stdio: ['ignore', 'pipe', 'pipe'] },
			);

			let stdout = '';
			let stderr = '';
			const timeout = setTimeout(() => {
				proc.kill();
				reject(new Error('Timed out waiting for the news search.'));
			}, FETCH_TIMEOUT_MS);

			proc.stdout.on('data', (data: Buffer) => {
				stdout += data.toString('utf8');
			});
			proc.stderr.on('data', (data: Buffer) => {
				stderr += data.toString('utf8');
			});
			proc.on('error', (err) => {
				clearTimeout(timeout);
				const message =
					(err as NodeJS.ErrnoException).code === 'ENOENT'
						? 'Could not find the `claude` CLI. Make sure Claude Code is installed and on your PATH.'
						: err.message;
				reject(new Error(message));
			});
			proc.on('close', (code) => {
				clearTimeout(timeout);
				if (code !== 0) {
					reject(new Error(stderr.trim() || `claude exited with code ${code}`));
					return;
				}
				resolve(stdout.trim());
			});
		});

		return parseNewsJson(raw);
	} finally {
		try {
			fs.unlinkSync(mcpConfigPath);
		} catch {
			// best-effort cleanup, not worth surfacing to the user
		}
	}
}
