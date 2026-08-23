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
