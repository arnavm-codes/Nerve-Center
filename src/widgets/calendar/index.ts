import type { DashboardWidget } from '../types';
import CalendarWidget from './CalendarWidget.svelte';
import CalendarSettings from './CalendarSettings.svelte';

export const calendarWidget: DashboardWidget = {
	id: 'calendar',
	name: 'Calendar',
	icon: 'calendar',
	defaultSize: '1x1',
	Component: CalendarWidget,
	SettingsComponent: CalendarSettings,
};
