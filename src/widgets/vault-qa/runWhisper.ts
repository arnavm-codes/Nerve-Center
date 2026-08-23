import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Common locations for a manually-built or package-manager-installed
// whisper.cpp binary. Same "GUI apps often have a stripped PATH" reasoning
// as runClaude.ts's resolveClaudeBinary().
const BINARY_FALLBACKS = [
	path.join(os.homedir(), '.local', 'share', 'whisper.cpp', 'build', 'bin', 'whisper-cli'),
	path.join(os.homedir(), '.local', 'share', 'whisper.cpp', 'main'),
	'/usr/local/bin/whisper-cli',
	'/usr/local/bin/whisper-cpp',
	'/usr/bin/whisper-cli',
	'/opt/homebrew/bin/whisper-cli',
];

const MODEL_FALLBACKS = [
	path.join(os.homedir(), '.local', 'share', 'whisper.cpp', 'models', 'ggml-base.en.bin'),
];

export function resolveWhisperBinary(configured?: string): string | null {
	if (configured && fs.existsSync(configured)) return configured;
	for (const candidate of BINARY_FALLBACKS) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

export function resolveWhisperModel(configured?: string): string | null {
	if (configured && fs.existsSync(configured)) return configured;
	for (const candidate of MODEL_FALLBACKS) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

/** Transcribes a 16kHz mono WAV file with a local whisper.cpp binary. Runs once and exits - no background service. */
export function transcribeWav(wavPath: string, binaryPath: string, modelPath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(binaryPath, ['-m', modelPath, '-f', wavPath, '-nt', '-l', 'en'], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';
		proc.stdout?.on('data', (data: Buffer) => {
			stdout += data.toString('utf8');
		});
		proc.stderr?.on('data', (data: Buffer) => {
			stderr += data.toString('utf8');
		});
		proc.on('error', (err) => {
			const message =
				(err as NodeJS.ErrnoException).code === 'ENOENT'
					? `Could not find the whisper.cpp binary at "${binaryPath}".`
					: err.message;
			reject(new Error(message));
		});
		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(stderr.trim() || `whisper.cpp exited with code ${code}`));
				return;
			}
			resolve(stdout.trim());
		});
	});
}
