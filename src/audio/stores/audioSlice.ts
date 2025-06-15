import type { StateCreator } from 'zustand';
import type { Edge } from '@xyflow/react';
import * as Tone from 'tone';
import type { WaveType } from '../hooks/useToneOscillator';

// --- Audio Node Parameter Types ---

/**
 * Parameters for an Oscillator audio node.
 * Defines settings like frequency, detune, wave type, and playback state.
 */
export interface OscillatorParams {
	readonly frequency: number;
	readonly detune: number;
	readonly waveType: WaveType;
	readonly isPlaying: boolean;
	readonly volume?: number; // Optional: Volume in decibels or linear gain
}

/**
 * Parameters for a Gain audio node.
 * Defines settings for adjusting signal amplitude.
 */
export interface GainParams {
	readonly gain: number; // Gain value (e.g., 0.0 to 2.0, where 1.0 is unity gain)
	readonly mute: boolean; // Whether the gain node is muted
}

/**
 * Parameters for an Analyser audio node.
 * Defines settings for frequency and waveform analysis.
 */
export interface AnalyserParams {
	readonly size: number; // FFT size (e.g., 1024, 2048). Must be a power of 2.
	readonly smoothing: number; // Time smoothing factor (0 to 1)
	readonly isConnected: boolean; // Indicates if the analyser is actively processing audio
}

// --- Worklet Parameter Types ---

/**
 * Parameters for a NoiseWorklet audio node.
 * Defines settings for generating noise.
 */
export interface NoiseWorkletParams {
	readonly isPlaying: boolean;
	readonly volume: number; // Linear gain value (0 to 1)
}

/**
 * Parameters for a BitCrusherWorklet audio node.
 * Defines settings for bit crushing effect.
 */
export interface BitCrusherWorkletParams {
	readonly bits: number; // Number of bits for quantization (e.g., 1 to 16)
	readonly wet: number; // Mix between dry and wet signal (0 to 1)
}

/**
 * Parameters for a DelayWorklet audio node.
 * Defines settings for a delay effect.
 */
export interface DelayWorkletParams {
	readonly delayTime: number; // Delay time in seconds
	readonly feedback: number; // Feedback amount (0 to 1)
	readonly wet: number; // Mix between dry and wet signal (0 to 1)
}

/**
 * Parameters for a CoordinateAudioWorklet (e.g., for mouse/pointer interaction).
 * Defines settings for audio generation based on 2D coordinates.
 */
export interface CoordinateAudioWorkletParams {
	readonly axis: 'x' | 'y'; // The axis this worklet responds to
	readonly gain: number; // Output gain of the worklet
	readonly frequency: number; // Base frequency, potentially modulated by the axis
	readonly bufferSize: number; // Internal buffer size for the worklet
	readonly isReady: boolean; // Indicates if the worklet is initialized and ready
}

// --- Core Audio Slice Types ---

/**
 * Represents the distinct types of audio nodes available in the system.
 * This union type is used to categorize and manage different audio processing units.
 */
export type AudioNodeType =
	| 'oscillator'
	| 'gain'
	| 'analyser'
	| 'visualizer' // Represents a node dedicated to visualizing audio data
	| 'destination' // Represents the final audio output (e.g., speakers)
	| 'noise-worklet'
	| 'bitcrusher-worklet'
	| 'delay-worklet'
	| 'coordinate-audio-worklet';

/**
 * A union of all possible parameter types for the various audio nodes.
 * This allows for type-safe handling of node-specific parameters within the store.
 * Nodes without specific parameters (e.g., 'destination') can be represented by `Record<string, never>`
 * or a specific empty interface if they need a `params` object.
 */
export type AudioNodeParams =
	| OscillatorParams
	| GainParams
	| AnalyserParams
	| NoiseWorkletParams
	| BitCrusherWorkletParams
	| DelayWorkletParams
	| CoordinateAudioWorkletParams
	| Record<string, never>; // For nodes like 'destination' or 'visualizer' if they have no params

/**
 * Data structure for an audio node within the Zustand store.
 * It immutably holds the node's ID, type, parameters, and references
 * to its underlying Tone.js instance(s).
 */
export interface AudioNodeData {
	readonly id: string;
	readonly type: AudioNodeType;
	readonly params: AudioNodeParams;
	readonly instance?: Tone.ToneAudioNode; // For nodes with a single Tone.js instance
	readonly instances?: Readonly<{ [key: string]: Tone.ToneAudioNode }>; // For nodes with multiple instances (e.g., stereo analysers)
}

