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
	{
		type: 'debug-simple' as AppNode['type'],
		name: 'Debug Simple Node',
		description: 'Minimal unstyled debug node',
		emoji: '🐞',
		variant: 'unit',
		category: 'debug',
		defaultData: {},
	},
];

// Audio source nodes
export const SOURCE_NODES: NodeTypeOption[] = [
	{
		type: 'source' as AppNode['type'],
		name: 'Oscillator',
		description:
			'Basic waveform generator with frequency, type, and volume controls',
		emoji: '🌊',
		variant: 'source',
		category: 'placeholder',
		defaultData: {
			label: 'Oscillator',
			frequency: 440,
			waveType: 'sine',
			detune: 0,
			volume: -12,
			audioParams: {
				frequency: 440,
				type: 'sine',
				detune: 0,
				volume: -12,
			},
		},
	},
	{
		type: 'source-player' as AppNode['type'],
		name: 'Audio Player',
		description: 'Audio file player with loop and playback rate controls',
		emoji: '🎵',
		variant: 'source',
		category: 'placeholder',
		defaultData: {
			label: 'Audio Player',
			url: '',
			loop: false,
			volume: 0,
			playbackRate: 1,
			audioParams: {
				url: '',
				loop: false,
				volume: 0,
				playbackRate: 1,
			},
		},
	},
	{
		type: 'source-noise' as AppNode['type'],
		name: 'Noise Generator',
		description:
			'AudioWorklet-based white noise generator with amplitude control',
		emoji: '🌪️',
		variant: 'source',
		category: 'placeholder',
		defaultData: {
			label: 'Noise Generator',
			amplitude: 0.5,
			isPlaying: false,
			nodeType: 'custom-worklet',
			workletType: 'noise-generator',
		},
	},
	{
		type: 'source-microphone' as AppNode['type'],
		name: 'Microphone',
		description: 'Audio input from microphone or line input',
		emoji: '🎤',
		variant: 'source',
		category: 'placeholder',
		defaultData: {
			label: 'Microphone',
			volume: 0,
			audioParams: {
				volume: 0,
			},
		},
	},
	{
		type: 'source-xyrgb' as AppNode['type'],
		name: 'XYRGB Generator',
		description: 'Generate XYRGB audio signals from 3D scene vertex data',
		emoji: '🎨',
		variant: 'source',
		category: 'utility',
		defaultData: {
			label: 'XYRGB Generator',
			scanRate: 30,
			rotationSpeed: 1.0,
			audioParams: {
				scanRate: 30,
				rotationSpeed: 1.0,
			},
		},
	},
];

// Audio effect nodes
export const EFFECT_NODES: NodeTypeOption[] = [
	{
		type: 'effect',
		name: 'BitCrusher',
		description: 'Lo-fi bit reduction and sample rate crushing effect',
		emoji: '🔩',
		variant: 'effect',
		category: 'utility',
		defaultData: {
			label: 'BitCrusher',
			bits: 8,
			sampleRate: 8000,
			wet: 1.0,
			audioParams: {
				bits: 8,
				sampleRate: 8000,
				wet: 1.0,
			},
		},
	},
	{
		type: 'effect',
		name: 'Filter',
		description: 'Lowpass, highpass, bandpass, and notch filters',
		emoji: '🔊',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Filter',
			frequency: 1000,
			type: 'lowpass',
			Q: 1,
			gain: 0,
			audioParams: {
				frequency: 1000,
				type: 'lowpass',
				Q: 1,
				gain: 0,
			},
		},
	},
	{
		type: 'effect',
		name: 'Delay',
		description: 'Echo and delay effect with feedback control',
		emoji: '🔁',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Delay',
			delayTime: 0.25,
			feedback: 0.5,
			wet: 0.5,
			audioParams: {
				delayTime: 0.25,
				feedback: 0.5,
				wet: 0.5,
			},
		},
	},
	{
		type: 'effect',
		name: 'Reverb',
		description: 'Room and hall reverb with adjustable decay',
		emoji: '🏛️',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Reverb',
			decay: 1.5,
			preDelay: 0.01,
			wet: 0.3,
			audioParams: {
				decay: 1.5,
				preDelay: 0.01,
				wet: 0.3,
			},
		},
	},
	{
		type: 'effect',
		name: 'Compressor',
		description: 'Dynamic range compressor with threshold and ratio',
		emoji: '📉',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Compressor',
			threshold: -24,
			ratio: 4,
			attack: 0.003,
			release: 0.1,
			knee: 6,
			audioParams: {
				threshold: -24,
				ratio: 4,
				attack: 0.003,
				release: 0.1,
				knee: 6,
			},
		},
	},
	{
		type: 'effect',
		name: 'Distortion',
		description: 'Harmonic distortion and overdrive effect',
		emoji: '⚡',
		variant: 'effect',
		category: 'placeholder',
		defaultData: {
			label: 'Distortion',
			distortion: 0.4,
			oversample: '4x',
			audioParams: {
				distortion: 0.4,
				oversample: '4x',
			},
		},
	},
];

