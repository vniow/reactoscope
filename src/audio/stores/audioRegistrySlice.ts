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
	) => Promise<void>;
	unregisterAudioNode: (nodeId: string) => void;
	updateAudioNodeParams: (
		nodeId: string,
		params: Partial<AudioNodeParams>
	) => Promise<void>;

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
	) =>
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> }
		| null;
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
	registerAudioNode: async (nodeId, type, params = {}) => {
		try {
			// Check if node is already registered
			if (get().nodeRegistry[nodeId]) {
				console.warn(`⚠️ Audio node ${nodeId} is already registered, skipping`);
				return;
			}

			// Ensure audio system is initialized before creating nodes
			const state = get();
			if (!state.isAudioInitialized) {
				console.log('🔄 Initializing audio system before creating node...');
				await state.initializeAudioSystem();
			}

			let audioNode:
				| Tone.ToneAudioNode
				| Tone.ToneAudioNode[]
				| { outputs: Record<string, Tone.ToneAudioNode> };
			let customNodeInstance: unknown = undefined;

			if (
				(type === 'custom-noise' ||
					type === 'custom-xyrgb' ||
					type === 'analyzer') &&
				params &&
				typeof params === 'object' &&
				'node' in params &&
				params.node
			) {
				// For custom nodes, use the provided node directly
				// Type assertion is safe here since we're checking the type and node property
				audioNode = params.node as Tone.ToneAudioNode | Tone.ToneAudioNode[];
				customNodeInstance = params.node;
				// Only log for custom-xyrgb to reduce console spam
				if (type === 'custom-xyrgb') {
					console.log(
						`🔊 Registering ${type} node: ${nodeId} with provided audio node`
					);
				}
			} else {
				audioNode = createAudioNode(type, params);
			}

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
				...(customNodeInstance ? { customNodeInstance } : {}),
			};

			set((state) => ({
				nodeRegistry: {
					...state.nodeRegistry,
					[nodeId]: registryEntry,
				},
			}));

			console.log(`✅ Audio node registered: ${nodeId} (type: ${type})`);

			// Auto-start nodes that need to be started (but they will be stopped if disconnected)
			// Note: custom-noise nodes handle their own start/stop via the UI, so don't auto-start them
			if (type === 'oscillator' || type === 'lfo') {
				startAudioNode(audioNode);
			}
		} catch (error) {
			console.error(`❌ Failed to register audio node ${nodeId}:`, error);
		}
	},

	unregisterAudioNode: (nodeId) => {
		const entry = get().nodeRegistry[nodeId];
		if (!entry) {
			// Don't warn for missing nodes during cleanup - this is normal
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

			// console.log(`✅ Audio node unregistered: ${nodeId}`);
		} catch (error) {
			console.error(`❌ Error unregistering audio node ${nodeId}:`, error);
		}
	},

	updateAudioNodeParams: async (nodeId, params) => {
		const entry = get().nodeRegistry[nodeId];
		if (!entry) {
			console.warn(`⚠️ Audio node ${nodeId} not found for parameter update`);
			return;
		}

		try {
			// Update the live audio node parameters first
			await updateLiveAudioNodeParams(entry.audioNode, entry.type, params);

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
		const attemptConnection = (attempt = 1) => {
			// Map React Flow node IDs to internal audio node IDs for multi-input nodes
			// Map target node handles to their internal audio node IDs
			// Determine target audio node key (x, y, r, g, b channels for XYRGBScope)
			const handleToSuffixMap: Record<string, string> = {
				inputX: ':x',
				inputY: ':y',
				inputZ: ':z', // Added Z handle
				inputR: ':r',
				inputG: ':g',
				inputB: ':b',
			};

			const actualTargetId =
				targetHandleId && handleToSuffixMap[targetHandleId]
					? `${targetId}${handleToSuffixMap[targetHandleId]}`
					: targetId;

			const sourceEntry = get().nodeRegistry[sourceId];
			let targetEntry = get().nodeRegistry[actualTargetId];

			// Fallback: lookup registry by matching suffix if direct lookup fails
			if (!targetEntry && targetHandleId && handleToSuffixMap[targetHandleId]) {
				const suffix = handleToSuffixMap[targetHandleId];
				const fallbackKey = Object.keys(get().nodeRegistry).find(
					(key) => key === `${targetId}${suffix}`
				);
				if (fallbackKey) {
					targetEntry = get().nodeRegistry[fallbackKey];
				}
			}

			if (!sourceEntry || !targetEntry) {
				if (attempt < 5) {
					// Debug logging to understand what's missing
					if (attempt === 1) {
						console.log(
							`🔍 Connection attempt ${attempt}: sourceId=${sourceId}, targetId=${targetId}, actualTargetId=${actualTargetId}`
						);
						console.log(`🔍 Available nodes:`, Object.keys(get().nodeRegistry));
					}
					// If nodes are not ready, retry after a short delay
					setTimeout(() => attemptConnection(attempt + 1), 100 * attempt);
				} else {
					console.warn(
						`⚠️ Cannot create audio connection after ${attempt} attempts - missing nodes: source=${!!sourceEntry} (${sourceId}), target=${!!targetEntry} (${actualTargetId})`
					);
					console.log(
						`🔍 Available registry keys:`,
						Object.keys(get().nodeRegistry)
					);
				}
				return;
			}

			try {
				// Enhanced connection logic with handle-to-node mapping and index tracking
				const getNodeFromHandle = (
					audioNode:
						| Tone.ToneAudioNode
						| Tone.ToneAudioNode[]
						| { outputs: Record<string, Tone.ToneAudioNode> },
					handleId: string | undefined,
					isOutput: boolean
				): { node: Tone.ToneAudioNode; index?: number } => {
					// Handle named outputs object (like XYRGBInterpolatorNode.outputs)
					if (
						isOutput &&
						audioNode &&
						typeof audioNode === 'object' &&
						'outputs' in audioNode &&
						handleId
					) {
						// Map output handle IDs to output channel names
						const outputHandleMap: Record<string, string> = {
							outputX: 'x',
							outputY: 'y',
							outputZ: 'z', // Added Z
							outputR: 'r',
							outputG: 'g',
							outputB: 'b',
						};

						const channelName = outputHandleMap[handleId];
						if (channelName && audioNode.outputs[channelName]) {
							return { node: audioNode.outputs[channelName], index: undefined };
						}
						// Fallback if channelName is not found or output is null/undefined
						console.warn(
							`⚠️ getNodeFromHandle: Could not find output channel ${channelName} for handle ${handleId}. Falling back to main node.`
						);
					}

					if (Array.isArray(audioNode)) {
						// Handle-based routing for multi-node arrays
						if (handleId) {
							// Extract channel number from handle ID (e.g., 'input-1' -> 0, 'output-2' -> 1)
							const channelMatch = handleId.match(/-(\d+)$/);
							if (channelMatch) {
								const channelIndex = parseInt(channelMatch[1]) - 1; // Convert 1-based to 0-based
								if (channelIndex >= 0 && channelIndex < audioNode.length) {
									return { node: audioNode[channelIndex], index: channelIndex };
								}
							}
						}
						// Fallback to existing behavior for standard handles
						const fallbackIndex = isOutput ? audioNode.length - 1 : 0;
						const fallbackNode = audioNode[fallbackIndex];
						return { node: fallbackNode, index: fallbackIndex };
					}
					// Ensure it's a Tone.ToneAudioNode before returning
					if (audioNode instanceof Tone.ToneAudioNode) {
						return { node: audioNode, index: undefined };
					}
					// If it's not a Tone.ToneAudioNode, it's an unexpected type.
					// This should ideally not happen if registerAudioNode is correct.
					console.error(
						`❌ getNodeFromHandle: Unexpected audioNode type for handle ${handleId}.`,
						audioNode
					);
					throw new Error('Invalid audio node type for connection.');
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

				// Crucial check: Ensure both nodes are connectable
				if (
					!sourceResult.node ||
					typeof sourceResult.node.connect !== 'function'
				) {
					throw new Error(
						`Source node for connection is not connectable: ${sourceId}, handle: ${sourceHandleId}`
					);
				}
				if (
					!targetResult.node ||
					typeof targetResult.node.connect !== 'function'
				) {
					throw new Error(
						`Target node for connection is not connectable: ${targetId}, handle: ${targetHandleId}`
					);
				}

				const connection: AudioConnection = {
					sourceId,
					targetId: actualTargetId, // Store the actual target ID with suffix for proper cleanup
					sourceHandleId,
					targetHandleId,
					sourceOutputIndex: sourceResult.index,
					targetInputIndex: targetResult.index,
				};

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
				set((state) => {
					const updates: Record<string, AudioNodeRegistryEntry> = {
						...state.nodeRegistry,
					};

					// Update source node if it exists
					if (state.nodeRegistry[sourceId]) {
						updates[sourceId] = {
							...state.nodeRegistry[sourceId],
							connections: {
								...state.nodeRegistry[sourceId].connections,
								outputs: [
									...state.nodeRegistry[sourceId].connections.outputs,
									connection,
								],
							},
						};
					}

					// Update target node if it exists
					if (state.nodeRegistry[actualTargetId]) {
						updates[actualTargetId] = {
							...state.nodeRegistry[actualTargetId],
							connections: {
								...state.nodeRegistry[actualTargetId].connections,
								inputs: [
									...state.nodeRegistry[actualTargetId].connections.inputs,
									connection,
								],
							},
						};
					}

					return { nodeRegistry: updates };
				});

				// Auto-start source nodes when they get connected
				if (sourceEntry) {
					const shouldAutoStart = [
						'oscillator',
						'lfo',
						'custom-noise',
					].includes(sourceEntry.type);
					if (shouldAutoStart) {
						startAudioNode(sourceEntry.audioNode);
					}
				}
			} catch (error) {
				console.error(
					`❌ Failed to register audio connection ${edgeId}:`,
					error
				);
			}
		};

		attemptConnection();
	},

	unregisterConnection: (edgeId) => {
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
					audioNode:
						| Tone.ToneAudioNode
						| Tone.ToneAudioNode[]
						| { outputs: Record<string, Tone.ToneAudioNode> },
					handleId: string | undefined,
					isOutput: boolean
				): Tone.ToneAudioNode => {
					// Handle named outputs object (like XYRGBInterpolatorNode.outputs)
					if (
						isOutput &&
						audioNode &&
						typeof audioNode === 'object' &&
						'outputs' in audioNode &&
						handleId
					) {
						// Map output handle IDs to output channel names
						const outputHandleMap: Record<string, string> = {
							outputX: 'x',
							outputY: 'y',
							outputR: 'r',
							outputG: 'g',
							outputB: 'b',
						};

						const channelName = outputHandleMap[handleId];
						if (channelName && audioNode.outputs[channelName]) {
							return audioNode.outputs[channelName];
						}
					}

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
					return audioNode as Tone.ToneAudioNode;
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
				set((state) => {
					const updates: Record<string, AudioNodeRegistryEntry> = {
						...state.nodeRegistry,
					};

					// Update source node if it exists
					if (state.nodeRegistry[connection.sourceId]) {
						updates[connection.sourceId] = {
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
						};
					}

					// Update target node if it exists
					if (state.nodeRegistry[connection.targetId]) {
						updates[connection.targetId] = {
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
						};
					}

					return { nodeRegistry: updates };
				});
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

				// Skip auto-stop for Reactoscope processor (custom-xyrgb)
				if (shouldStopSourceNode && sourceEntry.type !== 'custom-xyrgb') {
					const shouldPlay = get().shouldSourceNodePlay(connection.sourceId);
					if (!shouldPlay) {
						stopAudioNode(sourceEntry.audioNode);
					}
				}
			}
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
			'player',
			'lfo',
			'microphone',
			'custom-noise',
		].includes(entry.type);
		const hasOutputs = entry.connections.outputs.length > 0;

		return isSourceType && hasOutputs;
	},

	initializeAudioSystem: async () => {
		try {
			// Start the audio context
			await Tone.start();

			// Set initial master volume using correct Tone.js API
			const destination = Tone.getDestination();
			destination.volume.value = get().masterVolume;

			set({ isAudioInitialized: true });
		} catch (error) {
			console.error('❌ Failed to initialize audio system:', error);
			throw error;
		}
	},

	disposeAllNodes: () => {
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
	},

	setMasterVolume: (volume) => {
		try {
			Tone.getDestination().volume.value = volume;
			set({ masterVolume: volume });
		} catch (error) {
			console.error('❌ Error setting master volume:', error);
		}
	},

	setGlobalMute: (mute) => {
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
