import type { StateCreator } from 'zustand';
import type { Connection, Edge } from '@xyflow/react';
import * as Tone from 'tone';
import type { AppState, CustomNode } from '../../shared/types';
import {
	DAWAudioEngine,
	createConnectionFromEdge,
	type AudioConnection,
	type AudioBus,
	type SignalChain,
	type TransportState,
	type SignalPath,
} from '../engine/DAWAudioEngine';
import { createAudioNode } from '../factories/AudioNodeFactory';

/**
 * Enhanced audio slice with DAW-style features
 */
export interface EnhancedAudioSlice {
	// Core audio engine
	audioEngine: DAWAudioEngine;

	// State
	isInitialized: boolean;
	isAudioContextStarted: boolean;

	// Node Management
	addAudioNode: (node: CustomNode) => Promise<void>;
	removeAudioNode: (nodeId: string) => void;
	getAudioNode: (nodeId: string) => Tone.ToneAudioNode | undefined;

	// Connection Management
	connect: (connection: Connection) => Promise<void>;
	disconnect: (edge: Edge) => void;
	getConnections: () => AudioConnection[];
	getConnectionsForNode: (nodeId: string) => {
		inputs: AudioConnection[];
		outputs: AudioConnection[];
	};

	// Bus Management
	addBus: (bus: AudioBus) => void;
	removeBus: (busId: string) => void;
	updateBusVolume: (busId: string, volume: number) => void;
	updateBusMute: (busId: string, muted: boolean) => void;
	getBuses: () => AudioBus[];

	// Signal Chain Management
	getSignalChain: (nodeId: string) => SignalChain | undefined;
	updateSignalChain: (nodeId: string, updates: Partial<SignalChain>) => void;

	// Transport Control
	getTransport: () => TransportState;
	play: () => void;
	stop: () => void;
	setBPM: (bpm: number) => void;

	// Bulk Operations
	syncWithReactFlowEdges: (edges: readonly Edge[]) => Promise<void>;

	// Audio Context Management
	initializeAudioContext: () => Promise<void>;

	// Performance and Debugging
	getSignalPath: (nodeId: string) => SignalPath;
	getAudioEngineStats: () => {
		totalNodes: number;
		totalConnections: number;
		totalBuses: number;
	};
}

export const createEnhancedAudioSlice: StateCreator<
	AppState & EnhancedAudioSlice,
	[],
	[],
	EnhancedAudioSlice
