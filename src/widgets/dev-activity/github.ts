import { requestUrl } from 'obsidian';
import type { RepoActivity, RepoConfig } from './types';

const API_BASE = 'https://api.github.com';

interface CommitResponse {
	commit?: { message?: string; author?: { date?: string } };
}

/** GitHub's issues endpoint returns PRs too (as issues with a `pull_request` key), so issues/PRs are counted with two explicit calls instead of one filtered pass - simpler than remembering to exclude PR entries every time this is touched. */
async function countOpen(owner: string, repo: string, kind: 'issues' | 'pulls', headers: Record<string, string>): Promise<number> {
	const res = await requestUrl({
		url: `${API_BASE}/repos/${owner}/${repo}/${kind}?state=open&per_page=1`,
		headers,
		throw: false,
	});
	if (res.status >= 400) throw new Error(`GitHub ${kind} fetch failed: ${res.status}`);
	// per_page=1 keeps the payload small; total count comes from the Link
	// header's "last" page rather than fetching every page of results.
	const link = res.headers['link'] ?? res.headers['Link'];
	if (link) {
		const match = /page=(\d+)>; rel="last"/.exec(link);
		if (match) return parseInt(match[1]!, 10);
	}
	return (res.json as unknown[]).length;
}

export async function fetchRepoActivity(config: RepoConfig, token?: string): Promise<RepoActivity> {
	const { owner, repo } = config;
	const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
	if (token) headers.Authorization = `token ${token}`;

	try {
		const [commitsRes, openIssues, openPRs] = await Promise.all([
			requestUrl({ url: `${API_BASE}/repos/${owner}/${repo}/commits?per_page=1`, headers, throw: false }),
			countOpen(owner, repo, 'issues', headers),
			countOpen(owner, repo, 'pulls', headers),
		]);

		if (commitsRes.status >= 400) {
			throw new Error(`GitHub commits fetch failed: ${commitsRes.status}`);
		}
		const commits = commitsRes.json as CommitResponse[];
		const latest = commits[0]?.commit;
		const message = latest?.message?.split('\n')[0] ?? null;
		const dateStr = latest?.author?.date;
		const lastCommitMs = dateStr ? Date.parse(dateStr) : null;

		return { owner, repo, lastCommitMessage: message, lastCommitMs, openIssues, openPRs };
	} catch (err) {
		return {
			owner,
			repo,
			lastCommitMessage: null,
			lastCommitMs: null,
			openIssues: 0,
			openPRs: 0,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
