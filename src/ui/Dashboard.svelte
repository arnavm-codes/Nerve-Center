<script lang="ts">
	import { dashboardData } from '../settings/store';
	import { getRegisteredWidgets } from '../widgets/WidgetRegistry';
	import WidgetShell from './WidgetShell.svelte';
	import TokenBurnBar from './TokenBurnBar.svelte';

	const widgetRefs: Record<string, { refresh?: () => void }> = {};
	let tokenBurnRef: { refresh?: () => void } | undefined;

	type Tab = 'overview' | 'research';
	let activeTab: Tab = 'overview';

	$: enabledWidgets = getRegisteredWidgets()
		.filter((w) => $dashboardData.widgets[w.id]?.enabled ?? true)
		.sort(
			(a, b) =>
				($dashboardData.widgets[a.id]?.order ?? 0) -
				($dashboardData.widgets[b.id]?.order ?? 0),
		);

	function refreshAll(): void {
		tokenBurnRef?.refresh?.();
		for (const widget of enabledWidgets) widgetRefs[widget.id]?.refresh?.();
	}
</script>

<div class="sbd-dashboard">
	<div class="sbd-header">
		<span class="sbd-header-title">§ NERVE-CENTER</span>
		<button class="sbd-icon-btn sbd-refresh-all" on:click={refreshAll} aria-label="Refresh all" title="Refresh all">↻</button>
	</div>

	<div class="sbd-tabs">
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'overview'} on:click={() => (activeTab = 'overview')}>
			{activeTab === 'overview' ? '[ OVERVIEW ]' : 'OVERVIEW'}
		</button>
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'research'} on:click={() => (activeTab = 'research')}>
			{activeTab === 'research' ? '[ RESEARCH ]' : 'RESEARCH'}
		</button>
	</div>

	{#if activeTab === 'overview'}
		<TokenBurnBar bind:this={tokenBurnRef} />
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
	{:else}
		<div class="sbd-empty-state">Research — nothing here yet.</div>
	{/if}
</div>
