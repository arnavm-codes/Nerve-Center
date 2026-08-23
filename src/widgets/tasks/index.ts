import type { DashboardWidget } from '../types';
import TasksWidget from './TasksWidget.svelte';

export const tasksWidget: DashboardWidget = {
	id: 'tasks',
	name: 'Tasks',
	icon: 'check-square',
	defaultSize: '1x1',
	Component: TasksWidget,
};
