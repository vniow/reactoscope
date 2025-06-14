import type { StateCreator } from 'zustand';
import type { Edge } from '@xyflow/react';
import * as Tone from 'tone';

// Audio node parameter types
export interface OscillatorParams {
	frequency: number;
	detune: number;
	waveType: 'sine' | 'square' | 'triangle' | 'sawtooth';
	isPlaying: boolean;
	volume?: number;
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

export interface CoordinateAudioWorkletParams {
	axis: 'x' | 'y';
	gain: number;
	frequency: number;
	bufferSize: number;
	isReady: boolean;
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
		| 'delay-worklet'
		| 'coordinate-audio-worklet';
	params:
		| OscillatorParams
		| GainParams
		| AnalyserParams
		| NoiseWorkletParams
		| BitCrusherWorkletParams
		| DelayWorkletParams
		| CoordinateAudioWorkletParams;
	// UNIFIED INSTANCE STORAGE - TYPE-AGNOSTIC APPROACH:
	// Store Tone.js instances directly in Zustand for unified state management.
	// This enables type-agnostic connection logic that doesn't need to know about specific node types.
	instance?: Tone.ToneAudioNode;
	// For nodes that have multiple instances (e.g., analyser X/Y channels)
	instances?: { [key: string]: Tone.ToneAudioNode };
}

export interface AudioConnection {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	sourceHandle: string;
	targetHandle: string;
	// Enhanced connection state tracking
	status: 'connected' | 'disconnected' | 'error' | 'pending';
	createdAt: number;
	lastError?: string;
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
			| 'delay-worklet'
			| 'coordinate-audio-worklet',
		params:
			| OscillatorParams
			| GainParams
			| AnalyserParams
			| NoiseWorkletParams
			| BitCrusherWorkletParams
			| DelayWorkletParams
			| CoordinateAudioWorkletParams
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
			| CoordinateAudioWorkletParams
		>
	) => void;

	// New actions for managing Tone.js instances
	setAudioNodeInstance: (
		nodeId: string,
		instance: Tone.ToneAudioNode,
		key?: string // Optional key for multiple instances (e.g., X/Y channels)
	) => void;

	removeAudioNodeInstance: (
		nodeId: string,
		key?: string // Optional key for multiple instances
	) => void;

	getAudioNodeInstance: (
		nodeId: string,
		key?: string
	) => Tone.ToneAudioNode | undefined;
	removeAudioNode: (nodeId: string) => void;

	// Audio Connection Actions
	connectAudioNodes: (
		sourceId: string,
		targetId: string,
		sourceHandle: string,
		targetHandle: string
	) => void;
	disconnectAudioNodes: (connectionId: string) => void;
	updateConnectionStatus: (
		connectionId: string,
		status: AudioConnection['status'],
		error?: string
	) => void;

	// Centralized connection management
	establishAllConnections: () => void;
	syncWithReactFlowEdges: (edges: Edge[]) => void;

