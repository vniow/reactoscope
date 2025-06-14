import type { StateCreator } from 'zustand';
import * as Tone from 'tone';

// Audio node parameter types
export interface OscillatorParams {
	frequency: number;
	detune: number;
	waveType: 'sine' | 'square' | 'triangle' | 'sawtooth';
	isPlaying: boolean;
	volume: number;
}

export interface GainParams {
	gain: number; // Gain value (0.0 - 2.0, where 1.0 is unity gain)
	mute: boolean;
}

export interface AnalyserParams {
	size: number; // FFT size (default: 1024)
	smoothing: number; // Time smoothing (0-1)
	isConnected: boolean;
}

// Worklet parameter types
export interface NoiseWorkletParams {
	isPlaying: boolean;
	volume: number;
}

export interface BitCrusherWorkletParams {
	bits: number;
	wet: number;
}

export interface DelayWorkletParams {
	delayTime: number;
	feedback: number;
	wet: number;
}

export interface AudioNodeData {
	id: string;
	type:
		| 'oscillator'
		| 'gain'
		| 'analyser'
		| 'visualizer'
		| 'destination'
		| 'noise-worklet'
		| 'bitcrusher-worklet'
		| 'delay-worklet';
	params:
		| OscillatorParams
		| GainParams
		| AnalyserParams
		| NoiseWorkletParams
		| BitCrusherWorkletParams
		| DelayWorkletParams;
}

export interface AudioConnection {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	sourceHandle: string;
	targetHandle: string;
}

export interface AudioSlice {
	// State
	audioNodes: { [nodeId: string]: AudioNodeData };
	audioConnections: AudioConnection[];
	audioContext: {
		isStarted: boolean;
		state: string;
	};

	// Audio Node Actions
	addAudioNode: (
		nodeId: string,
		type:
			| 'oscillator'
			| 'gain'
			| 'analyser'
			| 'visualizer'
			| 'noise-worklet'
			| 'bitcrusher-worklet'
			| 'delay-worklet',
		params:
			| OscillatorParams
			| GainParams
			| AnalyserParams
			| NoiseWorkletParams
			| BitCrusherWorkletParams
			| DelayWorkletParams
	) => void;
	updateAudioNode: (
		nodeId: string,
		params: Partial<
			| OscillatorParams
			| GainParams
			| AnalyserParams
			| NoiseWorkletParams
			| BitCrusherWorkletParams
			| DelayWorkletParams
		>
	) => void;
	removeAudioNode: (nodeId: string) => void;

	// Audio Connection Actions
	connectAudioNodes: (
		sourceId: string,
		targetId: string,
		sourceHandle: string,
		targetHandle: string
	) => void;
	disconnectAudioNodes: (connectionId: string) => void;

	// Audio Context Actions
	initializeAudioContext: () => Promise<void>;
}

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (
	set
) => ({
	// Initial state
	audioNodes: {},
	audioConnections: [],
	audioContext: {
		isStarted: false,
		state: 'suspended',
	},

	// Audio Node Actions
	addAudioNode: (nodeId, type, params) => {
		set((state) => ({
			audioNodes: {
				...state.audioNodes,
				[nodeId]: {
					id: nodeId,
					type,
					params,
				},
			},
		}));
		console.log(`🎵 Added audio node ${nodeId} with type ${type}`);
	},

	updateAudioNode: (nodeId, params) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				console.warn(`🚨 Audio node ${nodeId} not found for update`);
				return state;
			}

			return {
				audioNodes: {
					...state.audioNodes,
					[nodeId]: {
						...existingNode,
						params: {
							...existingNode.params,
							...params,
						},
					},
				},
			};
		});
		console.log(`🎛️ Updated audio node ${nodeId}:`, params);
	},

	removeAudioNode: (nodeId) => {
		set((state) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeId]: _, ...remainingNodes } = state.audioNodes;

			// Also remove any connections involving this node
			const filteredConnections = state.audioConnections.filter(
				(conn) => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
			);

			return {
				audioNodes: remainingNodes,
				audioConnections: filteredConnections,
			};
		});
		console.log(`🗑️ Removed audio node ${nodeId}`);
	},

	// Audio Connection Actions
	connectAudioNodes: (sourceId, targetId, sourceHandle, targetHandle) => {
		const connectionId = `${sourceId}-${targetId}-${sourceHandle}-${targetHandle}`;

		set((state) => ({
			audioConnections: [
				...state.audioConnections,
				{
					id: connectionId,
					sourceNodeId: sourceId,
					targetNodeId: targetId,
					sourceHandle,
					targetHandle,
				},
			],
		}));
		console.log(`🔌 Connected audio nodes: ${sourceId} -> ${targetId}`);
	},

	disconnectAudioNodes: (connectionId) => {
		set((state) => ({
			audioConnections: state.audioConnections.filter(
				(conn) => conn.id !== connectionId
			),
		}));
		console.log(`🔌 Disconnected audio connection: ${connectionId}`);
	},

	// Audio Context Actions
	initializeAudioContext: async () => {
		console.log('🎧 Initializing audio context...');
		try {
			if (Tone.getContext().state !== 'running') {
				console.log(
					'🎧 Audio context not running, creating instances without starting...'
				);
				// Don't await Tone.start() during initialization
				// Just prepare the context and create instances
				console.log(
					'🎧 Audio context prepared (will start on user interaction)'
				);
			} else {
				console.log('🎧 Audio context already running');
			}

			set(() => ({
				audioContext: {
					isStarted: true, // Mark as initialized
					state: Tone.getContext().state,
				},
			}));

			console.log('🎧 Audio context initialization complete');
		} catch (error) {
			console.error('🚨 Failed to initialize audio context:', error);
			set(() => ({
				audioContext: {
					isStarted: false,
					state: 'suspended',
				},
			}));
		}
	},
});
