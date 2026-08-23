import { writable } from 'svelte/store';
import type { DashboardData } from '../widgets/types';

export const DEFAULT_DATA: DashboardData = {
	widgets: {},
};

export const dashboardData = writable<DashboardData>(structuredClone(DEFAULT_DATA));

let saveFn: ((data: DashboardData) => Promise<void>) | null = null;

export function bindPersistence(save: (data: DashboardData) => Promise<void>): void {
	saveFn = save;
}

dashboardData.subscribe((data) => {
	void saveFn?.(data);
});

/** Merges a patch into one widget's own `settings` slice, creating its config entry if needed. */
export function updateWidgetSettings(
	id: string,
	updater: (settings: Record<string, unknown>) => Record<string, unknown>,
): void {
	dashboardData.update((data) => {
		const existing = data.widgets[id] ?? {
			enabled: true,
			order: Object.keys(data.widgets).length,
			size: '1x1' as const,
			settings: {},
		};
		data.widgets[id] = { ...existing, settings: updater(existing.settings) };
		return data;
	});
}
