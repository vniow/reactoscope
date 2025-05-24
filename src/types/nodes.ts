export const NodeTypes = {
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

export type NodeType = (typeof NodeTypes)[keyof typeof NodeTypes];

// Add theme keys mapping
export const NODE_THEME_KEYS: Record<NodeType, string> = {
	[NodeTypes.AUDIO_INPUT]: 'audio-input',
	[NodeTypes.AUDIO_OUTPUT]: 'audio-output',
	[NodeTypes.OSCILLATOR]: 'oscillator',
	[NodeTypes.FILTER]: 'filter',
	[NodeTypes.DELAY]: 'delay',
	[NodeTypes.GAIN]: 'gain',
	[NodeTypes.BITCRUSHER]: 'bitcrusher',
	[NodeTypes.NOISE_GENERATOR]: 'noise-generator',
	[NodeTypes.SPECTROGRAM]: 'spectrogram',
	[NodeTypes.OSCILLOSCOPE]: 'oscilloscope',
	[NodeTypes.IMAGE_DISPLAY]: 'image-display',
	[NodeTypes.GLOBAL_SETTINGS]: 'global-settings',
	[NodeTypes.MIDI_INPUT_CONFIG]: 'midi-input-config',
	[NodeTypes.DATA_INPUT]: 'data-input',
	[NodeTypes.DATA_VIEWER]: 'data-viewer',
	[NodeTypes.DEBUG]: 'debug',
	[NodeTypes.COMMENT]: 'comment',
};

// Base data structure for all nodes
export interface BaseNodeData {
	label: string;
	description?: string;
	nodeType: NodeType; // Fix: use NodeType instead of NodeTypes
	themeKey?: string;

	// Add this index signature to allow additional properties
	[key: string]: unknown;
}

// --- Audio Node Data Interfaces ---
export interface BaseAudioData extends BaseNodeData {
	nodeType:
		| typeof NodeTypes.AUDIO_INPUT
		| typeof NodeTypes.AUDIO_OUTPUT
		| typeof NodeTypes.OSCILLATOR
		| typeof NodeTypes.FILTER
		| typeof NodeTypes.DELAY
		| typeof NodeTypes.GAIN
		| typeof NodeTypes.BITCRUSHER
		| typeof NodeTypes.NOISE_GENERATOR;
}

export interface OscillatorData extends BaseAudioData {
	nodeType: typeof NodeTypes.OSCILLATOR;
	frequency: number;
	waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

export interface GainData extends BaseAudioData {
	nodeType: typeof NodeTypes.GAIN;
	gain: number;
}

export interface DebugNodeData extends BaseNodeData {
	nodeType: typeof NodeTypes.DEBUG;
	debugInfo: Record<string, any>;
}

// Union type for all possible node data structures
export type NodeData = BaseNodeData | OscillatorData | GainData | DebugNodeData;

// Node registration interface
export interface NodeRegistration {
	nodeTypeEnum: NodeType;
	defaultData: (id: string) => NodeData;
	displayName: string;
	category: string;
}

// Helper function to get default node data
export function getDefaultNodeData(nodeType: NodeType, id: string): NodeData {
	const baseData = {
		label: getDefaultLabel(nodeType),
		description: getDefaultDescription(nodeType),
		nodeType,
		themeKey: NODE_THEME_KEYS[nodeType],
	};

	switch (nodeType) {
		case NodeTypes.OSCILLATOR:
			return {
				...baseData,
				nodeType: NodeTypes.OSCILLATOR,
				frequency: 440,
				waveform: 'sine' as const,
			} as OscillatorData;

		case NodeTypes.GAIN:
			return {
				...baseData,
				nodeType: NodeTypes.GAIN,
				gain: 0.5,
			} as GainData;

		case NodeTypes.DEBUG:
			return {
				...baseData,
				nodeType: NodeTypes.DEBUG,
				debugInfo: { id, timestamp: Date.now() },
			} as DebugNodeData;

		default:
			return baseData as BaseNodeData;
	}
}

function getDefaultLabel(nodeType: NodeType): string {
	switch (nodeType) {
		case NodeTypes.OSCILLATOR:
			return 'Oscillator';
		case NodeTypes.GAIN:
			return 'Gain';
		case NodeTypes.FILTER:
			return 'Filter';
		case NodeTypes.DELAY:
			return 'Delay';
		case NodeTypes.BITCRUSHER:
			return 'Bit Crusher';
		case NodeTypes.NOISE_GENERATOR:
			return 'Noise Generator';
		case NodeTypes.AUDIO_INPUT:
			return 'Audio Input';
		case NodeTypes.AUDIO_OUTPUT:
			return 'Audio Output';
		case NodeTypes.SPECTROGRAM:
			return 'Spectrogram';
		case NodeTypes.OSCILLOSCOPE:
			return 'Oscilloscope';
		case NodeTypes.IMAGE_DISPLAY:
			return 'Image Display';
		case NodeTypes.GLOBAL_SETTINGS:
			return 'Global Settings';
		case NodeTypes.MIDI_INPUT_CONFIG:
			return 'MIDI Input Config';
		case NodeTypes.DATA_INPUT:
			return 'Data Input';
		case NodeTypes.DATA_VIEWER:
			return 'Data Viewer';
		case NodeTypes.DEBUG:
			return 'Debug';
		case NodeTypes.COMMENT:
			return 'Comment';
		default:
			return 'Unknown Node';
	}
}

function getDefaultDescription(nodeType: NodeType): string {
	switch (nodeType) {
		case NodeTypes.OSCILLATOR:
			return 'Generates audio waveforms';
		case NodeTypes.GAIN:
			return 'Controls signal amplitude';
		case NodeTypes.FILTER:
			return 'Filters audio frequencies';
		case NodeTypes.DELAY:
			return 'Adds delay to audio signal';
		case NodeTypes.BITCRUSHER:
			return 'Reduces audio bit depth';
		case NodeTypes.NOISE_GENERATOR:
			return 'Generates noise signals';
		case NodeTypes.AUDIO_INPUT:
			return 'Audio input source';
		case NodeTypes.AUDIO_OUTPUT:
			return 'Audio output destination';
		case NodeTypes.SPECTROGRAM:
			return 'Visual frequency analysis';
		case NodeTypes.OSCILLOSCOPE:
			return 'Visual waveform display';
		case NodeTypes.IMAGE_DISPLAY:
			return 'Displays images';
		case NodeTypes.GLOBAL_SETTINGS:
			return 'Global configuration';
		case NodeTypes.MIDI_INPUT_CONFIG:
			return 'MIDI input configuration';
		case NodeTypes.DATA_INPUT:
			return 'Data input source';
		case NodeTypes.DATA_VIEWER:
			return 'Data visualization';
		case NodeTypes.DEBUG:
			return 'Debug information display';
		case NodeTypes.COMMENT:
			return 'Comment or note';
		default:
			return 'Node description';
	}
}

export const NODE_REGISTRY_MAP: Record<string, NodeRegistration> = {
	oscillatorNode: {
		nodeTypeEnum: NodeTypes.OSCILLATOR,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.OSCILLATOR, id),
		displayName: 'Oscillator',
		category: 'audio',
	},
	gainNode: {
		nodeTypeEnum: NodeTypes.GAIN,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.GAIN, id),
		displayName: 'Gain',
		category: 'audio',
	},
	filterNode: {
		nodeTypeEnum: NodeTypes.FILTER,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.FILTER, id),
		displayName: 'Filter',
		category: 'audio',
	},
	delayNode: {
		nodeTypeEnum: NodeTypes.DELAY,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.DELAY, id),
		displayName: 'Delay',
		category: 'audio',
	},
	bitCrusherNode: {
		nodeTypeEnum: NodeTypes.BITCRUSHER,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.BITCRUSHER, id),
		displayName: 'Bit Crusher',
		category: 'audio',
	},
	noiseGeneratorNode: {
		nodeTypeEnum: NodeTypes.NOISE_GENERATOR,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeTypes.NOISE_GENERATOR, id),
		displayName: 'Noise Generator',
		category: 'audio',
	},
	audioInputNode: {
		nodeTypeEnum: NodeTypes.AUDIO_INPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.AUDIO_INPUT, id),
		displayName: 'Audio Input',
		category: 'audio',
	},
	audioOutputNode: {
		nodeTypeEnum: NodeTypes.AUDIO_OUTPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.AUDIO_OUTPUT, id),
		displayName: 'Audio Output',
		category: 'audio',
	},
	spectrogramNode: {
		nodeTypeEnum: NodeTypes.SPECTROGRAM,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.SPECTROGRAM, id),
		displayName: 'Spectrogram',
		category: 'visual',
	},
	oscilloscopeNode: {
		nodeTypeEnum: NodeTypes.OSCILLOSCOPE,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.OSCILLOSCOPE, id),
		displayName: 'Oscilloscope',
		category: 'visual',
	},
	imageDisplayNode: {
		nodeTypeEnum: NodeTypes.IMAGE_DISPLAY,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeTypes.IMAGE_DISPLAY, id),
		displayName: 'Image Display',
		category: 'visual',
	},
	globalSettingsNode: {
		nodeTypeEnum: NodeTypes.GLOBAL_SETTINGS,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeTypes.GLOBAL_SETTINGS, id),
		displayName: 'Global Settings',
		category: 'config',
	},
	midiInputConfigNode: {
		nodeTypeEnum: NodeTypes.MIDI_INPUT_CONFIG,
		defaultData: (id: string) =>
			getDefaultNodeData(NodeTypes.MIDI_INPUT_CONFIG, id),
		displayName: 'MIDI Input Config',
		category: 'config',
	},
	dataInputNode: {
		nodeTypeEnum: NodeTypes.DATA_INPUT,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.DATA_INPUT, id),
		displayName: 'Data Input',
		category: 'data',
	},
	dataViewerNode: {
		nodeTypeEnum: NodeTypes.DATA_VIEWER,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.DATA_VIEWER, id),
		displayName: 'Data Viewer',
		category: 'data',
	},
	debugNode: {
		nodeTypeEnum: NodeTypes.DEBUG,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.DEBUG, id),
		displayName: 'Debug',
		category: 'utility',
	},
	commentNode: {
		nodeTypeEnum: NodeTypes.COMMENT,
		defaultData: (id: string) => getDefaultNodeData(NodeTypes.COMMENT, id),
		displayName: 'Comment',
		category: 'utility',
	},
};

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
