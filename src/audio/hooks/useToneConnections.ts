import { useEffect } from 'react';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from '../../shared/stores/useAppStore';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js audio connections between nodes
 *
 * TYPE-AGNOSTIC APPROACH:
 * - Works with ANY node type that has Tone.js instances
 * - No need to update this hook when adding new node types
 * - Automatically handles both single and multi-instance nodes
 * - Uses handle-based routing for multi-instance targets (e.g., 'audio-in-X' -> channel 'X')
 * - Scales efficiently as the application grows
 */
export function useToneConnections(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const edges = useEdges();

	// Get the source node's instance to trigger re-connection when it changes
	const sourceNodeData = audioNodes[nodeId];
	const sourceInstance = sourceNodeData?.instance;

	useEffect(() => {
		// Find all React Flow edges where this node is the source
		const outgoingEdges = edges.filter((edge: Edge) => edge.source === nodeId);

		// For each outgoing edge, connect this source to the target
		outgoingEdges.forEach((edge: Edge) => {
			const sourceNode = audioNodes[edge.source];
			const targetNode = audioNodes[edge.target];

			// Log the handles from the edge object itself
			console.log(
				`🔍 Edge details: sourceHandle=${edge.sourceHandle}, targetHandle=${edge.targetHandle}`
			);

			if (sourceNode && targetNode) {
				// Get source instance (type-agnostic)
				const sourceInstance = sourceNode.instance;

				console.log(
					`🔗 Connection: ${sourceNode.type} (${sourceNode.id}) -> ${targetNode.type} (${targetNode.id})`,
					{
						hasSourceInstance: !!sourceInstance,
						sourceInstanceType: sourceInstance?.constructor?.name,
					}
				);

				// Get target instance (type-agnostic with multi-instance support)
				let targetInstance;

				// Check if target has multiple instances and we have a specific handle
				if (targetNode.instances && edge.targetHandle) {
					// Extract channel from handle (e.g., 'audio-in-X' -> 'X')
					const channelMatch = edge.targetHandle.match(/audio-in-(.+)$/);
					const channel = channelMatch ? channelMatch[1] : 'default';
					targetInstance = targetNode.instances[channel];

					console.log(`🎯 Target (${channel} channel):`, {
						hasTargetInstance: !!targetInstance,
						targetInstanceType: targetInstance?.constructor?.name,
					});
				} else {
					// Single instance target
					targetInstance = targetNode.instance;
					console.log(`🎯 Target:`, {
						hasTargetInstance: !!targetInstance,
						targetInstanceType: targetInstance?.constructor?.name,
					});
				}

				if (sourceInstance && targetInstance) {
					try {
						sourceInstance.connect(targetInstance);
						console.log(
							`✅ Connected ${sourceNode.type} -> ${targetNode.type}`
						);
					} catch (error) {
						console.error('Failed to connect audio nodes:', error);
					}
				} else {
					console.warn(`⚠️ Connection failed: missing instances`, {
						hasSource: !!sourceInstance,
						hasTarget: !!targetInstance,
						sourceType: sourceNode.type,
						targetType: targetNode.type,
						targetHandle: edge.targetHandle,
					});
				}
			}
		});

		// Cleanup function to disconnect when edges change
		return () => {
			outgoingEdges.forEach((edge: Edge) => {
				const sourceNode = audioNodes[edge.source];
				const targetNode = audioNodes[edge.target];

				if (sourceNode && targetNode) {
					// Get source instance (type-agnostic)
					const sourceInstance = sourceNode.instance;

					// Get target instance (type-agnostic with multi-instance support)
					let targetInstance;

					if (targetNode.instances && edge.targetHandle) {
						// Extract channel from handle
						const channelMatch = edge.targetHandle.match(/audio-in-(.+)$/);
						const channel = channelMatch ? channelMatch[1] : 'default';
						targetInstance = targetNode.instances[channel];
					} else {
						targetInstance = targetNode.instance;
					}

					if (sourceInstance && targetInstance) {
						try {
							sourceInstance.disconnect(targetInstance);
							console.log(
								`🔌 Disconnected ${sourceNode.type} -> ${targetNode.type}`
							);
						} catch (error) {
							console.error('Failed to disconnect audio nodes:', error);
						}
					}
				}
			});
		};
	}, [nodeId, audioNodes, edges, sourceInstance]);

	return {
		getOutgoingConnections: () => {
			return edges.filter((edge: Edge) => edge.source === nodeId);
		},
	};
}
