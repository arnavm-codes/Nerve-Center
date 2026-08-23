import { get } from 'svelte/store';
import type { App } from 'obsidian';
import { dashboardData, updateWidgetSettings } from '../../settings/store';
import { scanTasks } from '../tasks/scanTasks';
import { refreshAccessToken } from '../calendar/oauth';
import { fetchUpcomingEvents } from '../calendar/events';
import type { CalendarWidgetSettings } from '../calendar/types';

const CALENDAR_WIDGET_ID = 'calendar';
const CALENDAR_LOOKAHEAD_DAYS = 7;

const RETRIEVAL_GUIDANCE =
	"When searching the vault, prefer Grep with a few lines of context over reading whole " +
	"files - only fall back to a full Read when Grep's context isn't enough to answer. Use " +
	'the vault contents list below to target Glob/Grep at the right files instead of ' +
	'guessing blindly from the question alone.';

function describeVaultManifest(app: App): string {
	const files = app.vault.getMarkdownFiles();
	if (files.length === 0) return '';
	const lines = files.map((f) => `- ${f.basename} (${f.path})`);
	return `Vault contents - titles + paths only, not content:\n${lines.join('\n')}`;
}

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

/** Builds a system-prompt addendum: live task/calendar state to answer from directly, a vault contents manifest to target retrieval, and a Grep-over-Read nudge - keeps queries cheap without a persisted index. */
export async function buildLiveContext(app: App): Promise<string> {
	const sections = (await Promise.all([describeOpenTasks(app), describeUpcomingEvents()])).filter(Boolean);
	const manifest = describeVaultManifest(app);

	const parts = [RETRIEVAL_GUIDANCE];
	if (sections.length > 0) {
		parts.push(
			`Live context from Nerve-Center (tasks/calendar are already fetched, use directly, no need to re-fetch them):\n\n${sections.join('\n\n')}`,
		);
	}
	if (manifest) parts.push(manifest);

	return parts.join('\n\n');
}
