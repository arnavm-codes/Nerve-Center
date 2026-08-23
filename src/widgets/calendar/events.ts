export interface CalendarEvent {
	id: string;
	summary: string;
	start: string;
	allDay: boolean;
}

interface GoogleEventItem {
	id: string;
	summary?: string;
	start?: { dateTime?: string; date?: string };
}

export async function fetchUpcomingEvents(accessToken: string, days: number): Promise<CalendarEvent[]> {
	const now = new Date();
	const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

	const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
	url.searchParams.set('timeMin', now.toISOString());
	url.searchParams.set('timeMax', timeMax.toISOString());
	url.searchParams.set('singleEvents', 'true');
	url.searchParams.set('orderBy', 'startTime');
	url.searchParams.set('maxResults', '20');

	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		throw new Error(`Calendar fetch failed: ${res.status} ${await res.text()}`);
	}
	const data = (await res.json()) as { items?: GoogleEventItem[] };
	return (data.items ?? []).map((item) => ({
		id: item.id,
		summary: item.summary ?? '(no title)',
		start: item.start?.dateTime ?? item.start?.date ?? '',
		allDay: !item.start?.dateTime,
	}));
}
