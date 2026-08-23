import type { DashboardWidget } from '../types';
import UsageWidget from './UsageWidget.svelte';

export const usageWidget: DashboardWidget = {
	id: 'claude-usage',
	name: 'Claude Usage',
	icon: 'bar-chart',
	defaultSize: '1x1',
	Component: UsageWidget,
};
