import type { SvelteComponent } from 'svelte';

export type WidgetSize = '1x1' | '2x1' | '2x2';

export interface DashboardWidget {
	id: string;
	name: string;
	icon: string;
	defaultSize: WidgetSize;
	Component: typeof SvelteComponent;
	SettingsComponent?: typeof SvelteComponent;
}

export interface WidgetInstanceConfig {
	enabled: boolean;
	order: number;
	size: WidgetSize;
	settings: Record<string, unknown>;
}

export interface DashboardData {
	widgets: Record<string, WidgetInstanceConfig>;
}
