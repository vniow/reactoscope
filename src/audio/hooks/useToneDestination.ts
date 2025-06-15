import { useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from '../../shared/stores/useAppStore';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js destination connections
 *
 * TYPE-AGNOSTIC APPROACH:
 * - Works with ANY node type that has Tone.js instances
 * - No need to update this hook when adding new node types
 * - Automatically handles both single and multi-instance nodes
 * - Scales efficiently as the application grows
 */
export function useToneDestination(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const edges = useEdges();

	// Helper function to attempt connections with retry logic
	const attemptConnections = useCallback(
		(retryCount = 0) => {
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

				// Type-agnostic approach: any node with an instance can connect
				if (sourceNode) {
					const audioNodeData = audioNodes[sourceNode.id];

					// Handle multi-instance nodes (e.g., analysers with X/Y channels)
					if (audioNodeData?.instances) {
						// Connect all instances in the instances object
						Object.entries(audioNodeData.instances).forEach(
							([key, instance]) => {
								if (instance) {
									connectionsNeeded++;
									try {
										instance.connect(Tone.getDestination());
										connectionsSuccessful++;
										console.log(
											`✅ Connected ${sourceNode.type}[${key}] ${sourceNode.id} to destination`
										);
									} catch (error) {
										console.error(
											`Failed to connect ${sourceNode.type}[${key}] to destination:`,
											error
										);
									}
								}
							}
						);
					}
					// Handle single-instance nodes
					else if (audioNodeData?.instance) {
						const sourceInstance = audioNodeData.instance;
						connectionsNeeded++;

						console.log(
							`🔍 Destination: Trying to connect ${sourceNode.type} node ${sourceNode.id}:`,
							{
								hasInstance: !!sourceInstance,
								instanceType: sourceInstance?.constructor?.name,
							}
						);

						try {
							// Connect to Tone's master destination
							sourceInstance.connect(Tone.getDestination());
							connectionsSuccessful++;
							console.log(
								`✅ Connected ${sourceNode.type} ${sourceNode.id} to destination`
							);
						} catch (error) {
							console.error('Failed to connect to destination:', error);
						}
					} else {
						console.warn(
							`⚠️ No instance found for ${sourceNode.type} node ${sourceNode.id}`
						);
					}
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
			return () => {
				incomingEdges.forEach((edge: Edge) => {
					const sourceNode = Object.values(audioNodes).find(
						(node) => node.id === edge.source
					);

					// Type-agnostic cleanup: any node with instances can be disconnected
					if (sourceNode) {
						const audioNodeData = audioNodes[sourceNode.id];

						// Handle multi-instance nodes
						if (audioNodeData?.instances) {
							Object.entries(audioNodeData.instances).forEach(
								([key, instance]) => {
									if (instance) {
										try {
											instance.disconnect(Tone.getDestination());
											console.log(
												`🔌 Disconnected ${sourceNode.type}[${key}] ${sourceNode.id} from destination`
											);
										} catch (error) {
											console.error(
												`Failed to disconnect ${sourceNode.type}[${key}] from destination:`,
												error
											);
										}
									}
								}
							);
						}
						// Handle single-instance nodes
						else if (audioNodeData?.instance) {
							try {
								audioNodeData.instance.disconnect(Tone.getDestination());
								console.log(
									`🔌 Disconnected ${sourceNode.type} ${sourceNode.id} from destination`
								);
							} catch (error) {
								console.error(
									`Failed to disconnect ${sourceNode.type} from destination:`,
									error
								);
							}
						}
					}
				});
			};
		},
		[nodeId, edges, audioNodes]
	);

	useEffect(() => {
		// Start connection attempts
		const cleanup = attemptConnections();

		// Return cleanup function
		return cleanup;
	}, [nodeId, edges, audioNodes, attemptConnections]);

	return {
		// Return utility functions
		getConnectedSources: () => {
			return edges
				.filter((edge: Edge) => edge.target === nodeId)
				.map((edge: Edge) => edge.source);
		},
		getIncomingEdges: () => {
			return edges.filter((edge: Edge) => edge.target === nodeId);
		},
	};
}
