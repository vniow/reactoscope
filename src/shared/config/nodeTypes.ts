import type { AppNode } from '../../nodes/types';
import type { ComponentVariant } from '../types/ui';

export interface NodeTypeOption {
	type: AppNode['type'];
	name: string;
	description: string;
	emoji: string;
	variant: ComponentVariant;
	category: 'debug' | 'utility';
	defaultData: Record<string, unknown>;
}

// Node categories for better organization
export const NODE_CATEGORIES = {
	debug: 'Debug & Development',
	utility: 'Utility & Controls',
} as const;

// Variant display names
export const VARIANT_DISPLAY_NAMES: Record<ComponentVariant, string> = {
	core: 'Core',
	source: 'Sources',
	instrument: 'Instruments',
	effect: 'Effects',
	component: 'Components',
	signal: 'Signals',
	event: 'Events',
	unit: 'Utilities',
};

// Debug and development nodes
export const DEBUG_NODES: NodeTypeOption[] = [
	{
		type: 'debug',
		name: 'Debug Node',
		description: 'Comprehensive debug info for all node properties',
		emoji: '🔍',
		variant: 'unit',
		category: 'debug',
		defaultData: {
			label: 'Debug Node',
		},
	},
];

// Utility nodes
export const UTILITY_NODES: NodeTypeOption[] = [
	{
		type: 'file-loader',
		name: 'File Loader',
		description: 'Load and process files',
		emoji: '📁',
		variant: 'unit',
		category: 'utility',
		defaultData: {
			label: 'File Loader',
		},
	},
];

// Combined list of all available nodes
export const ALL_NODES: NodeTypeOption[] = [
	...DEBUG_NODES,
	...UTILITY_NODES,
];

// Group nodes by variant for organized display
export const groupNodesByVariant = (): Record<ComponentVariant, NodeTypeOption[]> => {
	const groups: Record<ComponentVariant, NodeTypeOption[]> = {
		core: [],
		source: [],
		instrument: [],
		effect: [],
		component: [],
		signal: [],
		event: [],
		unit: [],
	};

	ALL_NODES.forEach((node) => {
		groups[node.variant].push(node);
	});

	return Object.fromEntries(
		Object.entries(groups).filter(([, nodes]) => nodes.length > 0)
	) as Record<ComponentVariant, NodeTypeOption[]>;
};

// Get the order of variants to display (non-empty variants only)
export const getVariantDisplayOrder = (): ComponentVariant[] => {
	const groups = groupNodesByVariant();
	const order: ComponentVariant[] = [
		'core',
		'source',
		'instrument',
		'effect',
		'component',
		'signal',
		'event',
		'unit',
	];
	return order.filter(
		(variant) => groups[variant] && groups[variant].length > 0
	);
};
