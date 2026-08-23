<script lang="ts">
	import { dashboardData } from '../settings/store';
	import { getRegisteredWidgets } from '../widgets/WidgetRegistry';
	import WidgetShell from './WidgetShell.svelte';
	import TokenBurnBar from './TokenBurnBar.svelte';
	import ResearchPanel from '../research/ResearchPanel.svelte';

	const widgetRefs: Record<string, { refresh?: () => void }> = {};
	let tokenBurnRef: { refresh?: () => void } | undefined;

	type Tab = 'overview' | 'second-brain' | 'research';
	let activeTab: Tab = 'overview';

	$: enabledWidgets = getRegisteredWidgets()
		.filter((w) => $dashboardData.widgets[w.id]?.enabled ?? true)
		.sort(
			(a, b) =>
				($dashboardData.widgets[a.id]?.order ?? 0) -
				($dashboardData.widgets[b.id]?.order ?? 0),
		);

	// "Ask your Vault" lives in its own Second Brain tab rather than the
	// Overview grid - a Q&A input doesn't fit the at-a-glance stat-panel
	// layout the other widgets share.
	$: overviewWidgets = enabledWidgets.filter((w) => w.id !== 'vault-qa');
	$: secondBrainWidgets = enabledWidgets.filter((w) => w.id === 'vault-qa');

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
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'second-brain'} on:click={() => (activeTab = 'second-brain')}>
			{activeTab === 'second-brain' ? '[ SECOND BRAIN ]' : 'SECOND BRAIN'}
		</button>
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'research'} on:click={() => (activeTab = 'research')}>
			{activeTab === 'research' ? '[ RESEARCH ]' : 'RESEARCH'}
		</button>
	</div>

	{#if activeTab === 'overview'}
		<TokenBurnBar bind:this={tokenBurnRef} />
		{#if overviewWidgets.length === 0}
			<div class="sbd-empty-state">
				No widgets yet. Widgets will register here as they're built (Tasks, Claude
				Usage, Calendar).
			</div>
		{:else}
			<div class="sbd-grid">
				{#each overviewWidgets as widget (widget.id)}
					<div class="sbd-grid-cell sbd-size-{widget.defaultSize}">
						<WidgetShell title={widget.name}>
							<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
						</WidgetShell>
					</div>
				{/each}
			</div>
		{/if}
	{:else if activeTab === 'second-brain'}
		{#if secondBrainWidgets.length === 0}
			<div class="sbd-empty-state">Ask your Vault is disabled - enable it in settings.</div>
		{:else}
			<div class="sbd-grid">
				{#each secondBrainWidgets as widget (widget.id)}
					<div class="sbd-grid-cell sbd-size-{widget.defaultSize}">
						<WidgetShell title={widget.name}>
							<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
						</WidgetShell>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<ResearchPanel />
	{/if}
</div>
