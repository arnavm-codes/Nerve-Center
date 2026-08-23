export interface NewsItem {
	title: string;
	source: string;
	date: string;
	url: string;
}

export interface ResearchSettings {
	cachedNews?: NewsItem[];
	/** YYYY-MM-DD (local) the news was last fetched - caps automatic fetches to once/day. */
	lastFetchedDate?: string;
}

export interface ResearchNote {
	path: string;
	basename: string;
}
