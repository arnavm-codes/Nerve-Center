<script lang="ts">
	import { get } from 'svelte/store';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import { runAuthFlow } from './oauth';
	import type { CalendarWidgetSettings } from './types';

	const WIDGET_ID = 'calendar';

	$: settings = ($dashboardData.widgets[WIDGET_ID]?.settings ?? {}) as CalendarWidgetSettings;

	const initialSettings = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as CalendarWidgetSettings;
	let clientId = initialSettings.clientId ?? '';
	let clientSecret = initialSettings.clientSecret ?? '';
	let connecting = false;
	let errorMsg = '';

	function saveCredentials(): void {
		updateWidgetSettings(WIDGET_ID, (s) => ({ ...s, clientId, clientSecret }));
	}

	async function connect(): Promise<void> {
		errorMsg = '';
		saveCredentials();
		if (!clientId || !clientSecret) {
			errorMsg = 'Enter a Client ID and Client Secret first.';
			return;
		}
		connecting = true;
		try {
			const tokens = await runAuthFlow(clientId, clientSecret);
			updateWidgetSettings(WIDGET_ID, (s) => ({
				...s,
				clientId,
				clientSecret,
				refreshToken: tokens.refresh_token ?? (s as CalendarWidgetSettings).refreshToken,
				accessToken: tokens.access_token,
				accessTokenExpiry: Date.now() + tokens.expires_in * 1000 - 60_000,
			}));
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			connecting = false;
		}
	}

	function disconnect(): void {
		updateWidgetSettings(WIDGET_ID, (s) => {
			const rest = { ...(s as CalendarWidgetSettings) };
			delete rest.refreshToken;
			delete rest.accessToken;
			delete rest.accessTokenExpiry;
			return rest;
		});
	}
</script>

<div class="sbd-settings-form">
	<label>
		Client ID
		<input
			type="text"
			bind:value={clientId}
			on:change={saveCredentials}
			placeholder="xxxx.apps.googleusercontent.com"
		/>
	</label>
	<label>
		Client Secret
		<input type="password" bind:value={clientSecret} on:change={saveCredentials} placeholder="GOCSPX-…" />
	</label>

	{#if settings.refreshToken}
		<p class="sbd-muted">Connected to Google Calendar.</p>
		<button on:click={disconnect}>Disconnect</button>
	{:else}
		<button on:click={connect} disabled={connecting}>
			{connecting ? 'Waiting for browser…' : 'Connect with Google'}
		</button>
	{/if}

	{#if errorMsg}
		<p class="sbd-error">{errorMsg}</p>
	{/if}

	<p class="sbd-muted sbd-settings-help">
		Create an OAuth "Desktop app" client in Google Cloud Console with the Calendar API enabled,
		then paste its Client ID and Client Secret here. See the SecondBrain Dashboard project note
		in the vault for setup steps.
	</p>
</div>
