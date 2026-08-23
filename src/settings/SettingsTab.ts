import { App, PluginSettingTab, Setting } from 'obsidian';
import type SecondBrainDashboardPlugin from '../main';
import { getRegisteredWidgets } from '../widgets/WidgetRegistry';
import { WidgetConfigModal } from './WidgetConfigModal';

export class DashboardSettingTab extends PluginSettingTab {
	plugin: SecondBrainDashboardPlugin;

	constructor(app: App, plugin: SecondBrainDashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Nerve-Center' });

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
			const setting = new Setting(containerEl)
				.setName(widget.name)
				.addToggle((toggle) =>
					toggle.setValue(config?.enabled ?? true).onChange(async (value) => {
						await this.plugin.setWidgetEnabled(widget.id, value);
					}),
				);
			if (widget.SettingsComponent) {
				setting.addButton((button) =>
					button.setButtonText('Configure').onClick(() => {
						new WidgetConfigModal(this.app, widget).open();
					}),
				);
			}
		}
	}
}