/**
 * Represents an audio connection between two nodes in the store.
 * This structure immutably stores details about the source and target of the connection,
 * its status, and metadata.
 */
export interface AudioConnection {
	readonly id: string;
	readonly sourceNodeId: string;
	readonly targetNodeId: string;
	readonly sourceHandle: string; // ID of the source handle (e.g., 'audio-out')
	readonly targetHandle: string; // ID of the target handle (e.g., 'audio-in', 'audio-in-left')
	readonly status: 'connected' | 'disconnected' | 'error' | 'pending';
	readonly createdAt: number; // Timestamp of creation (milliseconds since epoch)
	readonly lastError?: string; // Description of the last error if status is 'error'
}

/**
 * Defines the shape of the audio slice in the Zustand store.
 * It includes the immutable state for audio nodes, connections, and the audio context,
 * along with actions to manage this state.
 */
export interface AudioSlice {
	// --- State ---
	readonly audioNodes: Readonly<{ [nodeId: string]: AudioNodeData }>;
	readonly audioConnections: ReadonlyArray<AudioConnection>;
	readonly audioContext: Readonly<{
		isStarted: boolean; // Whether Tone.start() has been successfully called
		state: AudioContextState; // Current state of the AudioContext (e.g., 'running', 'suspended', 'closed')
	}>;

	// --- Getter ---
	getAudioNode: (nodeId: string) => AudioNodeData | undefined; // Added stable getter

	// --- Audio Node Actions ---

	/**
	 * Adds a new audio node to the store.
	 * @param nodeId - The unique identifier for the new node.
	 * @param type - The type of the audio node.
	 * @param params - The initial parameters for the node.
	 */
	addAudioNode: (
		nodeId: string,
		type: AudioNodeType,
		params: AudioNodeParams
	) => void;

	/**
	 * Updates the parameters of an existing audio node.
	 * @param nodeId - The ID of the node to update.
	 * @param params - A partial object of parameters to update.
	 */
	updateAudioNode: (nodeId: string, params: Partial<AudioNodeParams>) => void;

	/**
	 * Stores a Tone.js instance for an audio node.
	 * @param nodeId - The ID of the node.
	 * @param instance - The Tone.js audio instance.
	 * @param key - Optional key for nodes with multiple instances (e.g., 'left'/'right' channels).
	 */
	setAudioNodeInstance: (
		nodeId: string,
		instance: Tone.ToneAudioNode,
		key?: string
	) => void;

	/**
	 * Removes a Tone.js instance associated with an audio node.
	 * @param nodeId - The ID of the node.
	 * @param key - Optional key if removing one of multiple instances.
	 */
	removeAudioNodeInstance: (nodeId: string, key?: string) => void;

	/**
	 * Retrieves a Tone.js instance for an audio node.
	 * @param nodeId - The ID of the node.
	 * @param key - Optional key for nodes with multiple instances.
	 */
	getAudioNodeInstance: (
		nodeId: string,
		key?: string
	) => Tone.ToneAudioNode | undefined;

	/**
	 * Retrieves the parameters of an audio node.
	 * @param nodeId - The ID of the node.
	 * @returns The parameters of the audio node.
	 */
	getAudioNodeParams: (nodeId: string) => AudioNodeParams | undefined;

	/**
	 * Removes an audio node and its associated connections from the store.
	 * @param nodeId - The ID of the node to remove.
	 */
	removeAudioNode: (nodeId: string) => void;

	// --- Audio Connection Actions ---

	/**
	 * Creates a new audio connection between two nodes in the store.
	 * This action only updates the store; actual Tone.js connections are handled by `establishAllConnections`.
	 * @param sourceId - The ID of the source node.
	 * @param targetId - The ID of the target node.
	 * @param sourceHandle - The ID of the source handle.
	 * @param targetHandle - The ID of the target handle.
	 */
	connectAudioNodes: (
		sourceId: string,
		targetId: string,
		sourceHandle: string,
		targetHandle: string
	) => void;

	/**
	 * Removes an audio connection from the store.
	 * @param connectionId - The ID of the connection to remove.
	 */
	disconnectAudioNodes: (connectionId: string) => void;

	/**
	 * Updates the status of an audio connection.
	 * @param connectionId - The ID of the connection to update.
	 * @param status - The new status of the connection.
	 * @param error - Optional error message if the status is 'error'.
	 */
	updateConnectionStatus: (
		connectionId: string,
		status: AudioConnection['status'],
		error?: string
	) => void;

	// --- Centralized Connection Management ---

