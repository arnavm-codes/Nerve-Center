<script lang="ts">
	import { get } from 'svelte/store';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import type { VaultHealthWidgetSettings } from './types';

	const WIDGET_ID = 'vault-health';

	const initial = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as VaultHealthWidgetSettings;
	let staleDays = initial.staleDays ?? 30;

	function save(): void {
		updateWidgetSettings(WIDGET_ID, (s) => ({ ...s, staleDays }));
	}
</script>

<div class="sbd-settings-form">
	<label>
		Stale threshold (days)
		<input type="number" min="1" bind:value={staleDays} on:change={save} />
	</label>
	<p class="sbd-muted sbd-settings-help">Notes untouched for longer than this are counted as stale.</p>
</div>
