import { useEffect } from 'react';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from './useAppStore';
import { toneRegistry } from '../utils/toneRegistry';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js audio connections between nodes
 * Handles connecting source audio nodes to target audio nodes via React Flow edges
 */
export function useToneConnections(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const edges = useEdges();

	useEffect(() => {
		// Find all React Flow edges where this node is the source
		const outgoingEdges = edges.filter((edge: Edge) => edge.source === nodeId);

		// For each outgoing edge, connect this source to the target
		outgoingEdges.forEach((edge: Edge) => {
			const sourceNode = Object.values(audioNodes).find(
				(node) => node.id === edge.source
			);
			const targetNode = Object.values(audioNodes).find(
				(node) => node.id === edge.target
			);

			// console.log(
			// 	`🔌 Processing edge ${edge.id}: ${edge.source} → ${edge.target}`,
			// 	{ sourceNode, targetNode }
			// );

			if (sourceNode && targetNode) {
				// Get the source instance
				const sourceKey = `${sourceNode.type}-${sourceNode.id}`;

				// Handle different target types
				let targetKey: string;
				if (
					targetNode.type === 'analyser' ||
					targetNode.type === 'visualizer'
				) {
					// For analyser/visualizer nodes, determine which channel based on target handle
					const channel = edge.targetHandle === 'audio-in-X' ? 'X' : 'Y';
					targetKey = `${targetNode.type}-${targetNode.id}-${channel}`;
				} else {
					targetKey = `${targetNode.type}-${targetNode.id}`;
				}

				const sourceInstance = toneRegistry.get(sourceKey);
				const targetInstance = toneRegistry.get(targetKey);

				if (sourceInstance && targetInstance) {
					try {
						sourceInstance.connect(targetInstance);

						// Update analyser/visualizer connection status
						if (
							targetNode.type === 'analyser' ||
							targetNode.type === 'visualizer'
						) {
							// This will be handled by the analyser/visualizer hook's useEffect for connection monitoring
						}
					} catch (error) {
						console.error('Failed to connect audio nodes:', error);
					}
				}
			}
		});

		// Cleanup function to disconnect when edges change
		return () => {
			outgoingEdges.forEach((edge: Edge) => {
				const sourceNode = Object.values(audioNodes).find(
					(node) => node.id === edge.source
				);
				const targetNode = Object.values(audioNodes).find(
					(node) => node.id === edge.target
				);

				if (sourceNode && targetNode) {
					const sourceKey = `${sourceNode.type}-${sourceNode.id}`;

					// Handle different target types
					let targetKey: string;
					if (
						targetNode.type === 'analyser' ||
						targetNode.type === 'visualizer'
					) {
						// For analyser/visualizer nodes, determine which channel based on target handle
						const channel = edge.targetHandle === 'audio-in-X' ? 'X' : 'Y';
						targetKey = `${targetNode.type}-${targetNode.id}-${channel}`;
					} else {
						targetKey = `${targetNode.type}-${targetNode.id}`;
					}

					const sourceInstance = toneRegistry.get(sourceKey);
					const targetInstance = toneRegistry.get(targetKey);

					if (sourceInstance && targetInstance) {
						try {
							sourceInstance.disconnect(targetInstance);
						} catch (error) {
							console.error('Failed to disconnect audio nodes:', error);
						}
					}
				}
			});
		};
	}, [nodeId, audioNodes, edges]);

	return {
		getOutgoingConnections: () => {
			return edges.filter((edge: Edge) => edge.source === nodeId);
		},
	};
}
