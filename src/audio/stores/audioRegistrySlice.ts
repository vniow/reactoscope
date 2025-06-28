/**
 * Audio Registry Slice
 *
 * Manages the registry of audio nodes and their connections.
 * This slice handles the mapping between React Flow nodes and Tone.js audio nodes.
 */

import type { StateCreator } from 'zustand';
import * as Tone from 'tone';
import type { AppStore } from '../../shared/stores/types';
import type {
	AudioNodeType,
	AudioConnection,
	AudioNodeRegistryEntry,
	AudioNodeParams,
} from '../types';
import {
	createAudioNode,
	disposeAudioNode,
	startAudioNode,
	stopAudioNode,
	updateAudioNodeParams as updateLiveAudioNodeParams,
} from '../factories/audioNodeFactory';

export interface AudioRegistryState {
	// Maps React Flow node IDs to audio registry entries
	nodeRegistry: Record<string, AudioNodeRegistryEntry>;
	// Maps edge IDs to audio connections
	connectionRegistry: Record<string, AudioConnection>;
	// Global audio state
	isAudioInitialized: boolean;
	masterVolume: number; // in dB
	globalMute: boolean;
}

export interface AudioRegistryActions {
	// Node management
	registerAudioNode: (
		nodeId: string,
		type: AudioNodeType,
		params?: AudioNodeParams
	) => void;
	unregisterAudioNode: (nodeId: string) => void;
	updateAudioNodeParams: (
		nodeId: string,
		params: Partial<AudioNodeParams>
	) => void;

	// Connection management
	registerConnection: (
		edgeId: string,
		sourceId: string,
		targetId: string,
		sourceHandleId?: string,
		targetHandleId?: string
	) => void;
	unregisterConnection: (edgeId: string) => void;

	// Node access
	getAudioNode: (
		nodeId: string
	) => Tone.ToneAudioNode | Tone.ToneAudioNode[] | null;
	getRegistryEntry: (nodeId: string) => AudioNodeRegistryEntry | null;
	getConnectionDetails: (edgeId: string) => {
		connection: AudioConnection;
		sourceEntry: {
			id: string;
			type: AudioNodeType;
			nodeCount: number;
			outputIndex?: number;
		} | null;
		targetEntry: {
			id: string;
			type: AudioNodeType;
			nodeCount: number;
			inputIndex?: number;
		} | null;
	} | null;
	shouldSourceNodePlay: (nodeId: string) => boolean;

	// Global operations
	initializeAudioSystem: () => Promise<void>;
	disposeAllNodes: () => void;
	setMasterVolume: (volume: number) => void;
	setGlobalMute: (mute: boolean) => void;

	// Node lifecycle
	startAudioNodes: (nodeIds?: string[]) => void;
	stopAudioNodes: (nodeIds?: string[]) => void;
}

export interface AudioRegistrySlice
	extends AudioRegistryState,
		AudioRegistryActions {}

export const createAudioRegistrySlice: StateCreator<
	AppStore,
	[],
	[],
	AudioRegistrySlice
