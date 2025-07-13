import type { ComponentVariant } from '../types/ui';
import {
	NODE_REGISTRY,
	groupNodesByVariant as groupNodesByVariantFromRegistry,
	getVariantDisplayOrder as getVariantDisplayOrderFromRegistry,
} from '../../flow/nodes/nodeRegistry';

export interface NodeTypeOption {
	type: string; // Changed to string as type is now from registry
	name: string;
	description: string;
	emoji: string;
	variant: ComponentVariant;
}
// Variant display names
export const VARIANT_DISPLAY_NAMES: Record<ComponentVariant, string> = {
	core: 'Core',
	source: 'Sources',
	instrument: 'Instruments',
	effect: 'Effects',
	component: 'Components',
	signal: 'Signals',
	event: 'Events',
	util: 'Utilities',
};

// Combined list of all available nodes - now directly from the registry
export const ALL_NODES: NodeTypeOption[] = NODE_REGISTRY;

// Group nodes by variant for organized display
export const groupNodesByVariant = (): Record<
	ComponentVariant,
	NodeTypeOption[]
> => {
	return groupNodesByVariantFromRegistry();
};

// Get the order of variants to display (non-empty variants only)
export const getVariantDisplayOrder = (): ComponentVariant[] => {
	return getVariantDisplayOrderFromRegistry();
};
