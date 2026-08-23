import { App, PluginSettingTab, Setting } from 'obsidian';
import type SecondBrainDashboardPlugin from '../main';
import { getRegisteredWidgets } from '../widgets/WidgetRegistry';

export class DashboardSettingTab extends PluginSettingTab {
	plugin: SecondBrainDashboardPlugin;

	constructor(app: App, plugin: SecondBrainDashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'SecondBrain Dashboard' });

		const widgets = getRegisteredWidgets();
		if (widgets.length === 0) {
			containerEl.createEl('p', {
				text: 'No widgets registered yet.',
				cls: 'setting-item-description',
			});
			return;
		}

		for (const widget of widgets) {
			const config = this.plugin.data.widgets[widget.id];
			new Setting(containerEl)
				.setName(widget.name)
				.addToggle((toggle) =>
					toggle.setValue(config?.enabled ?? true).onChange(async (value) => {
						await this.plugin.setWidgetEnabled(widget.id, value);
					}),
				);
		}
	}
}
