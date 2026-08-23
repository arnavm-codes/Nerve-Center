import { get } from 'svelte/store';
import type { App } from 'obsidian';
import { dashboardData, updateWidgetSettings } from '../../settings/store';
import { scanTasks } from '../tasks/scanTasks';
import { refreshAccessToken } from '../calendar/oauth';
import { fetchUpcomingEvents } from '../calendar/events';
import type { CalendarWidgetSettings } from '../calendar/types';

const CALENDAR_WIDGET_ID = 'calendar';
const CALENDAR_LOOKAHEAD_DAYS = 7;

async function describeOpenTasks(app: App): Promise<string> {
	try {
		const open = (await scanTasks(app)).filter((t) => !t.checked);
		if (open.length === 0) return 'Open tasks in the vault: none.';
		const lines = open.slice(0, 30).map((t, i) => `${i + 1}. ${t.text} (${t.file})`);
		return `Open tasks in the vault (already scanned, no need to search for these):\n${lines.join('\n')}`;
	} catch {
		return '';
	}
}

async function describeUpcomingEvents(): Promise<string> {
	const settings = (get(dashboardData).widgets[CALENDAR_WIDGET_ID]?.settings ?? {}) as CalendarWidgetSettings;
	if (!settings.refreshToken || !settings.clientId || !settings.clientSecret) return '';

	try {
		let accessToken = settings.accessToken;
		if (!accessToken || !settings.accessTokenExpiry || settings.accessTokenExpiry <= Date.now()) {
			const tokens = await refreshAccessToken(settings.clientId, settings.clientSecret, settings.refreshToken);
			accessToken = tokens.access_token;
			updateWidgetSettings(CALENDAR_WIDGET_ID, (s) => ({
				...s,
				accessToken: tokens.access_token,
				accessTokenExpiry: Date.now() + tokens.expires_in * 1000 - 60_000,
			}));
		}

		const events = await fetchUpcomingEvents(accessToken, CALENDAR_LOOKAHEAD_DAYS);
		if (events.length === 0) {
			return `Upcoming Google Calendar events, next ${CALENDAR_LOOKAHEAD_DAYS} days: none.`;
		}
		const lines = events
			.slice(0, 20)
			.map((e, i) => `${i + 1}. ${e.allDay ? 'All day' : new Date(e.start).toLocaleString()} - ${e.summary}`);
		return `Upcoming Google Calendar events, next ${CALENDAR_LOOKAHEAD_DAYS} days (already fetched, no need to look these up):\n${lines.join('\n')}`;
	} catch {
		// Not connected, expired, or a network hiccup - the answer just
		// proceeds without calendar context rather than failing the whole ask.
		return '';
	}
}

/** Builds a system-prompt addendum with live task/calendar state Vault Q&A can answer from directly. */
export async function buildLiveContext(app: App): Promise<string> {
	const sections = (await Promise.all([describeOpenTasks(app), describeUpcomingEvents()])).filter(Boolean);
	if (sections.length === 0) return '';
	return `Live context from the SecondBrain Dashboard (use this directly when relevant, no need to re-fetch it):\n\n${sections.join('\n\n')}`;
}
