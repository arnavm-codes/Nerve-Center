<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import { refreshAccessToken } from './oauth';
	import { fetchUpcomingEvents, type CalendarEvent } from './events';
	import type { CalendarWidgetSettings } from './types';

	const WIDGET_ID = 'calendar';
	const POLL_INTERVAL_MS = 5 * 60 * 1000;
	const DAYS_AHEAD = 7;

	let events: CalendarEvent[] = [];
	let loading = true;
	let errorMsg = '';
	let pollHandle: ReturnType<typeof setInterval> | null = null;

	$: settings = ($dashboardData.widgets[WIDGET_ID]?.settings ?? {}) as CalendarWidgetSettings;

	async function ensureAccessToken(): Promise<string | null> {
		const current = ($dashboardData.widgets[WIDGET_ID]?.settings ?? {}) as CalendarWidgetSettings;
		if (!current.refreshToken || !current.clientId || !current.clientSecret) return null;
		if (current.accessToken && current.accessTokenExpiry && current.accessTokenExpiry > Date.now()) {
			return current.accessToken;
		}
		const tokens = await refreshAccessToken(current.clientId, current.clientSecret, current.refreshToken);
		updateWidgetSettings(WIDGET_ID, (s) => ({
			...s,
			accessToken: tokens.access_token,
			accessTokenExpiry: Date.now() + tokens.expires_in * 1000 - 60_000,
		}));
		return tokens.access_token;
	}

	async function load(): Promise<void> {
		loading = true;
		errorMsg = '';
		try {
			const token = await ensureAccessToken();
			events = token ? await fetchUpcomingEvents(token, DAYS_AHEAD) : [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	export function refresh(): void {
		void load();
	}

	onMount(() => {
		void load();
		pollHandle = setInterval(() => void load(), POLL_INTERVAL_MS);
	});

	onDestroy(() => {
		if (pollHandle) clearInterval(pollHandle);
	});

	function formatEventTime(event: CalendarEvent): string {
		if (event.allDay) return 'All day';
		// Explicit timeZone rather than relying on toLocaleString's implicit
		// default - if this still shows the wrong time, the bug is upstream
		// (in what Google's API returned for event.start), not in display.
		return new Date(event.start).toLocaleString(undefined, {
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});
	}

</script>

{#if !settings.clientId || !settings.refreshToken}
	<div class="sbd-muted">Not connected — configure Google Calendar via [Configure] in settings.</div>
{:else if loading}
	<div class="sbd-muted">Loading…</div>
{:else if errorMsg}
	<div class="sbd-error">{errorMsg}</div>
{:else if events.length === 0}
	<div class="sbd-muted">No upcoming events in the next {DAYS_AHEAD} days.</div>
{:else}
	<ol class="sbd-agenda-list">
		{#each events.slice(0, 10) as event, i (event.id)}
			<li>
				<span class="sbd-row-index">{i + 1}</span>
				<span class="sbd-agenda-time" title={event.start}>{formatEventTime(event)}</span>
				<span class="sbd-task-text">{event.summary}</span>
			</li>
		{/each}
	</ol>
{/if}
