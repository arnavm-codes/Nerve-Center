import type { DashboardWidget } from '../types';
import DevActivityWidget from './DevActivityWidget.svelte';
import DevActivitySettings from './DevActivitySettings.svelte';

export const devActivityWidget: DashboardWidget = {
	id: 'dev-activity',
	name: 'Dev Activity',
	icon: 'git-branch',
	defaultSize: '2x1',
	Component: DevActivityWidget,
	SettingsComponent: DevActivitySettings,
};
