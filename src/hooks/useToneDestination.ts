import { useEffect } from 'react';
import * as Tone from 'tone';
import { useAudioNodes } from './useAppStore';
import { useFlowEdges } from './useFlow';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js destination connections
 * Handles connecting audio nodes to the master output via React Flow edges
 */
export function useToneDestination(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const edges = useFlowEdges();

	useEffect(() => {
		// Find all React Flow edges that target this destination node
		const incomingEdges = edges.filter(
			(edge: Edge) => edge.target === nodeId && edge.targetHandle === 'audio-in'
		);

		// For each incoming edge, connect the source to Tone's destination
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
				// Get the Tone.js instance from the global registry
				const sourceKey = `${sourceNode.type}-${sourceNode.id}`;
				const toneInstances = (
					window as unknown as {
						toneInstances?: Record<string, Tone.ToneAudioNode>;
					}
				).toneInstances;
				const sourceInstance = toneInstances?.[sourceKey];

				if (sourceInstance) {
					try {
						// Connect to Tone's master destination
						sourceInstance.connect(Tone.getDestination());
						console.log(
							`✅ Connected ${sourceNode.type} ${sourceNode.id} to destination via edge ${edge.id}`
						);
					} catch (error) {
						console.error('❌ Failed to connect to destination:', error);
					}
				}
			}
		});

		// Cleanup function to disconnect when edges change
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
					const toneInstances = (
						window as unknown as {
							toneInstances?: Record<string, Tone.ToneAudioNode>;
						}
					).toneInstances;
					const sourceInstance = toneInstances?.[sourceKey];

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
	}, [nodeId, audioNodes, edges]);

	return {
		// Return utility functions
		getConnectedSources: () => {
			return edges
				.filter(
					(edge: Edge) =>
						edge.target === nodeId && edge.targetHandle === 'audio-in'
				)
				.map((edge: Edge) => edge.source);
		},
		getIncomingEdges: () => {
			return edges.filter(
				(edge: Edge) =>
					edge.target === nodeId && edge.targetHandle === 'audio-in'
			);
		},
	};
}
