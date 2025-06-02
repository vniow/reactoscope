import { useEffect } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from './useAppStore';
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
		const outgoingEdges = edges.filter(
			(edge: Edge) =>
				edge.source === nodeId && edge.sourceHandle === 'audio-out'
		);

		// For each outgoing edge, connect this source to the target
		outgoingEdges.forEach((edge: Edge) => {
			const sourceNode = Object.values(audioNodes).find(
				(node) => node.id === edge.source
			);
			const targetNode = Object.values(audioNodes).find(
				(node) => node.id === edge.target
			);

			if (sourceNode && targetNode) {
				// Get the source instance
				const sourceKey = `${sourceNode.type}-${sourceNode.id}`;

				// Handle different target types
				let targetKey: string;
				if (targetNode.type === 'analyser') {
					// For analyser nodes, determine which channel based on target handle
					const channel = edge.targetHandle === 'audio-in-L' ? 'L' : 'R';
					targetKey = `${targetNode.type}-${targetNode.id}-${channel}`;
				} else {
					targetKey = `${targetNode.type}-${targetNode.id}`;
				}

				const toneInstances = (
					window as unknown as {
						toneInstances?: Record<string, Tone.ToneAudioNode>;
					}
				).toneInstances;

				const sourceInstance = toneInstances?.[sourceKey];
				const targetInstance = toneInstances?.[targetKey];

				if (sourceInstance && targetInstance) {
					try {
						sourceInstance.connect(targetInstance);
						console.log(
							`✅ Connected ${sourceNode.type} ${sourceNode.id} to ${
								targetNode.type
							} ${targetNode.id} ${
								targetNode.type === 'analyser' ? `(${edge.targetHandle})` : ''
							}`
						);

						// Update analyser connection status if target is analyser
						if (targetNode.type === 'analyser') {
							// This will be handled by the analyser hook's useEffect for connection monitoring
						}
					} catch (error) {
						console.error('❌ Failed to connect audio nodes:', error);
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
					if (targetNode.type === 'analyser') {
						// For analyser nodes, determine which channel based on target handle
						const channel = edge.targetHandle === 'audio-in-L' ? 'L' : 'R';
						targetKey = `${targetNode.type}-${targetNode.id}-${channel}`;
					} else {
						targetKey = `${targetNode.type}-${targetNode.id}`;
					}

					const toneInstances = (
						window as unknown as {
							toneInstances?: Record<string, Tone.ToneAudioNode>;
						}
					).toneInstances;

					const sourceInstance = toneInstances?.[sourceKey];
					const targetInstance = toneInstances?.[targetKey];

					if (sourceInstance && targetInstance) {
						try {
							sourceInstance.disconnect(targetInstance);
							// console.log(
							// 	`🔌 Disconnected ${sourceNode.type} ${sourceNode.id} from ${
							// 		targetNode.type
							// 	} ${targetNode.id} ${
							// 		targetNode.type === 'analyser' ? `(${edge.targetHandle})` : ''
							// 	}`
							// );
						} catch (error) {
							console.error('❌ Failed to disconnect audio nodes:', error);
						}
					}
				}
			});
		};
	}, [nodeId, audioNodes, edges]);

	return {
		getOutgoingConnections: () => {
			return edges.filter(
				(edge: Edge) =>
					edge.source === nodeId && edge.sourceHandle === 'audio-out'
			);
		},
	};
}
