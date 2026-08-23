import type { SvelteComponent } from 'svelte';

export type WidgetSize = '1x1' | '2x1' | '2x2';

export interface DashboardWidget {
	id: string;
	name: string;
	icon: string;
	defaultSize: WidgetSize;
	Component: typeof SvelteComponent;
	SettingsComponent?: typeof SvelteComponent;
	/** Set false for widgets with no refresh() export (e.g. purely interactive ones) to hide the shell's refresh button instead of showing a no-op. */
	hasRefresh?: boolean;
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
