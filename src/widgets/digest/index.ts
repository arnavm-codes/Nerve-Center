import type { DashboardWidget } from '../types';
import DigestWidget from './DigestWidget.svelte';

export const digestWidget: DashboardWidget = {
	id: 'digest',
	name: 'Weekly Digest',
	icon: 'newspaper',
	defaultSize: '2x1',
	Component: DigestWidget,
};