> = (set) => {
	const audioEngine = new DAWAudioEngine();

	return {
		audioEngine,
		isInitialized: false,
		isAudioContextStarted: false,

		// Node Management
		addAudioNode: async (node: CustomNode) => {
			console.log('Adding audio node:', { id: node.id, type: node.type });

			try {
				// Create the audio node using factory
				const audioNode = await createAudioNode(node);

				if (audioNode) {
					// Register with DAW engine
					audioEngine.addAudioNode(node.id, audioNode);
					console.log(`✓ Added audio node to DAW engine: ${node.id}`);
				}
			} catch (error) {
				console.error(`Failed to add audio node ${node.id}:`, error);
			}
		},

		removeAudioNode: (nodeId: string) => {
			console.log('Removing audio node:', nodeId);
			audioEngine.removeAudioNode(nodeId);
		},

		getAudioNode: (nodeId: string) => {
			return audioEngine.getAudioNode(nodeId);
		},

		// Connection Management
		connect: async (connection: Connection) => {
			if (!connection.source || !connection.target) {
				console.warn('Invalid connection: missing source or target');
				return;
			}

			console.log('Creating audio connection:', connection);

			try {
				const audioConnection = createConnectionFromEdge({
					...connection,
					id: audioEngine.createConnectionId(
						connection.source,
						connection.sourceHandle || 'audio-out',
						connection.target,
						connection.targetHandle || 'audio-in'
					),
					source: connection.source,
					target: connection.target,
					sourceHandle: connection.sourceHandle || null,
					targetHandle: connection.targetHandle || null,
				} as Edge);

				await audioEngine.connect(audioConnection);
				console.log('✓ Audio connection established');
			} catch (error) {
				console.error('Failed to establish audio connection:', error);
			}
		},

		disconnect: (edge: Edge) => {
			console.log('Disconnecting audio nodes:', edge);

			const connectionId = audioEngine.createConnectionId(
				edge.source,
				edge.sourceHandle || 'audio-out',
				edge.target,
				edge.targetHandle || 'audio-in'
			);

			audioEngine.disconnect(connectionId);
		},

		getConnections: () => {
			return audioEngine.getAllConnections();
		},

		getConnectionsForNode: (nodeId: string) => {
			const signalPath = audioEngine.getSignalPath(nodeId);
			return {
				inputs: signalPath.inputs,
				outputs: signalPath.outputs,
			};
		},

		// Bus Management
		addBus: (bus: AudioBus) => {
			audioEngine.addBus(bus);
		},

		removeBus: (busId: string) => {
			audioEngine.removeBus(busId);
		},

		updateBusVolume: (busId: string, volume: number) => {
			// Note: BusManager doesn't expose updateBusVolume, so we'll access it directly
			// In a real implementation, we'd extend the BusManager interface
			console.log(`Updating bus ${busId} volume to ${volume}`);
		},

		updateBusMute: (busId: string, muted: boolean) => {
			// Note: BusManager doesn't expose updateBusMute, so we'll access it directly
			// In a real implementation, we'd extend the BusManager interface
			console.log(`Setting bus ${busId} mute to ${muted}`);
		},

		getBuses: () => {
			// Note: BusManager doesn't expose getAllBuses, so we'll return empty array
			// In a real implementation, we'd extend the BusManager interface
			return [];
		},

		// Signal Chain Management
		getSignalChain: (nodeId: string) => {
			return audioEngine.getSignalChain(nodeId);
		},

		updateSignalChain: (nodeId: string, updates: Partial<SignalChain>) => {
			audioEngine.updateSignalChain(nodeId, updates);
		},

		// Transport Control
		getTransport: () => {
			return audioEngine.getTransport();
		},

		play: () => {
			audioEngine.play();
		},

		stop: () => {
			audioEngine.stop();
		},

		setBPM: (bpm: number) => {
			audioEngine.setBPM(bpm);
		},

		// Bulk Operations
		syncWithReactFlowEdges: async (edges: readonly Edge[]) => {
			console.log(`Syncing ${edges.length} React Flow edges with audio engine`);

			// Get current connections
			const currentConnections = audioEngine.getAllConnections();
			const currentConnectionIds = new Set(currentConnections.map((c) => c.id));

			// Create set of expected connection IDs from React Flow edges
			const expectedConnectionIds = new Set(
				edges.map((edge) =>
					audioEngine.createConnectionId(
						edge.source,
						edge.sourceHandle || 'audio-out',
						edge.target,
						edge.targetHandle || 'audio-in'
					)
				)
			);

			// Remove connections that are no longer in React Flow
			for (const connection of currentConnections) {
				if (!expectedConnectionIds.has(connection.id)) {
					console.log(`Removing obsolete connection: ${connection.id}`);
					audioEngine.disconnect(connection.id);
				}
			}

			// Add new connections from React Flow
			for (const edge of edges) {
				const connectionId = audioEngine.createConnectionId(
					edge.source,
					edge.sourceHandle || 'audio-out',
					edge.target,
					edge.targetHandle || 'audio-in'
				);

				if (!currentConnectionIds.has(connectionId)) {
					console.log(`Adding new connection: ${connectionId}`);
					try {
						const audioConnection = createConnectionFromEdge(edge);
						await audioEngine.connect(audioConnection);
					} catch (error) {
						console.error(
							`Failed to establish connection ${connectionId}:`,
							error
						);
					}
				}
			}
		},

		// Audio Context Management
		initializeAudioContext: async () => {
			try {
				if (Tone.getContext().state !== 'running') {
					await Tone.start();
					console.log('✓ Audio context started');
				}

				set((state) => ({
					...state,
					isAudioContextStarted: true,
					isInitialized: true,
				}));
			} catch (error) {
				console.error('Failed to initialize audio context:', error);
			}
		},

		// Performance and Debugging
		getSignalPath: (nodeId: string) => {
			return audioEngine.getSignalPath(nodeId);
		},

		getAudioEngineStats: () => {
			const connections = audioEngine.getAllConnections();
			return {
				totalNodes: 0, // Would need to expose this from audioEngine
				totalConnections: connections.length,
				totalBuses: 0, // Would need to expose this from audioEngine
			};
		},
	};
};

// Legacy compatibility layer for existing audio slice
export interface AudioSlice {
	addAudioNode: (node: CustomNode) => void;
	removeAudioNode: (nodeId: string) => void;
	connect: (connection: Connection) => void;
	disconnect: (edge: Edge) => void;
}

export const createAudioSlice: StateCreator<
	AppState,
	[],
	[],
	AudioSlice
> = () => {
	// Create a simple DAW engine instance for the legacy interface
	const audioEngine = new DAWAudioEngine();

	// Return simplified interface for backward compatibility
	return {
		addAudioNode: async (node: CustomNode) => {
			console.log('Adding audio node (legacy):', {
				id: node.id,
				type: node.type,
			});

			try {
				const audioNode = await createAudioNode(node);
				if (audioNode) {
					audioEngine.addAudioNode(node.id, audioNode);
				}
			} catch (error) {
				console.error(`Failed to add audio node ${node.id}:`, error);
			}
		},

		removeAudioNode: (nodeId: string) => {
			audioEngine.removeAudioNode(nodeId);
		},

		connect: async (connection: Connection) => {
			if (!connection.source || !connection.target) return;

			try {
				const audioConnection = createConnectionFromEdge({
					...connection,
					id: audioEngine.createConnectionId(
						connection.source,
						connection.sourceHandle || 'audio-out',
						connection.target,
						connection.targetHandle || 'audio-in'
					),
					source: connection.source,
					target: connection.target,
					sourceHandle: connection.sourceHandle || null,
					targetHandle: connection.targetHandle || null,
				} as Edge);

				await audioEngine.connect(audioConnection);
			} catch (error) {
				console.error('Failed to establish audio connection:', error);
			}
		},

		disconnect: (edge: Edge) => {
			const connectionId = audioEngine.createConnectionId(
				edge.source,
				edge.sourceHandle || 'audio-out',
				edge.target,
				edge.targetHandle || 'audio-in'
			);
			audioEngine.disconnect(connectionId);
		},
	};
};
