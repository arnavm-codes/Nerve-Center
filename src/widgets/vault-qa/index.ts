import type { DashboardWidget } from '../types';
import VaultQAWidget from './VaultQAWidget.svelte';

export const vaultQAWidget: DashboardWidget = {
	id: 'vault-qa',
	name: 'Ask your Vault',
	icon: 'message-circle-question',
	defaultSize: '2x1',
	Component: VaultQAWidget,
};