> = (set, get) => ({
	// Initial state
	nodeRegistry: {},
	connectionRegistry: {},
	isAudioInitialized: false,
	masterVolume: 0,
	globalMute: false,

	// Actions
	registerAudioNode: (nodeId, type, params = {}) => {
		console.log(`🔊 Registering audio node: ${nodeId} (${type})`);

		try {
			const audioNode = createAudioNode(type, params);

			const registryEntry: AudioNodeRegistryEntry = {
				id: nodeId,
				type,
				audioNode,
				parameters: params,
				connections: {
					inputs: [],
					outputs: [],
				},
				isActive: true,
				createdAt: Date.now(),
			};

			set((state) => ({
				nodeRegistry: {
					...state.nodeRegistry,
					[nodeId]: registryEntry,
				},
			}));

			// Auto-start nodes that need to be started (but they will be stopped if disconnected)
			if (type === 'oscillator' || type === 'noise' || type === 'lfo') {
				startAudioNode(audioNode);
				console.log(`▶️ Auto-started source node: ${nodeId}`);
			}

			console.log(`✅ Audio node registered: ${nodeId}`);
		} catch (error) {
			console.error(`❌ Failed to register audio node ${nodeId}:`, error);
		}
	},

	unregisterAudioNode: (nodeId) => {
		console.log(`🔇 Unregistering audio node: ${nodeId}`);

		const entry = get().nodeRegistry[nodeId];
		if (!entry) {
			console.warn(`⚠️ Audio node ${nodeId} not found in registry`);
			return;
		}

		try {
			// Stop the node if it's running
			stopAudioNode(entry.audioNode);

			// Dispose the audio node to prevent memory leaks
			disposeAudioNode(entry.audioNode);

			// Remove from registry
			set((state) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [nodeId]: _removed, ...restNodes } = state.nodeRegistry;
				return { nodeRegistry: restNodes };
			});

			// Clean up any connections involving this node
			const connectionsToRemove = Object.entries(get().connectionRegistry)
				.filter(
					([, connection]) =>
						connection.sourceId === nodeId || connection.targetId === nodeId
				)
				.map(([edgeId]) => edgeId);

			connectionsToRemove.forEach((edgeId) => {
				get().unregisterConnection(edgeId);
			});

			console.log(`✅ Audio node unregistered: ${nodeId}`);
		} catch (error) {
			console.error(`❌ Error unregistering audio node ${nodeId}:`, error);
		}
	},

	updateAudioNodeParams: (nodeId, params) => {
		console.log(`🔧 Updating audio node params: ${nodeId}`, params);

		const entry = get().nodeRegistry[nodeId];
		if (!entry) {
			console.warn(`⚠️ Audio node ${nodeId} not found for parameter update`);
			return;
		}

		try {
			// Update the live audio node parameters first
			updateLiveAudioNodeParams(entry.audioNode, entry.type, params);

			// Then update the registry entry
			set((state) => ({
				nodeRegistry: {
					...state.nodeRegistry,
					[nodeId]: {
						...entry,
						parameters: { ...entry.parameters, ...params },
					},
				},
			}));

			console.log(`✅ Audio node params updated: ${nodeId}`);
		} catch (error) {
			console.error(`❌ Error updating audio node params ${nodeId}:`, error);
		}
	},

	registerConnection: (
		edgeId,
		sourceId,
		targetId,
		sourceHandleId,
		targetHandleId
	) => {
		console.log(
			`🔌 Registering audio connection: ${edgeId} (${sourceId} → ${targetId})`
		);

		const sourceEntry = get().nodeRegistry[sourceId];
		const targetEntry = get().nodeRegistry[targetId];

		if (!sourceEntry || !targetEntry) {
			console.warn(
				`⚠️ Cannot create audio connection - missing nodes: source=${!!sourceEntry}, target=${!!targetEntry}`
			);
			return;
		}

		try {
			// Enhanced connection logic with handle-to-node mapping and index tracking
			const getNodeFromHandle = (
				audioNode: Tone.ToneAudioNode | Tone.ToneAudioNode[],
				handleId: string | undefined,
				isOutput: boolean
			): { node: Tone.ToneAudioNode; index?: number } => {
				if (Array.isArray(audioNode)) {
					// Handle-based routing for multi-node arrays
					if (handleId) {
						// Extract channel number from handle ID (e.g., 'input-1' -> 0, 'output-2' -> 1)
						const channelMatch = handleId.match(/-(\d+)$/);
						if (channelMatch) {
							const channelIndex = parseInt(channelMatch[1]) - 1; // Convert 1-based to 0-based
							if (channelIndex >= 0 && channelIndex < audioNode.length) {
								console.log(
									`🎯 Handle-based routing: ${handleId} -> node[${channelIndex}]`
								);
								return { node: audioNode[channelIndex], index: channelIndex };
							}
						}
					}
					// Fallback to existing behavior for standard handles
					const fallbackIndex = isOutput ? audioNode.length - 1 : 0;
					const fallbackNode = audioNode[fallbackIndex];
					console.log(
						`🔄 Fallback routing: ${handleId || 'undefined'} -> ${isOutput ? 'last' : 'first'} node`
					);
					return { node: fallbackNode, index: fallbackIndex };
				}
				return { node: audioNode, index: undefined };
			};

			// Get the specific nodes to connect based on handle IDs
			const sourceResult = getNodeFromHandle(
				sourceEntry.audioNode,
				sourceHandleId,
				true
			);
			const targetResult = getNodeFromHandle(
				targetEntry.audioNode,
				targetHandleId,
				false
			);

			const connection: AudioConnection = {
				sourceId,
				targetId,
				sourceHandleId,
				targetHandleId,
				sourceOutputIndex: sourceResult.index,
				targetInputIndex: targetResult.index,
			};

			console.log(
				`🔗 Connecting: ${sourceId}[${sourceHandleId}] -> ${targetId}[${targetHandleId}]`,
				{
					sourceType: Array.isArray(sourceEntry.audioNode)
						? `Array[${sourceEntry.audioNode.length}]`
						: 'Single',
					targetType: Array.isArray(targetEntry.audioNode)
						? `Array[${targetEntry.audioNode.length}]`
						: 'Single',
					sourceOutputIndex: sourceResult.index,
					targetInputIndex: targetResult.index,
					outputNodeType: sourceResult.node.constructor.name,
					inputNodeType: targetResult.node.constructor.name,
				}
			);

			// Connect the nodes
			sourceResult.node.connect(targetResult.node);

			// Register the connection
			set((state) => ({
				connectionRegistry: {
					...state.connectionRegistry,
					[edgeId]: connection,
				},
			}));

			// Update registry entries with connection info
			set((state) => ({
				nodeRegistry: {
					...state.nodeRegistry,
					[sourceId]: {
						...state.nodeRegistry[sourceId],
						connections: {
							...state.nodeRegistry[sourceId].connections,
							outputs: [
								...state.nodeRegistry[sourceId].connections.outputs,
								connection,
							],
						},
					},
					[targetId]: {
						...state.nodeRegistry[targetId],
						connections: {
							...state.nodeRegistry[targetId].connections,
							inputs: [
								...state.nodeRegistry[targetId].connections.inputs,
								connection,
							],
						},
					},
				},
			}));

			// Auto-start source nodes when they get connected
			if (sourceEntry) {
				const shouldAutoStart = ['oscillator', 'noise', 'lfo'].includes(
					sourceEntry.type
				);
				if (shouldAutoStart) {
					console.log(`▶️ Starting connected source node: ${sourceId}`);
					startAudioNode(sourceEntry.audioNode);
				}
			}

			console.log(`✅ Audio connection registered: ${edgeId}`);
		} catch (error) {
			console.error(`❌ Failed to register audio connection ${edgeId}:`, error);
		}
	},

	unregisterConnection: (edgeId) => {
		console.log(`✂️ Unregistering audio connection: ${edgeId}`);

		const connection = get().connectionRegistry[edgeId];
		if (!connection) {
			console.warn(`⚠️ Audio connection ${edgeId} not found`);
			return;
		}

		try {
			const sourceEntry = get().nodeRegistry[connection.sourceId];
			const targetEntry = get().nodeRegistry[connection.targetId];

			if (sourceEntry && targetEntry) {
				// Disconnect the audio nodes using the same handle mapping
				const sourceNode = sourceEntry.audioNode;
				const targetNode = targetEntry.audioNode;

				// Use the same handle-to-node mapping function
				const getNodeFromHandle = (
					audioNode: Tone.ToneAudioNode | Tone.ToneAudioNode[],
					handleId: string | undefined,
					isOutput: boolean
				): Tone.ToneAudioNode => {
					if (Array.isArray(audioNode)) {
						// Handle-based routing for multi-node arrays
						if (handleId) {
							// Extract channel number from handle ID
							const channelMatch = handleId.match(/-(\d+)$/);
							if (channelMatch) {
								const channelIndex = parseInt(channelMatch[1]) - 1;
								if (channelIndex >= 0 && channelIndex < audioNode.length) {
									return audioNode[channelIndex];
								}
							}
						}
						// Fallback to existing behavior
						return isOutput ? audioNode[audioNode.length - 1] : audioNode[0];
					}
					return audioNode;
				};

				// Get the specific nodes to disconnect
				const outputNode = getNodeFromHandle(
					sourceNode,
					connection.sourceHandleId,
					true
				);
				const inputNode = getNodeFromHandle(
					targetNode,
					connection.targetHandleId,
					false
				);

				console.log(
					`✂️ Disconnecting: ${connection.sourceId}[${connection.sourceHandleId}] -> ${connection.targetId}[${connection.targetHandleId}]`
				);

				// Disconnect the nodes
				outputNode.disconnect(inputNode);
			}

			// Remove from connection registry
			set((state) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [edgeId]: _removed, ...restConnections } =
					state.connectionRegistry;
				return { connectionRegistry: restConnections };
			});

			// Update node registry entries
			if (sourceEntry && targetEntry) {
				set((state) => ({
					nodeRegistry: {
						...state.nodeRegistry,
						[connection.sourceId]: {
							...state.nodeRegistry[connection.sourceId],
							connections: {
								...state.nodeRegistry[connection.sourceId].connections,
								outputs: state.nodeRegistry[
									connection.sourceId
								].connections.outputs.filter(
									(conn) =>
										!(
											conn.sourceId === connection.sourceId &&
											conn.targetId === connection.targetId
										)
								),
							},
						},
						[connection.targetId]: {
							...state.nodeRegistry[connection.targetId],
							connections: {
								...state.nodeRegistry[connection.targetId].connections,
								inputs: state.nodeRegistry[
									connection.targetId
								].connections.inputs.filter(
									(conn) =>
										!(
											conn.sourceId === connection.sourceId &&
											conn.targetId === connection.targetId
										)
								),
							},
						},
					},
				}));
			}

			// Check if source node should be stopped after disconnection
			// Stop source nodes (oscillators, noise, etc.) if they have no output connections
			// Processing nodes (like dualGain) should keep running if they have any input or output connections
			if (sourceEntry) {
				const updatedSourceEntry = {
					...sourceEntry,
					connections: {
						...sourceEntry.connections,
						outputs: sourceEntry.connections.outputs.filter(
							(conn) =>
								!(
									conn.sourceId === connection.sourceId &&
									conn.targetId === connection.targetId
								)
						),
					},
				};

				// For true source nodes, stop if no output connections
				// For processing nodes, keep running if they have any input or output connections
				const isProcessingNode = [
					'dualGain',
					'gain',
					'filter',
					'delay',
					'reverb',
					'compressor',
					'distortion',
				].includes(sourceEntry.type);
				const shouldStopSourceNode = isProcessingNode
					? updatedSourceEntry.connections.outputs.length === 0 &&
						updatedSourceEntry.connections.inputs.length === 0
					: updatedSourceEntry.connections.outputs.length === 0;

				if (shouldStopSourceNode) {
					const shouldPlay = get().shouldSourceNodePlay(connection.sourceId);

					if (!shouldPlay) {
						console.log(
							`🛑 Stopping disconnected source node: ${connection.sourceId}`
						);
						stopAudioNode(sourceEntry.audioNode);
					}
				}
			}

			console.log(`✅ Audio connection unregistered: ${edgeId}`);
		} catch (error) {
			console.error(
				`❌ Error unregistering audio connection ${edgeId}:`,
				error
			);
		}
	},

	getAudioNode: (nodeId) => {
		const entry = get().nodeRegistry[nodeId];
		return entry ? entry.audioNode : null;
	},

	getRegistryEntry: (nodeId) => {
		return get().nodeRegistry[nodeId] || null;
	},

	// Debug utility to inspect handle connections
	getConnectionDetails: (edgeId: string) => {
		const connection = get().connectionRegistry[edgeId];
		if (!connection) return null;

		const sourceEntry = get().nodeRegistry[connection.sourceId];
		const targetEntry = get().nodeRegistry[connection.targetId];

		return {
			connection,
			sourceEntry: sourceEntry
				? {
						id: sourceEntry.id,
						type: sourceEntry.type,
						nodeCount: Array.isArray(sourceEntry.audioNode)
							? sourceEntry.audioNode.length
							: 1,
						outputIndex: connection.sourceOutputIndex,
					}
				: null,
			targetEntry: targetEntry
				? {
						id: targetEntry.id,
						type: targetEntry.type,
						nodeCount: Array.isArray(targetEntry.audioNode)
							? targetEntry.audioNode.length
							: 1,
						inputIndex: connection.targetInputIndex,
					}
				: null,
		};
	},

	shouldSourceNodePlay: (nodeId) => {
		const entry = get().nodeRegistry[nodeId];
		if (!entry) return false;

		// Source nodes should play if they have output connections
		const isSourceType = [
			'oscillator',
			'noise',
			'player',
			'lfo',
			'microphone',
		].includes(entry.type);
		const hasOutputs = entry.connections.outputs.length > 0;

		return isSourceType && hasOutputs;
	},

	initializeAudioSystem: async () => {
		try {
			console.log('🎵 Initializing audio system...');

			// Start the audio context
			await Tone.start();

			// Set initial master volume
			Tone.getDestination().volume.value = get().masterVolume;

			set({ isAudioInitialized: true });
			console.log('✅ Audio system initialized');
		} catch (error) {
			console.error('❌ Failed to initialize audio system:', error);
			throw error;
		}
	},

	disposeAllNodes: () => {
		console.log('🧹 Disposing all audio nodes');

		const { nodeRegistry } = get();

		Object.values(nodeRegistry).forEach((entry) => {
			try {
				stopAudioNode(entry.audioNode);
				disposeAudioNode(entry.audioNode);
			} catch (error) {
				console.error(`❌ Error disposing node ${entry.id}:`, error);
			}
		});

		set({
			nodeRegistry: {},
			connectionRegistry: {},
		});

		console.log('✅ All audio nodes disposed');
	},

	setMasterVolume: (volume) => {
		console.log(`🔊 Setting master volume: ${volume}dB`);

		try {
			Tone.getDestination().volume.value = volume;
			set({ masterVolume: volume });
		} catch (error) {
			console.error('❌ Error setting master volume:', error);
		}
	},

	setGlobalMute: (mute) => {
		console.log(`🔇 Setting global mute: ${mute}`);

		try {
			if (mute) {
				Tone.getDestination().volume.value = -Infinity;
			} else {
				Tone.getDestination().volume.value = get().masterVolume;
			}
			set({ globalMute: mute });
		} catch (error) {
			console.error('❌ Error setting global mute:', error);
		}
	},

	startAudioNodes: (nodeIds) => {
		const { nodeRegistry } = get();
		const targetNodes = nodeIds
			? nodeIds.map((id) => nodeRegistry[id]).filter(Boolean)
			: Object.values(nodeRegistry);

		targetNodes.forEach((entry) => {
			try {
				startAudioNode(entry.audioNode);
			} catch (error) {
				console.error(`❌ Error starting audio node ${entry.id}:`, error);
			}
		});
	},

	stopAudioNodes: (nodeIds) => {
		const { nodeRegistry } = get();
		const targetNodes = nodeIds
			? nodeIds.map((id) => nodeRegistry[id]).filter(Boolean)
			: Object.values(nodeRegistry);

		targetNodes.forEach((entry) => {
			try {
				stopAudioNode(entry.audioNode);
			} catch (error) {
				console.error(`❌ Error stopping audio node ${entry.id}:`, error);
			}
		});
	},
});
