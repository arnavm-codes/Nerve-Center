import { App, Modal } from 'obsidian';
import type { SvelteComponent } from 'svelte';
import type { DashboardWidget } from '../widgets/types';

export class WidgetConfigModal extends Modal {
	private widget: DashboardWidget;
	private component: SvelteComponent | null = null;

	constructor(app: App, widget: DashboardWidget) {
		super(app);
		this.widget = widget;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: `Configure ${this.widget.name}` });
		if (!this.widget.SettingsComponent) return;
		const mountEl = contentEl.createDiv();
		this.component = new this.widget.SettingsComponent({
			target: mountEl,
			context: new Map([['app', this.app]]),
		});
	}

	onClose(): void {
		this.component?.$destroy();
		this.component = null;
		this.contentEl.empty();
	}
}
