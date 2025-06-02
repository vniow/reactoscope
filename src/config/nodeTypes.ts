import type { AppNode } from '../nodes/types';

export type NodeVariant =
	| 'primary'
	| 'secondary'
	| 'audio'
	| 'debug'
	| 'default';

export interface NodeTypeOption {
	type: AppNode['type'];
	name: string;
	description: string;
	emoji: string;
	variant: NodeVariant;
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
		type: 'position-logger',
		name: 'Position Logger',
		description: 'Node that displays position coordinates',
		emoji: '📍',
		variant: 'primary',
		category: 'debug',
		defaultData: {
			label: 'New Position Node',
		},
	},
	{
		type: 'debug',
		name: 'Debug Node',
		description: 'Comprehensive debug info for all node properties',
		emoji: '🔍',
		variant: 'debug',
		category: 'debug',
		defaultData: {
			label: 'Debug Node',
		},
	},
	{
		type: 'theme-debug',
		name: 'Theme Debug',
		description: 'Node that shows theme debugging info',
		emoji: '🎨',
		variant: 'secondary',
		category: 'debug',
		defaultData: {
			label: 'Theme Debug Info',
		},
	},
	{
		type: 'r3f-debug',
		name: 'R3F Debug',
		description: 'React Three Fiber debug node with rotating box',
		emoji: '🎲',
		variant: 'secondary',
		category: 'debug',
		defaultData: {
			label: 'R3F Debug',
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
		variant: 'audio',
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
		variant: 'audio',
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
		variant: 'audio',
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
		variant: 'default',
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

// Quick access nodes (for the quick add section)
export const QUICK_ADD_NODES = ALL_NODE_TYPES.slice(0, 8);

// Helper to check if a node type requires audio-specific handling
export const isAudioNode = (nodeType: string): boolean => {
	return ['oscillator', 'gain', 'visualizer'].includes(nodeType);
};
