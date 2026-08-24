export interface DigestCache {
	rangeStart: number;
	rangeEnd: number;
	generatedAt: number;
	text: string;
}

export interface DigestWidgetSettings {
	cache?: DigestCache;
}
