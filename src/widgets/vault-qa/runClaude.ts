import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// GUI-launched apps (desktop launcher / dock, not a terminal) often inherit a
// stripped-down PATH that misses where the `claude` CLI actually lives (e.g.
// npm global bin, ~/.local/bin, a curl-installer location) - a bare
// spawn('claude', ...) can ENOENT even though the CLI is installed and on
// PATH in a normal shell. Fall back to common install locations if the bare
// command isn't found.
const FALLBACK_LOCATIONS = [
	path.join(os.homedir(), '.local', 'bin', 'claude'),
	path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
	'/usr/local/bin/claude',
	'/usr/bin/claude',
	'/opt/homebrew/bin/claude',
];

function resolveClaudeBinary(): string {
	for (const candidate of FALLBACK_LOCATIONS) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return 'claude';
}

export interface RunClaudeHandle {
	onChunk(cb: (chunk: string) => void): void;
	onError(cb: (message: string) => void): void;
	onClose(cb: (code: number | null) => void): void;
	kill(): void;
}

export function askVault(question: string, vaultPath: string): RunClaudeHandle {
	let proc: ChildProcessWithoutNullStreams;
	try {
		proc = spawn(resolveClaudeBinary(), ['-p', question, '--add-dir', vaultPath], {
			cwd: vaultPath,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			onChunk: () => {},
			onError: (cb) => cb(message),
			onClose: () => {},
			kill: () => {},
		};
	}

	const chunkListeners: Array<(chunk: string) => void> = [];
	const errorListeners: Array<(message: string) => void> = [];
	const closeListeners: Array<(code: number | null) => void> = [];

	proc.stdout.on('data', (data: Buffer) => {
		for (const cb of chunkListeners) cb(data.toString('utf8'));
	});
	proc.stderr.on('data', (data: Buffer) => {
		for (const cb of errorListeners) cb(data.toString('utf8'));
	});
	proc.on('error', (err) => {
		const message =
			(err as NodeJS.ErrnoException).code === 'ENOENT'
				? 'Could not find the `claude` CLI. Make sure Claude Code is installed and on your PATH.'
				: err.message;
		for (const cb of errorListeners) cb(message);
	});
	proc.on('close', (code) => {
		for (const cb of closeListeners) cb(code);
	});

	return {
		onChunk: (cb) => chunkListeners.push(cb),
		onError: (cb) => errorListeners.push(cb),
		onClose: (cb) => closeListeners.push(cb),
		kill: () => proc.kill(),
	};
}
