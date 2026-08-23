import type { DashboardWidget } from './types';

const registry: DashboardWidget[] = [];

export function registerWidget(widget: DashboardWidget): void {
	if (registry.some((w) => w.id === widget.id)) {
		throw new Error(`Widget with id "${widget.id}" is already registered`);
	}
	registry.push(widget);
}

export function getRegisteredWidgets(): DashboardWidget[] {
	return registry;
}

export function getWidget(id: string): DashboardWidget | undefined {
	return registry.find((w) => w.id === id);
}
