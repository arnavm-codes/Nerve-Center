<script lang="ts">
	export let title: string;
	export let onRefresh: (() => void) | undefined = undefined;
	export let onExpand: (() => void) | undefined = undefined;
</script>

<div class="sbd-widget">
	<div class="sbd-widget-header">
		<span class="sbd-widget-title">{title}</span>
		<span class="sbd-widget-actions">
			{#if onRefresh}
				<button class="sbd-icon-btn" on:click={onRefresh} aria-label="Refresh">↻</button>
			{/if}
			{#if onExpand}
				<button class="sbd-icon-btn" on:click={onExpand} aria-label="Expand">⤢</button>
			{/if}
		</span>
	</div>
	<div class="sbd-widget-divider"></div>
	<div class="sbd-widget-content">
		<slot />
	</div>
</div>
