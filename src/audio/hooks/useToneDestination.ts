import { useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from '../../shared/stores/useAppStore';
import type { Edge } from '@xyflow/react';

/**
 * Return type for the useToneDestination hook.
 * Provides utility functions for managing destination connections.
 */
interface ToneDestinationControls {
	getConnectedSources: () => string[];
	getIncomingEdges: () => Edge[];
}

/**
 * Custom React hook for managing Tone.js destination connections.
 *
 * Uses a type-agnostic approach that works with any node type that has Tone.js instances.
 * Automatically handles both single and multi-instance nodes without requiring updates
 * when new node types are added to the system.
 *
 * @param nodeId - The unique identifier for the destination node.
 * @returns An object containing utility functions for connection management.
 */
export function useToneDestination(nodeId: string): ToneDestinationControls {
	const { audioNodes } = useAudioNodes();
	const edges = useEdges();

	/**
	 * Connects a single Tone.js instance to the destination.
	 * @param instance - The Tone.js audio instance to connect.
	 * @param nodeType - The type of the source node for logging.
	 * @param sourceNodeId - The ID of the source node for logging.
	 * @param instanceKey - Optional key for multi-instance nodes.
	 * @returns True if connection was successful, false otherwise.
	 */
	const connectInstance = useCallback(
		(
			instance: Tone.ToneAudioNode,
			nodeType: string,
			sourceNodeId: string,
			instanceKey?: string
		): boolean => {
			try {
				instance.connect(Tone.getDestination());
				const displayName = instanceKey
					? `${nodeType}[${instanceKey}] ${sourceNodeId}`
					: `${nodeType} ${sourceNodeId}`;
				console.log(`✅ Connected ${displayName} to destination`);
				return true;
			} catch (error) {
				const displayName = instanceKey
					? `${nodeType}[${instanceKey}]`
					: nodeType;
				console.error(
					`Failed to connect ${displayName} to destination:`,
					error
				);
				return false;
			}
		},
		[]
	);

	/**
	 * Disconnects a single Tone.js instance from the destination.
	 * @param instance - The Tone.js audio instance to disconnect.
	 * @param nodeType - The type of the source node for logging.
	 * @param sourceNodeId - The ID of the source node for logging.
	 * @param instanceKey - Optional key for multi-instance nodes.
	 */
	const disconnectInstance = useCallback(
		(
			instance: Tone.ToneAudioNode,
			nodeType: string,
			sourceNodeId: string,
			instanceKey?: string
		): void => {
			try {
				instance.disconnect(Tone.getDestination());
				const displayName = instanceKey
					? `${nodeType}[${instanceKey}] ${sourceNodeId}`
					: `${nodeType} ${sourceNodeId}`;
				console.log(`🔌 Disconnected ${displayName} from destination`);
			} catch (error) {
				const displayName = instanceKey
					? `${nodeType}[${instanceKey}]`
					: nodeType;
				console.error(
					`Failed to disconnect ${displayName} from destination:`,
					error
				);
			}
		},
		[]
	);

	/**
	 * Attempts to establish connections with retry logic for better reliability.
	 * @param retryCount - Current retry attempt number.
	 * @returns Cleanup function for disconnecting established connections.
	 */
	const attemptConnections = useCallback(
		(retryCount = 0): (() => void) => {
			const maxRetries = 3;
			const retryDelay = 100; // ms

			// Find all React Flow edges that target this destination node
			const incomingEdges = edges.filter(
				(edge: Edge) => edge.target === nodeId
			);

			let connectionsNeeded = 0;
			let connectionsSuccessful = 0;

			// For each incoming edge, connect the source to Tone's destination
			incomingEdges.forEach((edge: Edge) => {
				const sourceNode = Object.values(audioNodes).find(
					(node) => node.id === edge.source
				);

				if (!sourceNode) {
					console.warn(`⚠️ Source node ${edge.source} not found`);
					return;
				}

				const audioNodeData = audioNodes[sourceNode.id];
				if (!audioNodeData) {
					console.warn(`⚠️ No audio data found for node ${sourceNode.id}`);
					return;
				}

				// Handle multi-instance nodes (e.g., analysers with X/Y channels)
				if (audioNodeData.instances) {
					Object.entries(audioNodeData.instances).forEach(([key, instance]) => {
						if (instance) {
							connectionsNeeded++;
							const success = connectInstance(
								instance,
								sourceNode.type,
								sourceNode.id,
								key
							);
							if (success) connectionsSuccessful++;
						}
					});
				}
				// Handle single-instance nodes
				else if (audioNodeData.instance) {
					connectionsNeeded++;
					const success = connectInstance(
						audioNodeData.instance,
						sourceNode.type,
						sourceNode.id
					);
					if (success) connectionsSuccessful++;
				} else {
					console.warn(
						`⚠️ No instance found for ${sourceNode.type} node ${sourceNode.id}`
					);
				}
			});

			// If some connections failed and we have retries left, try again
			if (
				connectionsNeeded > connectionsSuccessful &&
				retryCount < maxRetries
			) {
				setTimeout(() => attemptConnections(retryCount + 1), retryDelay);
			}

			// Return cleanup function for successful connections
			return (): void => {
				incomingEdges.forEach((edge: Edge) => {
					const sourceNode = Object.values(audioNodes).find(
						(node) => node.id === edge.source
					);

					if (!sourceNode) return;

					const audioNodeData = audioNodes[sourceNode.id];
					if (!audioNodeData) return;

					// Handle multi-instance nodes
					if (audioNodeData.instances) {
						Object.entries(audioNodeData.instances).forEach(
							([key, instance]) => {
								if (instance) {
									disconnectInstance(
										instance,
										sourceNode.type,
										sourceNode.id,
										key
									);
								}
							}
						);
					}
					// Handle single-instance nodes
					else if (audioNodeData.instance) {
						disconnectInstance(
							audioNodeData.instance,
							sourceNode.type,
							sourceNode.id
						);
					}
				});
			};
		},
		[nodeId, edges, audioNodes, connectInstance, disconnectInstance]
	);

	useEffect(() => {
		// Start connection attempts
		const cleanup = attemptConnections();

		// Return cleanup function
		return cleanup;
	}, [attemptConnections]);

	/**
	 * Utility functions for external use.
	 */
	const getConnectedSources = useCallback((): string[] => {
		return edges
			.filter((edge: Edge) => edge.target === nodeId)
			.map((edge: Edge) => edge.source);
	}, [edges, nodeId]);

	const getIncomingEdges = useCallback((): Edge[] => {
		return edges.filter((edge: Edge) => edge.target === nodeId);
	}, [edges, nodeId]);

	return {
		getConnectedSources,
		getIncomingEdges,
	};
}
