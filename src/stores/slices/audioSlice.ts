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

export interface AudioNodeData {
	id: string;
	type: 'oscillator' | 'gain' | 'analyser' | 'visualizer' | 'destination';
	params: OscillatorParams | GainParams | AnalyserParams;
}

export interface AudioConnection {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	sourceHandle: string;
	targetHandle: string;
}

export interface TransportState {
	isPlaying: boolean;
	bpm: number;
	position: string;
	loopStart: string;
	loopEnd: string;
	loop: boolean;
}

export interface AudioSlice {
	// State
	audioNodes: { [nodeId: string]: AudioNodeData };
	audioConnections: AudioConnection[];
	transport: TransportState;
	audioContext: {
		isStarted: boolean;
		state: string;
	};

	// Audio Node Actions
	addAudioNode: (
		nodeId: string,
		type: 'oscillator' | 'gain' | 'analyser',
		params: OscillatorParams | GainParams | AnalyserParams
	) => void;
	updateAudioNode: (
		nodeId: string,
		params: Partial<OscillatorParams | GainParams | AnalyserParams>
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

	// Transport Actions
	startTransport: () => void;
	stopTransport: () => void;
	pauseTransport: () => void;
	setBPM: (bpm: number) => void;
	setTransportPosition: (position: string) => void;

	// Audio Context Actions
	initializeAudioContext: () => Promise<void>;
}

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (
	set
) => ({
	// Initial state
	audioNodes: {},
	audioConnections: [],
	transport: {
		isPlaying: false,
		bpm: 120,
		position: '0:0:0',
		loopStart: '0:0:0',
		loopEnd: '4:0:0',
		loop: false,
	},
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

	// Transport Actions
	startTransport: () => {
		Tone.getTransport().start();
		set((state) => ({
			transport: {
				...state.transport,
				isPlaying: true,
			},
		}));
		console.log('▶️ Transport started');
	},

	stopTransport: () => {
		Tone.getTransport().stop();
		set((state) => ({
			transport: {
				...state.transport,
				isPlaying: false,
				position: '0:0:0',
			},
		}));
		console.log('⏹️ Transport stopped');
	},

	pauseTransport: () => {
		Tone.getTransport().pause();
		set((state) => ({
			transport: {
				...state.transport,
				isPlaying: false,
			},
		}));
		console.log('⏸️ Transport paused');
	},

	setBPM: (bpm) => {
		Tone.getTransport().bpm.value = bpm;
		set((state) => ({
			transport: {
				...state.transport,
				bpm,
			},
		}));
		console.log(`🎼 BPM set to ${bpm}`);
	},

	setTransportPosition: (position) => {
		Tone.getTransport().position = position;
		set((state) => ({
			transport: {
				...state.transport,
				position,
			},
		}));
	},

	// Audio Context Actions
	initializeAudioContext: async () => {
		try {
			if (Tone.getContext().state !== 'running') {
				await Tone.start();
				console.log('🎧 Audio context started');
			}

			set(() => ({
				audioContext: {
					isStarted: true,
					state: Tone.getContext().state,
				},
			}));
		} catch (error) {
			console.error('🚨 Failed to start audio context:', error);
		}
	},
});
