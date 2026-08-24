import { get } from 'svelte/store';
import type { App } from 'obsidian';
import { dashboardData, updateWidgetSettings } from '../../settings/store';
import { scanTasks } from '../tasks/scanTasks';
import { refreshAccessToken } from '../calendar/oauth';
import { fetchEventsInRange } from '../calendar/events';
import type { CalendarWidgetSettings } from '../calendar/types';

const CALENDAR_WIDGET_ID = 'calendar';
const DECISION_TAGS = new Set(['#decision', '#important']);
const HEADINGS_PER_FILE_CAP = 5;
const FILES_CAP = 30;
const OPEN_TASKS_CAP = 20;

/** Most recent Monday at local midnight - the digest always covers "this week so far", not a rolling 7 days, regardless of what day it's generated on. */
export function mostRecentMonday(now = new Date()): Date {
	const d = new Date(now);
	d.setHours(0, 0, 0, 0);
	const daysSinceMonday = (d.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ...
	d.setDate(d.getDate() - daysSinceMonday);
	return d;
}

function describeNotesThisWeek(app: App, since: number): string {
	const files = app.vault.getMarkdownFiles().filter((f) => f.stat.mtime >= since || f.stat.ctime >= since);
	if (files.length === 0) return 'Notes touched this week: none.';

	const lines = files.slice(0, FILES_CAP).map((f) => {
		const headings = (app.metadataCache.getFileCache(f)?.headings ?? [])
			.slice(0, HEADINGS_PER_FILE_CAP)
			.map((h) => h.heading);
		const headingPart = headings.length > 0 ? ` - headings: ${headings.join(', ')}` : '';
		return `- ${f.basename} (${f.path})${headingPart}`;
	});
	return `Notes touched this week (${files.length}, titles + headings only, not full content):\n${lines.join('\n')}`;
}

function describeDecisionNotes(app: App, since: number): string {
	const files = app.vault.getMarkdownFiles().filter((f) => f.stat.mtime >= since);
	const flagged: string[] = [];
	for (const f of files) {
		const cache = app.metadataCache.getFileCache(f);
		const hasDecisionTag = (cache?.tags ?? []).some((t) => DECISION_TAGS.has(t.tag.toLowerCase()));
		const hasDecisionsHeading = (cache?.headings ?? []).some((h) => /^decisions?$/i.test(h.heading.trim()));
		if (hasDecisionTag || hasDecisionsHeading) flagged.push(f.basename);
	}
	if (flagged.length === 0) return '';
	return `Notes flagged as decisions/important this week: ${flagged.join(', ')}.`;
}

async function describeTasks(app: App, since: number): Promise<string> {
	const tasks = await scanTasks(app);
	const open = tasks.filter((t) => !t.checked).slice(0, OPEN_TASKS_CAP);
	// Checkboxes carry no completion date - approximate "done this week" as
	// checked tasks living in a file touched since the week start.
	const doneThisWeek = tasks.filter((t) => {
		if (!t.checked) return false;
		const file = app.vault.getFileByPath(t.path);
		return file ? file.stat.mtime >= since : false;
	});

	const parts = [
		open.length > 0
			? `Currently open tasks (${tasks.filter((t) => !t.checked).length} total, showing up to ${OPEN_TASKS_CAP}):\n${open.map((t, i) => `${i + 1}. ${t.text} (${t.file})`).join('\n')}`
			: 'Currently open tasks: none.',
		doneThisWeek.length > 0
			? `Tasks completed this week (approximate, based on file edit time):\n${doneThisWeek.map((t, i) => `${i + 1}. ${t.text} (${t.file})`).join('\n')}`
			: 'Tasks completed this week: none detected.',
	];
	return parts.join('\n\n');
}

async function describeCalendarThisWeek(rangeStart: Date, rangeEnd: Date): Promise<string> {
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

		const events = await fetchEventsInRange(accessToken, rangeStart, rangeEnd);
		if (events.length === 0) return 'Calendar events this week: none.';
		const lines = events
			.slice(0, 20)
			.map((e, i) => `${i + 1}. ${e.allDay ? 'All day' : new Date(e.start).toLocaleString()} - ${e.summary}`);
		return `Calendar events this week:\n${lines.join('\n')}`;
	} catch {
		// Not connected, expired, or a network hiccup - digest proceeds without
		// calendar context rather than failing generation entirely.
		return '';
	}
}

export interface DigestContext {
	rangeStart: number;
	rangeEnd: number;
	text: string;
}

/** Gathers a bounded, local-only slice of "this week so far" (since the most recent Monday) - notes touched with their headings, task status, flagged decision notes, and calendar events - as the chunked context handed to Claude for synthesis. */
export async function gatherDigestContext(app: App): Promise<DigestContext> {
	const rangeStart = mostRecentMonday();
	const rangeEnd = new Date();

	const [notes, tasks, calendar] = await Promise.all([
		Promise.resolve(describeNotesThisWeek(app, rangeStart.getTime())),
		describeTasks(app, rangeStart.getTime()),
		describeCalendarThisWeek(rangeStart, rangeEnd),
	]);
	const decisions = describeDecisionNotes(app, rangeStart.getTime());

	const sections = [notes, tasks, decisions, calendar].filter(Boolean);
	return {
		rangeStart: rangeStart.getTime(),
		rangeEnd: rangeEnd.getTime(),
		text: sections.join('\n\n'),
	};
}
