export const NodeType = {
	// Audio Nodes
	AUDIO_INPUT: 'audioInput',
	AUDIO_OUTPUT: 'audioOutput',
	OSCILLATOR: 'oscillator',
	FILTER: 'filter',
	DELAY: 'delay',
	GAIN: 'gain',
	BITCRUSHER: 'bitcrusher',
	NOISE_GENERATOR: 'noiseGenerator',

	// Visual Nodes
	SPECTROGRAM: 'spectrogram',
	OSCILLOSCOPE: 'oscilloscope',
	IMAGE_DISPLAY: 'imageDisplay',

	// Configuration Nodes
	GLOBAL_SETTINGS: 'globalSettings',
	MIDI_INPUT_CONFIG: 'midiInputConfig',

	// Data Nodes
	DATA_INPUT: 'dataInput',
	DATA_VIEWER: 'dataViewer',

	// Utility/Debug Nodes
	DEBUG: 'debugNode', // Matches existing DebugNode
	COMMENT: 'commentNode',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

// Base data structure for all nodes
export interface BaseNodeData {
	label: string;
	description?: string;
	nodeType: NodeType; // Using the enum for strong typing
	themeKey?: string; // Added to carry the theme key for styling
}

// --- Audio Node Data Interfaces ---
export interface BaseAudioData extends BaseNodeData {
	nodeType:
		| NodeType.AUDIO_INPUT
		| NodeType.AUDIO_OUTPUT
		| NodeType.OSCILLATOR
		| NodeType.FILTER
		| NodeType.DELAY
		| NodeType.GAIN
		| NodeType.BITCRUSHER
		| NodeType.NOISE_GENERATOR;
	// Common audio properties like volume, pan could go here if universally applicable
}

export interface OscillatorData extends BaseAudioData {
	nodeType: NodeType.OSCILLATOR;
	frequency: number;
	waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

export interface GainData extends BaseAudioData {
	nodeType: NodeType.GAIN;
	gain: number; // Linear gain value (e.g., 0 to 1)
}

export interface DebugNodeData extends BaseNodeData {
	nodeType: NodeType.DEBUG;
	debugInfo: Record<string, any>;
}

// --- Add other specific data interfaces as needed ---
// e.g., FilterData, DelayData, SpectrogramData, etc.

// Union type for all possible node data structures
// This will grow as you define more specific node data types
export type NodeData =
	| BaseNodeData // Generic fallback
	| OscillatorData
	| GainData
	| DebugNodeData;
// | FilterData
// | DelayData
// ... and so on

// This map will associate each NodeType with its corresponding theme key
// as defined in the CSS @theme block.
export const NODE_THEME_KEYS: Record<NodeType, string> = {
	[NodeType.AUDIO_INPUT]: 'generic', // Placeholder, define specific if needed
	[NodeType.AUDIO_OUTPUT]: 'generic', // Placeholder
	[NodeType.OSCILLATOR]: 'oscillator',
	[NodeType.FILTER]: 'generic', // Placeholder
	[NodeType.DELAY]: 'generic', // Placeholder
	[NodeType.GAIN]: 'gain',
	[NodeType.BITCRUSHER]: 'generic', // Placeholder
	[NodeType.NOISE_GENERATOR]: 'generic', // Placeholder
	[NodeType.SPECTROGRAM]: 'generic', // Placeholder
	[NodeType.OSCILLOSCOPE]: 'generic', // Placeholder
	[NodeType.IMAGE_DISPLAY]: 'generic', // Placeholder
	[NodeType.GLOBAL_SETTINGS]: 'generic', // Placeholder
	[NodeType.MIDI_INPUT_CONFIG]: 'generic', // Placeholder
	[NodeType.DATA_INPUT]: 'generic', // Placeholder
	[NodeType.DATA_VIEWER]: 'generic', // Placeholder
	[NodeType.DEBUG]: 'debug',
	[NodeType.COMMENT]: 'generic', // Placeholder
};

// Helper function to get default data for a node type
export function getDefaultNodeData(type: NodeType, id: string): NodeData {
	const baseData: Omit<BaseNodeData, 'nodeType'> = {
		label: `${type} Node ${id.substring(0, 4)}`,
		description: `A node of type ${type}`,
	};

	switch (type) {
		case NodeType.OSCILLATOR:
			return {
				...baseData,
				nodeType: NodeType.OSCILLATOR,
				frequency: 440,
				waveform: 'sine',
			} as OscillatorData;
		case NodeType.GAIN:
			return {
				...baseData,
				nodeType: NodeType.GAIN,
				gain: 0.75,
			} as GainData;
		case NodeType.DEBUG:
			return {
				...baseData,
				nodeType: NodeType.DEBUG,
				label: `Debug ${id.substring(0, 4)}`,
				debugInfo: { message: 'Initial debug state' },
			} as DebugNodeData;
		// Add cases for other node types with their default data
		default:
			// Fallback for types not yet specifically handled
			return {
				...baseData,
				nodeType: type,
				label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
			} as BaseNodeData;
	}
}

// Node Registration Map - links React Flow node type strings to our NodeType enum
// This centralizes the mapping between what React Flow expects and our internal types
export interface NodeRegistration {
	nodeTypeEnum: NodeType;
	defaultData: (id: string) => NodeData;
	displayName: string;
	category: 'audio' | 'visual' | 'config' | 'data' | 'utility';
}

export const NODE_REGISTRY_MAP: Record<string, NodeRegistration> = {
	// Audio Nodes
	oscillatorNode: {
		nodeTypeEnum: NodeType.OSCILLATOR,
		defaultData: (id: string) => getDefaultNodeData(NodeType.OSCILLATOR, id),
		displayName: 'Oscillator',
		category: 'audio',
	},
	gainNode: {
		nodeTypeEnum: NodeType.GAIN,
		defaultData: (id: string) => getDefaultNodeData(NodeType.GAIN, id),
		displayName: 'Gain',
		category: 'audio',
	},
	filterNode: {
		nodeTypeEnum: NodeType.FILTER,
		defaultData: (id: string) => getDefaultNodeData(NodeType.FILTER, id),
		displayName: 'Filter',
		category: 'audio',
	},
	delayNode: {
		nodeTypeEnum: NodeType.DELAY,
		defaultData: (id: string) => getDefaultNodeData(NodeType.DELAY, id),
		displayName: 'Delay',
		category: 'audio',
	},
	bitCrusherNode: {
		nodeTypeEnum: NodeType.BITCRUSHER,
		defaultData: (id: string) => getDefaultNodeData(NodeType.BITCRUSHER, id),
		displayName: 'Bit Crusher',
		category: 'audio',
	},
	noiseGeneratorNode: {
		nodeTypeEnum: NodeType.NOISE_GENERATOR,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeType.NOISE_GENERATOR, id),
		displayName: 'Noise Generator',
		category: 'audio',
	},
	audioInputNode: {
		nodeTypeEnum: NodeType.AUDIO_INPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeType.AUDIO_INPUT, id),
		displayName: 'Audio Input',
		category: 'audio',
	},
	audioOutputNode: {
		nodeTypeEnum: NodeType.AUDIO_OUTPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeType.AUDIO_OUTPUT, id),
		displayName: 'Audio Output',
		category: 'audio',
	},

	// Visual Nodes
	spectrogramNode: {
		nodeTypeEnum: NodeType.SPECTROGRAM,
		defaultData: (id: string) => getDefaultNodeData(NodeType.SPECTROGRAM, id),
		displayName: 'Spectrogram',
		category: 'visual',
	},
	oscilloscopeNode: {
		nodeTypeEnum: NodeType.OSCILLOSCOPE,
		defaultData: (id: string) => getDefaultNodeData(NodeType.OSCILLOSCOPE, id),
		displayName: 'Oscilloscope',
		category: 'visual',
	},
	imageDisplayNode: {
		nodeTypeEnum: NodeType.IMAGE_DISPLAY,
		defaultData: (id: string) => getDefaultNodeData(NodeType.IMAGE_DISPLAY, id),
		displayName: 'Image Display',
		category: 'visual',
	},

	// Config Nodes
	globalSettingsNode: {
		nodeTypeEnum: NodeType.GLOBAL_SETTINGS,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeType.GLOBAL_SETTINGS, id),
		displayName: 'Global Settings',
		category: 'config',
	},
	midiInputConfigNode: {
		nodeTypeEnum: NodeType.MIDI_INPUT_CONFIG,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeType.MIDI_INPUT_CONFIG, id),
		displayName: 'MIDI Input Config',
		category: 'config',
	},

	// Data Nodes
	dataInputNode: {
		nodeTypeEnum: NodeType.DATA_INPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeType.DATA_INPUT, id),
		displayName: 'Data Input',
		category: 'data',
	},
	dataViewerNode: {
		nodeTypeEnum: NodeType.DATA_VIEWER,
		defaultData: (id: string) => getDefaultNodeData(NodeType.DATA_VIEWER, id),
		displayName: 'Data Viewer',
		category: 'data',
	},

	// Utility Nodes
	debugNode: {
		nodeTypeEnum: NodeType.DEBUG,
		defaultData: (id: string) => getDefaultNodeData(NodeType.DEBUG, id),
		displayName: 'Debug',
		category: 'utility',
	},
	commentNode: {
		nodeTypeEnum: NodeType.COMMENT,
		defaultData: (id: string) => getDefaultNodeData(NodeType.COMMENT, id),
		displayName: 'Comment',
		category: 'utility',
	},
};

// Helper function to get default node data using the registry
export function getDefaultNodeDataFromRegistry(
	nodeRegistrationKey: string,
	id: string
): NodeData {
	const registration = NODE_REGISTRY_MAP[nodeRegistrationKey];
	if (!registration) {
		throw new Error(`Unknown node registration key: ${nodeRegistrationKey}`);
	}
	return registration.defaultData(id);
}

// Helper to get all available node types grouped by category
export function getNodeCategories() {
	const categories: Record<
		string,
		Array<{ key: string; registration: NodeRegistration }>
	> = {};

	Object.entries(NODE_REGISTRY_MAP).forEach(([key, registration]) => {
		if (!categories[registration.category]) {
			categories[registration.category] = [];
		}
		categories[registration.category].push({ key, registration });
	});

	return categories;
}
