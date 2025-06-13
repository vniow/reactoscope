import { useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from './useAppStore';
import { toneRegistry } from '../utils/toneRegistry';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js destination connections
 * Handles connecting audio nodes to the master output via React Flow edges
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

			console.log(
				`🎧 useToneDestination for ${nodeId}: found ${incomingEdges.length} incoming edges (attempt ${retryCount + 1}/${maxRetries + 1})`
			);

			let connectionsNeeded = 0;
			let connectionsSuccessful = 0;

			// For each incoming edge, connect the source to Tone's destination
			incomingEdges.forEach((edge: Edge) => {
				const sourceNode = Object.values(audioNodes).find(
					(node) => node.id === edge.source
				);

				console.log(
					`🎧 Processing destination edge ${edge.id}: ${edge.source} → ${edge.target}`,
					sourceNode
				);

				if (
					sourceNode &&
					(sourceNode.type === 'oscillator' ||
						sourceNode.type === 'gain' ||
						sourceNode.type === 'analyser')
				) {
					connectionsNeeded++;

					// Get the Tone.js instance from the centralized registry
					const sourceKey = `${sourceNode.type}-${sourceNode.id}`;

					console.log(`🎧 Looking for source instance: ${sourceKey}`);

					// Only show detailed debug on first attempt to reduce noise
					if (retryCount === 0) {
						console.log(
							`🎧 Available tone instances: (${toneRegistry.size()}) [${toneRegistry.getKeys().join(', ')}]`
						);
						toneRegistry.debug();
					}

					const sourceInstance = toneRegistry.get(sourceKey);

					console.log(`🎧 Found source instance:`, !!sourceInstance);

					if (sourceInstance) {
						try {
							// Connect to Tone's master destination
							sourceInstance.connect(Tone.getDestination());
							console.log(
								`✅ Connected ${sourceNode.type} ${sourceNode.id} to master destination via edge ${edge.id}`
							);
							connectionsSuccessful++;
						} catch (error) {
							console.error('❌ Failed to connect to destination:', error);
						}
					} else {
						if (retryCount === 0) {
							console.warn(
								`⚠️ Missing source instance for ${sourceKey} - will retry`
							);
						}
					}
				}
			});

			// If some connections failed and we have retries left, try again
			if (
				connectionsNeeded > connectionsSuccessful &&
				retryCount < maxRetries
			) {
				console.log(
					`🔄 Retrying connections in ${retryDelay}ms (${connectionsSuccessful}/${connectionsNeeded} successful)`
				);
				setTimeout(() => attemptConnections(retryCount + 1), retryDelay);
			} else if (connectionsNeeded > 0) {
				console.log(
					`🎯 Connection attempts complete: ${connectionsSuccessful}/${connectionsNeeded} successful`
				);
				if (connectionsSuccessful < connectionsNeeded) {
					console.warn(
						`⚠️ Some tone connections failed - audio routing may be incomplete`
					);
				}
			}

			// Return cleanup function for successful connections
			return () => {
				incomingEdges.forEach((edge: Edge) => {
					const sourceNode = Object.values(audioNodes).find(
						(node) => node.id === edge.source
					);

					if (
						sourceNode &&
						(sourceNode.type === 'oscillator' ||
							sourceNode.type === 'gain' ||
							sourceNode.type === 'analyser')
					) {
						const sourceKey = `${sourceNode.type}-${sourceNode.id}`;
						const sourceInstance = toneRegistry.get(sourceKey);

						if (sourceInstance) {
							try {
								sourceInstance.disconnect(Tone.getDestination());
								console.log(
									`🔌 Disconnected ${sourceNode.type} ${sourceNode.id} from destination (edge ${edge.id} removed)`
								);
							} catch (error) {
								console.error(
									'❌ Failed to disconnect from destination:',
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
		attemptConnections();

		// Return cleanup function for successful connections
		return () => {
			const incomingEdges = edges.filter(
				(edge: Edge) => edge.target === nodeId
			);

			incomingEdges.forEach((edge: Edge) => {
				const sourceNode = Object.values(audioNodes).find(
					(node) => node.id === edge.source
				);

				if (
					sourceNode &&
					(sourceNode.type === 'oscillator' ||
						sourceNode.type === 'gain' ||
						sourceNode.type === 'analyser')
				) {
					const sourceKey = `${sourceNode.type}-${sourceNode.id}`;
					const sourceInstance = toneRegistry.get(sourceKey);

					if (sourceInstance) {
						try {
							sourceInstance.disconnect(Tone.getDestination());
							console.log(
								`🔌 Disconnected ${sourceNode.type} ${sourceNode.id} from destination (edge ${edge.id} removed)`
							);
						} catch (error) {
							console.error('❌ Failed to disconnect from destination:', error);
						}
					}
				}
			});
		};
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
