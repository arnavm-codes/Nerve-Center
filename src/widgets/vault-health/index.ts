import type { DashboardWidget } from '../types';
import VaultHealthWidget from './VaultHealthWidget.svelte';
import VaultHealthSettings from './VaultHealthSettings.svelte';

export const vaultHealthWidget: DashboardWidget = {
	id: 'vault-health',
	name: 'Vault Health',
	icon: 'activity',
	defaultSize: '1x1',
	Component: VaultHealthWidget,
	SettingsComponent: VaultHealthSettings,
};
