import type { AppNode } from '../nodes/types';
import type { ComponentVariant } from '../types/ui';

export interface NodeTypeOption {
	type: AppNode['type'];
	name: string;
	description: string;
	emoji: string;
	variant: ComponentVariant; // Use ComponentVariant instead of NodeVariant
	category: 'debug' | 'audio' | 'utility';
	defaultData: Record<string, unknown>;
}

// Node categories for better organization
export const NODE_CATEGORIES = {
	debug: 'Debug & Development',
	audio: 'Audio Processing',
	utility: 'Utility & Controls',
} as const;

// Debug and development nodes
export const DEBUG_NODES: NodeTypeOption[] = [
	{
		type: 'debug',
		name: 'Debug Node',
		description: 'Comprehensive debug info for all node properties',
		emoji: '🔍',
		variant: 'unit', // Debug/development -> unit category
		category: 'debug',
		defaultData: {
			label: 'Debug Node',
		},
	},
];

// Audio processing nodes
export const AUDIO_NODES: NodeTypeOption[] = [
	{
		type: 'oscillator',
		name: 'Oscillator',
		description: 'Audio oscillator with frequency and waveform controls',
		emoji: '🎵',
		variant: 'source', // Audio source -> source category
		category: 'audio',
		defaultData: {
			id: '',
			type: 'oscillator' as const,
			params: {
				frequency: 440,
				detune: 0,
				waveType: 'sine' as const,
				isPlaying: false,
				volume: 0.5,
			},
			label: 'Oscillator',
		},
	},
	{
		type: 'gain',
		name: 'Gain',
		description: 'Volume control with mute functionality',
		emoji: '🎚️',
		variant: 'event', // Changed to event variant for pastel yellow color
		category: 'audio',
		defaultData: {
			id: '',
			type: 'gain' as const,
			params: {
				gain: 1.0,
				mute: false,
			},
			label: 'Gain',
		},
	},
	{
		type: 'visualizer',
		name: 'Audio Visualizer',
		description: 'Real-time waveform visualization',
		emoji: '📊',
		variant: 'signal', // Analysis/visualization -> signal category
		category: 'audio',
		defaultData: {
			id: '',
			type: 'visualizer' as const,
			params: {
				size: 1024,
				smoothing: 0.8,
				isConnected: false,
			},
			label: 'Visualizer',
		},
	},
];

// Utility nodes
export const UTILITY_NODES: NodeTypeOption[] = [
	{
		type: 'destination',
		name: 'Audio Destination',
		description: 'Master audio output endpoint',
		emoji: '🔊',
		variant: 'core', // Master output -> core system category
		category: 'utility',
		defaultData: {
			label: 'Master Out',
		},
	},
];

// Combined node types for easy access
export const ALL_NODE_TYPES: NodeTypeOption[] = [
	...DEBUG_NODES,
	...AUDIO_NODES,
	...UTILITY_NODES,
];

// Helper to check if a node type requires audio-specific handling
export const isAudioNode = (nodeType: string): boolean => {
	return ['oscillator', 'gain', 'visualizer'].includes(nodeType);
};

// Variant display names for the UI
export const VARIANT_DISPLAY_NAMES: Record<ComponentVariant, string> = {
	core: 'Core System',
	source: 'Audio Sources',
	instrument: 'Instruments',
	effect: 'Effects',
	component: 'Components',
	signal: 'Signal Processing',
	event: 'Events',
	unit: 'Debug & Utilities',
} as const;

// Helper to group nodes by their variant
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

	ALL_NODE_TYPES.forEach((node) => {
		groups[node.variant].push(node);
	});

	// Filter out empty groups
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