	/**
	 * Establishes all Tone.js connections based on the current `audioConnections` state.
	 * This should be called after any changes to nodes or connections that require
	 * updating the actual audio graph.
	 */
	establishAllConnections: () => void;

	/**
	 * Synchronizes the audio connections in the store with the edges from React Flow.
	 * It adds new connections, removes outdated ones, and then calls `establishAllConnections`.
	 * @param edges - An array of edges from the React Flow instance.
	 */
	syncWithReactFlowEdges: (edges: ReadonlyArray<Edge>) => void;

	// --- Audio Context Actions ---

	/**
	 * Initializes the Tone.js audio context.
	 * This typically involves calling `Tone.start()` to enable audio playback
	 * in response to user interaction.
	 * @returns A promise that resolves when the audio context is started or already running.
	 */
	initializeAudioContext: () => Promise<void>;
}

/**
 * Creates a unique and consistent identifier for an audio connection.
 * The ID is based on the source/target nodes and their respective handles.
 * @param sourceId - The ID of the source node.
 * @param sourceHandle - The ID of the source handle.
 * @param targetId - The ID of the target node.
 * @param targetHandle - The ID of the target handle.
 * @returns A string representing the unique connection ID.
 */
const createConnectionId = (
	sourceId: string,
	sourceHandle: string,
	targetId: string,
	targetHandle: string
): string => `${sourceId}_${sourceHandle}-${targetId}_${targetHandle}`;

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (
	set,
	get
) => ({
	// --- Initial State ---
	audioNodes: {},
	audioConnections: [],
	audioContext: {
		isStarted: false,
		state: 'suspended', // Initial state before Tone.start()
	},

	// --- Getter ---
	getAudioNode: (nodeId) => get().audioNodes[nodeId], // Implementation of stable getter

	// --- Audio Node Actions ---
	addAudioNode: (nodeId, type, params) => {
		set((state) => ({
			audioNodes: {
				...state.audioNodes,
				[nodeId]: {
					id: nodeId,
					type,
					params,
					// instance and instances are initially undefined
				},
			},
		}));
		// console.log(`🎵 Added audio node ${nodeId} of type ${type}`);
	},

	updateAudioNode: (nodeId, params) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				console.warn(`🚨 Audio node ${nodeId} not found for update.`);
				return state; // Return current state if node not found
			}

			const updatedNode: AudioNodeData = {
				...existingNode,
				params: {
					...existingNode.params,
					...params,
				} as AudioNodeParams, // Ensure the merged params are correctly typed
			};

			return {
				...state,
				audioNodes: {
					...state.audioNodes,
					[nodeId]: updatedNode,
				},
			};
		});
		// console.log(`🎛️ Updated audio node ${nodeId}:`, params);
	},

	removeAudioNode: (nodeId) => {
		set((state) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeId]: _removedNode, ...remainingNodes } = state.audioNodes;

			// Dispose Tone.js instances associated with the removed node
			const nodeToRemove = state.audioNodes[nodeId];
			if (nodeToRemove) {
				if (nodeToRemove.instance) {
					nodeToRemove.instance.dispose();
					// console.log(`🎧 Disposed instance for node ${nodeId}`);
				}
				if (nodeToRemove.instances) {
					Object.values(nodeToRemove.instances).forEach((inst) =>
						inst.dispose()
					);
					// console.log(`🎧 Disposed multiple instances for node ${nodeId}`);
				}
			}

			// Filter out connections involving the removed node
			const remainingConnections = state.audioConnections.filter(
				(conn) => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
			);

			return {
				audioNodes: remainingNodes,
				audioConnections: remainingConnections,
			};
		});
		// console.log(`🗑️ Removed audio node ${nodeId} and associated connections.`);
		get().establishAllConnections(); // Re-evaluate connections
	},

	setAudioNodeInstance: (nodeId, instance, key) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				console.warn(`🚨 Audio node ${nodeId} not found for setting instance.`);
				return state;
			}

			// Dispose existing instance if it's being overwritten (for single instance case)
			if (!key && existingNode.instance && existingNode.instance !== instance) {
				existingNode.instance.dispose();
				// console.log(`🎧 Disposed old instance for node ${nodeId} before setting new one.`);
			}
			// Dispose existing instance if it's being overwritten (for multi-instance case)
			if (
				key &&
				existingNode.instances &&
				existingNode.instances[key] &&
				existingNode.instances[key] !== instance
			) {
				existingNode.instances[key].dispose();
				// console.log(`🎧 Disposed old instance for node ${nodeId} (key: ${key}) before setting new one.`);
			}

			if (key) {
				// Handling multiple instances (e.g., for stereo analysers)
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
				// Handling a single instance
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instance: instance,
						},
					},
				};
			}
		});
		// console.log(`🔧 Set instance for node ${nodeId}${key ? ` (key: ${key})` : ''}`);
		get().establishAllConnections(); // Re-evaluate connections after instance update
	},

	removeAudioNodeInstance: (nodeId, key) => {
		set((state) => {
			const existingNode = state.audioNodes[nodeId];
			if (!existingNode) {
				// console.warn(`🚨 Audio node ${nodeId} not found for removing instance.`);
				return state;
			}

			// Attempt to dispose the instance before removing its reference
			let instanceToRemove: Tone.ToneAudioNode | undefined;

			if (key && existingNode.instances) {
				instanceToRemove = existingNode.instances[key];
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [key]: _, ...remainingInstances } = existingNode.instances;
				if (instanceToRemove) instanceToRemove.dispose();
				return {
					audioNodes: {
						...state.audioNodes,
						[nodeId]: {
							...existingNode,
							instances: remainingInstances,
						},
					},
				};
			} else if (!key && existingNode.instance) {
				instanceToRemove = existingNode.instance;
				if (instanceToRemove) instanceToRemove.dispose();
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
			return state; // No instance found to remove or key mismatch
		});
		// console.log(`🗑️ Removed instance for node ${nodeId}${key ? ` (key: ${key})` : ''}`);
		get().establishAllConnections(); // Re-evaluate connections after instance removal
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
		const connectionId = createConnectionId(
			sourceId,
			sourceHandle,
			targetId,
			targetHandle
		);

		// Avoid duplicate connections
		if (get().audioConnections.some((conn) => conn.id === connectionId)) {
			// console.log(`🔗 Connection ${connectionId} already exists.`);
			return;
		}

		set((state) => ({
			audioConnections: [
				...state.audioConnections,
				{
					id: connectionId,
					sourceNodeId: sourceId,
					targetNodeId: targetId,
					sourceHandle,
					targetHandle,
					status: 'pending', // Status will be updated by establishAllConnections
					createdAt: Date.now(),
				},
			],
		}));
		// console.log(`🔗 Added pending connection: ${connectionId}`);
		get().establishAllConnections(); // Attempt to establish the new connection
	},

	disconnectAudioNodes: (connectionId) => {
		const connection = get().audioConnections.find(
			(conn) => conn.id === connectionId
		);
		if (!connection) return;

		const sourceNode = get().audioNodes[connection.sourceNodeId];
		const targetNode = get().audioNodes[connection.targetNodeId];

		if (sourceNode && targetNode) {
			const sourceInstance = get().getAudioNodeInstance(
				connection.sourceNodeId
			); // Assuming source is single instance or handle specifies
			let targetInstance: Tone.ToneAudioNode | undefined;

			if (
				targetNode.type === 'analyser' &&
				targetNode.instances &&
				connection.targetHandle
			) {
				// Example: targetHandle could be 'audio-in-left' or 'audio-in-right'
				const channelKey = connection.targetHandle.startsWith('audio-in-')
					? connection.targetHandle.substring('audio-in-'.length)
					: 'default';
				targetInstance = get().getAudioNodeInstance(
					connection.targetNodeId,
					channelKey
				);
			} else if (targetNode.type === 'destination') {
				targetInstance = Tone.getDestination();
			} else {
				targetInstance = get().getAudioNodeInstance(connection.targetNodeId);
			}

			if (sourceInstance && targetInstance) {
				try {
					sourceInstance.disconnect(targetInstance);
					// console.log(`🔌 Disconnected Tone.js instances: ${sourceNode.type} -> ${targetNode.type}`);
				} catch (error) {
					console.error('🚨 Error disconnecting Tone.js instances:', error);
				}
			}
		}

		set((state) => ({
			audioConnections: state.audioConnections.filter(
				(conn) => conn.id !== connectionId
			),
		}));
		// console.log(`🔌 Removed connection from store: ${connectionId}`);
	},

	updateConnectionStatus: (connectionId, status, error) => {
		set((state) => ({
			audioConnections: state.audioConnections.map((conn) =>
				conn.id === connectionId ? { ...conn, status, lastError: error } : conn
			),
		}));
		// if (status === 'error') console.error(`🚦 Connection ${connectionId} status: ${status}, Error: ${error}`);
		// else console.log(`🚦 Connection ${connectionId} status: ${status}`);
	},

	establishAllConnections: () => {
		const {
			audioNodes,
			audioConnections,
			updateConnectionStatus,
			getAudioNodeInstance,
		} = get();

		audioConnections.forEach((connection) => {
			const sourceNodeData = audioNodes[connection.sourceNodeId];
			const targetNodeData = audioNodes[connection.targetNodeId];

			if (!sourceNodeData || !targetNodeData) {
				updateConnectionStatus(
					connection.id,
					'error',
					'Source or target node not found in store'
				);
				return;
			}

			const sourceInstance = getAudioNodeInstance(
				sourceNodeData.id /*, potentially a key from sourceHandle */
			);

			if (!sourceInstance) {
				updateConnectionStatus(
					connection.id,
					'error',
					`Source instance for ${sourceNodeData.type} (${sourceNodeData.id}) not found`
				);
				return;
			}

			// Determine the actual Tone.js target instance
			let targetInstance: Tone.ToneAudioNode | undefined; // Corrected type

			if (targetNodeData.type === 'destination') {
				targetInstance = Tone.getDestination();
			} else if (targetNodeData.instances && connection.targetHandle) {
				const handleKey = connection.targetHandle.startsWith('audio-in-')
					? connection.targetHandle.substring('audio-in-'.length)
					: connection.targetHandle;
				targetInstance = getAudioNodeInstance(targetNodeData.id, handleKey);
			} else {
				targetInstance = getAudioNodeInstance(targetNodeData.id);
			}

			if (!targetInstance) {
				updateConnectionStatus(
					connection.id,
					'error',
					`Target instance for ${targetNodeData.type} (${targetNodeData.id}) not found (handle: ${connection.targetHandle})`
				);
				return;
			}

			// Establish the connection
			try {
				// The @ts-expect-error might still be needed if Tone.js types are not perfectly aligned for all connect scenarios (e.g. connecting to an AudioParam directly)
				// @ts-expect-error Tone.js connect can take AudioParam, but types might not fully align for all nodes.
				sourceInstance.connect(targetInstance);
				updateConnectionStatus(connection.id, 'connected');
				// console.log(`✅ Connected: ${sourceNodeData.type} (${connection.sourceHandle}) -> ${targetNodeData.type} (${connection.targetHandle})`);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown connection error';
				updateConnectionStatus(connection.id, 'error', errorMessage);
				console.error(
					`🚨 Failed to connect ${sourceNodeData.type} to ${targetNodeData.type}:`,
					errorMessage
				);
			}
		});
	},

	syncWithReactFlowEdges: (edges) => {
		const { audioConnections, connectAudioNodes, disconnectAudioNodes } = get(); // Removed unused establishAllConnections
		const currentConnectionIds = new Set(audioConnections.map((c) => c.id));

		const reactFlowEdgeIds = new Set(
			edges.map((edge) =>
				createConnectionId(
					edge.source,
					edge.sourceHandle || 'audio-out', // Default source handle
					edge.target,
					edge.targetHandle || 'audio-in' // Default target handle
				)
			)
		);

		// Remove connections that are in store but not in React Flow edges
		audioConnections.forEach((conn) => {
			if (!reactFlowEdgeIds.has(conn.id)) {
				disconnectAudioNodes(conn.id);
			}
		});

		// Add connections that are in React Flow edges but not in store
		edges.forEach((edge) => {
			const edgeId = createConnectionId(
				edge.source,
				edge.sourceHandle || 'audio-out',
				edge.target,
				edge.targetHandle || 'audio-in'
			);
			if (!currentConnectionIds.has(edgeId)) {
				connectAudioNodes(
					edge.source,
					edge.target,
					edge.sourceHandle || 'audio-out',
					edge.targetHandle || 'audio-in'
				);
			}
		});
		// establishAllConnections(); // connectAudioNodes already calls this, so it's not needed here.
	},

	// Audio Context Actions
	initializeAudioContext: async () => {
		// console.log('🎧 Initializing audio context check...');
		if (Tone.getContext().state === 'running') {
			// console.log('🎧 Audio context already running.');
			set(() => ({
				audioContext: { isStarted: true, state: 'running' },
			}));
			return;
		}

		try {
			// console.log('🎧 Attempting to start Tone.js audio context...');
			await Tone.start();
			// console.log('🎧 Tone.js audio context started successfully.');
			set(() => ({
				audioContext: { isStarted: true, state: Tone.getContext().state },
			}));
		} catch (error) {
			console.error('🚨 Failed to initialize Tone.js audio context:', error);
			set(() => ({
				audioContext: { isStarted: false, state: 'suspended' }, // Or 'closed' depending on error
			}));
		}
	},
});
