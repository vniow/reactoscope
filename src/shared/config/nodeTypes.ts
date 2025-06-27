import type { AppNode } from '../../nodes/types';
import type { ComponentVariant } from '../types/ui';

export interface NodeTypeOption {
	type: AppNode['type'];
	name: string;
	description: string;
	emoji: string;
	variant: ComponentVariant;
	category: 'debug' | 'utility' | 'placeholder';
	defaultData: Record<string, unknown>;
}

// Node categories for better organization
export const NODE_CATEGORIES = {
	debug: 'Debug & Development',
	utility: 'Utility & Controls',
	placeholder: 'Placeholder Nodes',
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

// Audio source nodes
export const SOURCE_NODES: NodeTypeOption[] = [];

// Audio effect nodes
export const EFFECT_NODES: NodeTypeOption[] = [];

// Utility nodes
export const UTILITY_NODES: NodeTypeOption[] = [
	// No utility nodes currently - file loader removed
];

// Placeholder nodes for each variant
export const PLACEHOLDER_NODES: NodeTypeOption[] = [
	{
		type: 'core',
		name: 'Core System',
		description: 'Master context, destinations, and core audio infrastructure',
		emoji: '⚙️',
		variant: 'core',
		category: 'placeholder',
		defaultData: {
			label: 'Core System',
		},
	},
	{
		type: 'source',
		name: 'Audio Source',
		description: 'Oscillators, players, microphones, and input sources',
		emoji: '🎵',
		variant: 'source',
		category: 'placeholder',
		defaultData: {
			label: 'Audio Source',
		},
	},
	{
		type: 'instrument',
		name: 'Instrument',
		description: 'Synthesizers, samplers, and musical instruments',
		emoji: '🎹',
		variant: 'instrument',
		category: 'placeholder',
		defaultData: {
			label: 'Instrument',
		},
	},
	{
		type: 'effect',
		name: 'Audio Effect',
		description: 'Reverb, delay, filters, and audio processing effects',
		emoji: '🎛️',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Audio Effect',
		},
	},
	{
		type: 'component',
		name: 'Signal Component',
		description: 'Gain, panner, mixer, and signal routing components',
		emoji: '🔧',
		variant: 'component',
		category: 'placeholder',
		defaultData: {
			label: 'Signal Component',
		},
	},
	{
		type: 'signal',
		name: 'Signal Processor',
		description: 'Analyzers, FFT, meters, and signal analysis tools',
		emoji: '📊',
		variant: 'signal',
		category: 'placeholder',
		defaultData: {
			label: 'Signal Processor',
		},
	},
	{
		type: 'event',
		name: 'Event Controller',
		description: 'Sequences, parts, transport, and timing control',
		emoji: '⏰',
		variant: 'event',
		category: 'placeholder',
		defaultData: {
			label: 'Event Controller',
		},
	},
	{
		type: 'unit',
		name: 'Utility',
		description: 'Frequency converters, time utilities, and helper tools',
		emoji: '🔨',
		variant: 'unit',
		category: 'placeholder',
		defaultData: {
			label: 'Utility',
		},
	},
];

// Combined list of all available nodes
export const ALL_NODES: NodeTypeOption[] = [
	...DEBUG_NODES,
	...SOURCE_NODES,
	...EFFECT_NODES,
	...UTILITY_NODES,
	...PLACEHOLDER_NODES,
];

// Group nodes by variant for organized display
export const groupNodesByVariant = (): Record<
	ComponentVariant,
	NodeTypeOption[]
> => {
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