// Signal component nodes
export const COMPONENT_NODES: NodeTypeOption[] = [
	{
		type: 'component-xyrgb-merge',
		name: 'XYRGB Merge',
		description:
			'Merge 5 mono channels (X, Y, R, G, B) into a single 5-channel output',
		emoji: '🔀',
		variant: 'component',
		category: 'utility',
		defaultData: {
			label: 'XYRGB Merge',
		},
	},
	{
		type: 'component',
		name: 'Gain',
		description: 'Volume and gain control for audio signals',
		emoji: '🔈',
		variant: 'component',
		category: 'placeholder',
		defaultData: {
			label: 'Gain',
			gain: 1,
			audioParams: {
				gain: 1,
			},
		},
	},
	{
		type: 'component',
		name: 'Dual Gain',
		description: 'Two independent gain controls for dual-channel processing',
		emoji: '🎚️',
		variant: 'component',
		category: 'utility',
		defaultData: {
			label: 'Dual Gain',
			gain1: 1,
			gain2: 1,
			audioParams: {
				gain1: 1,
				gain2: 1,
			},
		},
	},
	{
		type: 'component',
		name: 'Panner',
		description: 'Stereo panning control for positioning audio',
		emoji: '🎚️',
		variant: 'component',
		category: 'placeholder',
		defaultData: {
			label: 'Panner',
			pan: 0,
			audioParams: {
				pan: 0,
			},
		},
	},
	{
		type: 'component',
		name: 'Envelope',
		description: 'ADSR envelope generator for modulation',
		emoji: '📈',
		variant: 'component',
		category: 'placeholder',
		defaultData: {
			label: 'Envelope',
			attack: 0.01,
			decay: 0.1,
			sustain: 0.8,
			release: 0.3,
			audioParams: {
				attack: 0.01,
				decay: 0.1,
				sustain: 0.8,
				release: 0.3,
			},
		},
	},
	{
		type: 'component',
		name: 'LFO',
		description: 'Low frequency oscillator for modulation',
		emoji: '🌀',
		variant: 'component',
		category: 'placeholder',
		defaultData: {
			label: 'LFO',
			frequency: 1,
			type: 'sine',
			min: 0,
			max: 1,
			audioParams: {
				frequency: 1,
				type: 'sine',
				min: 0,
				max: 1,
			},
		},
	},
];

// Placeholder nodes for variants without specific implementations
export const PLACEHOLDER_NODES: NodeTypeOption[] = [
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

// Signal analyzer and meter nodes
export const SIGNAL_NODES: NodeTypeOption[] = [
	{
		type: 'signal',
		name: 'Analyzer',
		description: 'FFT spectrum analyzer for frequency visualization',
		emoji: '📊',
		variant: 'signal',
		category: 'placeholder',
		defaultData: {
			label: 'Analyzer',
			type: 'fft',
			size: 1024,
			audioParams: {
				type: 'fft',
				size: 1024,
			},
		},
	},
	{
		type: 'signal',
		name: 'Meter',
		description: 'Level meter for monitoring audio amplitude',
		emoji: '📏',
		variant: 'signal',
		category: 'placeholder',
		defaultData: {
			label: 'Meter',
			smoothing: 0.8,
			audioParams: {
				smoothing: 0.8,
			},
		},
	},
	{
		type: 'signal-3d',
		name: '3D Oscilloscope',
		description: 'Interactive 3D waveform visualization with camera controls',
		emoji: '🔮',
		variant: 'signal',
		category: 'utility',
		defaultData: {
			label: '3D Oscilloscope',
			timeWindow: 50,
			triggerLevel: 0,
			resolution: 256,
			audioParams: {
				timeWindow: 50,
				triggerLevel: 0,
				resolution: 256,
			},
		},
	},
	{
		type: 'signal-xy' as AppNode['type'],
		name: 'XYscope',
		description: 'Lissajous plot for dual-input XY visualization',
		emoji: '🎯',
		variant: 'signal',
		category: 'utility',
		defaultData: {
			label: 'XYscope',
			timeWindow: 0.1,
			resolution: 512,
			audioParams: {
				timeWindow: 0.1,
				resolution: 512,
			},
		},
	},
	{
		type: 'signal-xyrgb' as AppNode['type'],
		name: 'XYRGBScope',
		description:
			'5-channel audio-visual mapping with X,Y coordinates and R,G,B colors',
		emoji: '🌈',
		variant: 'signal',
		category: 'utility',
		defaultData: {
			label: 'XYRGBScope',
			timeWindow: 0.1,
			resolution: 512,
			audioParams: {
				timeWindow: 0.1,
				resolution: 512,
			},
		},
	},
	{
		type: 'signal-xyrgb-viz' as AppNode['type'],
		name: 'XYRGB Visualizer',
		description:
			'UI-only XYRGB visualizer with 3D scene and vertex traversal (no audio)',
		emoji: '🎨',
		variant: 'signal',
		category: 'utility',
		defaultData: {
			label: 'XYRGB Visualizer',
			scanRate: 30,
			rotationSpeed: 1.0,
			triangleScale: 1.0,
		},
	},
	{
		type: 'signal-woscope' as AppNode['type'],
		name: 'Woscope Visualizer',
		description: 'Classic XY oscilloscope visualization for stereo audio',
		emoji: '🧪',
		variant: 'signal',
		category: 'utility',
		defaultData: {
			label: 'Woscope Visualizer',
			lineColor: '#00ff00',
			lineThickness: 0.012,
			lineIntensity: 1.0,
			audioScale: 0.8,
		},
	},
];

// Core audio infrastructure nodes
export const CORE_NODES: NodeTypeOption[] = [
	{
		type: 'core',
		name: 'Master Output',
		description: 'Main audio output destination with master controls',
		emoji: '🎧',
		variant: 'core',
		category: 'placeholder',
		defaultData: {
			label: 'Master Output',
			volume: 0,
			audioParams: {
				volume: 0,
			},
		},
	},
];

// Utility nodes
export const UTILITY_NODES: NodeTypeOption[] = [
	// No utility nodes currently - file loader removed
];

// Combined list of all available nodes
export const ALL_NODES: NodeTypeOption[] = [
	...DEBUG_NODES,
	...CORE_NODES,
	...SOURCE_NODES,
	...EFFECT_NODES,
	...COMPONENT_NODES,
	...SIGNAL_NODES,
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
