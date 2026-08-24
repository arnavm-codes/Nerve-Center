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

	// Claude Usage + Vault Health render as an equal-height side-by-side pair
	// (a CSS grid row stretches both cells to match); Tasks sits in its own
	// tall right-hand column (where the abandoned Google Calendar embed used
	// to be); Weekly Digest always stays last, full-width. Everything else
	// flows normally. Grouped by id rather than by `order` so this holds
	// regardless of how widgets get reordered later.
	const usageHealthIds = new Set(['claude-usage', 'vault-health']);
	const sideColumnIds = new Set(['tasks']);
	$: usageHealthPair = overviewWidgets.filter((w) => usageHealthIds.has(w.id));
	$: sideColumnWidgets = overviewWidgets.filter((w) => sideColumnIds.has(w.id));
	$: digestWidgets = overviewWidgets.filter((w) => w.id === 'digest');
	$: otherWidgets = overviewWidgets.filter(
		(w) => !usageHealthIds.has(w.id) && !sideColumnIds.has(w.id) && w.id !== 'digest',
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
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'second-brain'} on:click={() => (activeTab = 'second-brain')}>
			{activeTab === 'second-brain' ? '[ SECOND BRAIN ]' : 'SECOND BRAIN'}
		</button>
		<button class="sbd-tab" class:sbd-tab-active={activeTab === 'research'} on:click={() => (activeTab = 'research')}>
			{activeTab === 'research' ? '[ RESEARCH ]' : 'RESEARCH'}
		</button>
	</div>

	<!--
		All three tab panels stay mounted at all times (visibility toggled via
		CSS, not {#if}/{:else} swapping the DOM) so switching tabs never
		destroys a widget's component instance. This matters concretely for
		Ask your Vault: destroying it mid-answer used to kill the in-flight
		`claude -p` subprocess via its onDestroy handler the moment you
		switched away from the Second Brain tab.
	-->
	<div class="sbd-tab-panel" class:sbd-tab-panel-hidden={activeTab !== 'overview'}>
		<div class="sbd-overview-scroll">
			<div class="sbd-overview-layout">
				<div class="sbd-overview-main">
					<TokenBurnBar bind:this={tokenBurnRef} />
					{#if overviewWidgets.length === 0}
						<div class="sbd-empty-state">
							No widgets yet. Widgets will register here as they're built (Tasks, Claude
							Usage, Calendar).
						</div>
					{:else}
						<div class="sbd-grid">
							{#each otherWidgets as widget (widget.id)}
								<div class="sbd-grid-cell sbd-size-{widget.defaultSize}">
									<WidgetShell title={widget.name}>
										<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
									</WidgetShell>
								</div>
							{/each}

							{#if usageHealthPair.length > 0}
								<div class="sbd-grid-row-pair">
									{#each usageHealthPair as widget (widget.id)}
										<WidgetShell title={widget.name}>
											<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
										</WidgetShell>
									{/each}
								</div>
							{/if}

							{#each digestWidgets as widget (widget.id)}
								<div class="sbd-grid-cell sbd-size-{widget.defaultSize}">
									<WidgetShell title={widget.name}>
										<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
									</WidgetShell>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				{#if sideColumnWidgets.length > 0}
					<div class="sbd-overview-side-panel">
						{#each sideColumnWidgets as widget (widget.id)}
							<WidgetShell title={widget.name}>
								<svelte:component this={widget.Component} bind:this={widgetRefs[widget.id]} />
							</WidgetShell>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="sbd-tab-panel" class:sbd-tab-panel-hidden={activeTab !== 'second-brain'}>
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
	</div>

	<div class="sbd-tab-panel" class:sbd-tab-panel-hidden={activeTab !== 'research'}>
		<ResearchPanel />
	</div>
</div>