	// Audio Context Actions
	initializeAudioContext: () => Promise<void>;
}

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (
	set,
	get
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
		// console.log(`🎵 Added audio node ${nodeId} with type ${type}`);
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
		// console.log(`🎛️ Updated audio node ${nodeId}:`, params);
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

	// New actions for managing Tone.js instances
	setAudioNodeInstance: (nodeId, instance, key) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				console.warn(`🚨 Audio node ${nodeId} not found for instance update`);
				return state;
			}

			if (key) {
				// Multiple instances (e.g., X/Y channels for analyser)
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instances: {
								...existingNode.instances,
								[key]: instance,
							},
						},
					},
				};
			} else {
				// Single instance
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instance,
						},
					},
				};
			}
		});
	},

	removeAudioNodeInstance: (nodeId, key) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				return state;
			}

			if (key && existingNode.instances) {
				// Remove specific instance
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [key]: _, ...remainingInstances } = existingNode.instances;
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instances: remainingInstances,
						},
					},
				};
			} else {
				// Remove single instance
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instance: undefined,
						},
					},
				};
			}
		});
	},

	getAudioNodeInstance: (nodeId, key) => {
		const node = get().audioNodes[nodeId];
		if (!node) return undefined;

		if (key && node.instances) {
			return node.instances[key];
		}
		return node.instance;
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
					status: 'pending' as const,
					createdAt: Date.now(),
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

	updateConnectionStatus: (connectionId, status, error) => {
		set((state) => ({
			audioConnections: state.audioConnections.map((conn) =>
				conn.id === connectionId ? { ...conn, status, lastError: error } : conn
			),
		}));
	},

	establishAllConnections: () => {
		const state = get();

		state.audioConnections.forEach((connection) => {
			const sourceNode = state.audioNodes[connection.sourceNodeId];
			const targetNode = state.audioNodes[connection.targetNodeId];

			if (!sourceNode || !targetNode) {
				get().updateConnectionStatus(connection.id, 'error', 'Node not found');
				return;
			}

			// Get source instance
			const sourceInstance = sourceNode.instance;
			if (!sourceInstance) {
				get().updateConnectionStatus(
					connection.id,
					'error',
					'Source instance not found'
				);
				return;
			}

			// Get target instance (with multi-instance support)
			let targetInstance;
			if (targetNode.instances && connection.targetHandle) {
				const channelMatch = connection.targetHandle.match(/audio-in-(.+)$/);
				const channel = channelMatch ? channelMatch[1] : 'default';
				targetInstance = targetNode.instances[channel];
			} else {
				targetInstance = targetNode.instance;
			}

			if (!targetInstance) {
				get().updateConnectionStatus(
					connection.id,
					'error',
					'Target instance not found'
				);
				return;
			}

			// Establish the connection
			try {
				sourceInstance.connect(targetInstance);
				get().updateConnectionStatus(connection.id, 'connected');
				console.log(`✅ Connected ${sourceNode.type} -> ${targetNode.type}`);
			} catch (error) {
				get().updateConnectionStatus(
					connection.id,
					'error',
					error instanceof Error ? error.message : 'Connection failed'
				);
				console.error('Failed to connect audio nodes:', error);
			}
		});
	},

	syncWithReactFlowEdges: (edges) => {
		const state = get();
		const currentConnections = new Set(state.audioConnections.map((c) => c.id));
		const edgeConnections = new Set(
			edges.map(
				(edge) =>
					`${edge.source}-${edge.target}-${edge.sourceHandle || 'audio-out'}-${edge.targetHandle || 'audio-in'}`
			)
		);

		// Remove connections that no longer exist in React Flow
		const connectionsToRemove = [...currentConnections].filter(
			(id) => !edgeConnections.has(id)
		);
		connectionsToRemove.forEach((connectionId) => {
			// Disconnect the actual Tone.js connection
			const connection = state.audioConnections.find(
				(c) => c.id === connectionId
			);
			if (connection) {
				const sourceNode = state.audioNodes[connection.sourceNodeId];
				const targetNode = state.audioNodes[connection.targetNodeId];

				if (sourceNode?.instance && targetNode) {
					try {
						let targetInstance;
						if (targetNode.instances && connection.targetHandle) {
							const channelMatch =
								connection.targetHandle.match(/audio-in-(.+)$/);
							const channel = channelMatch ? channelMatch[1] : 'default';
							targetInstance = targetNode.instances[channel];
						} else {
							targetInstance = targetNode.instance;
						}

						if (targetInstance) {
							sourceNode.instance.disconnect(targetInstance);
						}
					} catch (error) {
						console.error('Failed to disconnect:', error);
					}
				}
			}

			get().disconnectAudioNodes(connectionId);
		});

		// Add new connections from React Flow
		const connectionsToAdd = [...edgeConnections].filter(
			(id) => !currentConnections.has(id)
		);
		connectionsToAdd.forEach((connectionId) => {
			const edge = edges.find(
				(e) =>
					`${e.source}-${e.target}-${e.sourceHandle || 'audio-out'}-${e.targetHandle || 'audio-in'}` ===
					connectionId
			);
			if (edge) {
				get().connectAudioNodes(
					edge.source,
					edge.target,
					edge.sourceHandle || 'audio-out',
					edge.targetHandle || 'audio-in'
				);
			}
		});

		// Establish all connections
		get().establishAllConnections();
	},

	// Audio Context Actions
	initializeAudioContext: async () => {
		// console.log('🎧 Initializing audio context...');
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
				// console.log('🎧 Audio context already running');
			}

			set(() => ({
				audioContext: {
					isStarted: true, // Mark as initialized
					state: Tone.getContext().state,
				},
			}));

			// console.log('🎧 Audio context initialization complete');
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
