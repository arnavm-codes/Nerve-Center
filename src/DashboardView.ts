import { ItemView, WorkspaceLeaf } from 'obsidian';
import Dashboard from './ui/Dashboard.svelte';

export const DASHBOARD_VIEW_TYPE = 'secondbrain-dashboard-view';

export class DashboardView extends ItemView {
	private component: Dashboard | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Nerve-Center';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('sbd-view-container');
		this.component = new Dashboard({
			target: container,
			context: new Map([['app', this.app]]),
		});
	}

	async onClose(): Promise<void> {
		this.component?.$destroy();
		this.component = null;
	}
}
