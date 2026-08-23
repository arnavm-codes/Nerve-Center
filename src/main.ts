import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './DashboardView';
import { DashboardSettingTab } from './settings/SettingsTab';
import { dashboardData, bindPersistence, DEFAULT_DATA } from './settings/store';
import type { DashboardData } from './widgets/types';
import { registerWidget } from './widgets/WidgetRegistry';
import { tasksWidget } from './widgets/tasks';
import { usageWidget } from './widgets/claude-usage';
import { calendarWidget } from './widgets/calendar';
import { vaultQAWidget } from './widgets/vault-qa';

export default class SecondBrainDashboardPlugin extends Plugin {
	data!: DashboardData;

	async onload(): Promise<void> {
		registerWidget(tasksWidget);
		registerWidget(usageWidget);
		registerWidget(calendarWidget);
		registerWidget(vaultQAWidget);

		this.data = Object.assign(structuredClone(DEFAULT_DATA), await this.loadData());
		dashboardData.set(this.data);
		bindPersistence(async (data) => {
			this.data = data;
			await this.saveData(data);
		});

		this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf));

		this.addRibbonIcon('layout-dashboard', 'Open SecondBrain Dashboard', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-secondbrain-dashboard',
			name: 'Open dashboard',
			callback: () => void this.activateView(),
		});

		this.addSettingTab(new DashboardSettingTab(this.app, this));
	}

	async setWidgetEnabled(id: string, enabled: boolean): Promise<void> {
		const existing = this.data.widgets[id];
		this.data.widgets[id] = {
			enabled,
			order: existing?.order ?? Object.keys(this.data.widgets).length,
			size: existing?.size ?? '1x1',
			settings: existing?.settings ?? {},
		};
		dashboardData.set(this.data);
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
		}
		workspace.revealLeaf(leaf);
	}
}
