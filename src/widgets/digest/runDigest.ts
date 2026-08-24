import { askVault } from '../vault-qa/runClaude';

const DIGEST_PROMPT_PREFIX =
	'You are summarizing one Obsidian vault user\'s week for a dashboard "Weekly Digest" card. Using ' +
	'only the context provided below (do not search the vault further), write a short digest in 3-5 ' +
	'sentences: what got done this week, what is still open, and anything notable (flagged decisions, ' +
	'upcoming calendar events). Plain prose, no headings or bullet lists, no preamble like "Here is a summary".\n\n';

/** Runs one non-streaming `claude -p` call over pre-gathered digest context and resolves with the full text - digest generation happens in the background on a button click, not typed live like Vault Q&A. */
export function runDigest(contextText: string, vaultPath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const handle = askVault(DIGEST_PROMPT_PREFIX + contextText, vaultPath);
		let text = '';
		let errorMsg = '';
		handle.onChunk((chunk) => {
			text += chunk;
		});
		handle.onError((message) => {
			errorMsg = errorMsg ? `${errorMsg}\n${message}` : message;
		});
		handle.onClose((code) => {
			if (code !== 0 && !text.trim()) {
				reject(new Error(errorMsg || `claude exited with code ${code}`));
				return;
			}
			resolve(text.trim());
		});
	});
}
