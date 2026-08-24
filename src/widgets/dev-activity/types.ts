export interface RepoConfig {
	owner: string;
	repo: string;
}

export interface DevActivityWidgetSettings {
	token?: string;
	repos?: RepoConfig[];
}

export interface RepoActivity {
	owner: string;
	repo: string;
	lastCommitMessage: string | null;
	lastCommitMs: number | null;
	openIssues: number;
	openPRs: number;
	error?: string;
}
