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
		try {
			this.component = new this.widget.SettingsComponent({
				target: mountEl,
				context: new Map([['app', this.app]]),
			});
		} catch (err) {
			console.error(`Nerve-Center: failed to mount settings for "${this.widget.id}"`, err);
			mountEl.setText(
				`Failed to load settings for ${this.widget.name}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	onClose(): void {
		this.component?.$destroy();
		this.component = null;
		this.contentEl.empty();
	}
}
