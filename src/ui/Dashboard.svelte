<script lang="ts">
	import { dashboardData } from '../settings/store';
	import { getRegisteredWidgets } from '../widgets/WidgetRegistry';
	import WidgetShell from './WidgetShell.svelte';

	const widgetRefs: Record<string, { refresh?: () => void }> = {};

	$: enabledWidgets = getRegisteredWidgets()
		.filter((w) => $dashboardData.widgets[w.id]?.enabled ?? true)
		.sort(
			(a, b) =>
				($dashboardData.widgets[a.id]?.order ?? 0) -
				($dashboardData.widgets[b.id]?.order ?? 0),
		);
</script>

<div class="sbd-dashboard">
	<div class="sbd-header">
		<span class="sbd-header-title">§ NERVE-CENTER</span>
	</div>
	{#if enabledWidgets.length === 0}
		<div class="sbd-empty-state">
			No widgets yet. Widgets will register here as they're built (Tasks, Claude
			Usage, Calendar, Ask your Vault).
		</div>
	{:else}
		<div class="sbd-grid">
			{#each enabledWidgets as widget (widget.id)}
				<div class="sbd-grid-cell sbd-size-{widget.defaultSize}">
					<WidgetShell
						title={widget.name}
						onRefresh={widget.hasRefresh === false ? undefined : () => widgetRefs[widget.id]?.refresh?.()}
					>
						<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
					</WidgetShell>
				</div>
			{/each}
		</div>
	{/if}
</div>
