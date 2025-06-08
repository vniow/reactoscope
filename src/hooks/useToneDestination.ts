import { useEffect } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAudioNodes } from './useAppStore';
import type { Edge } from '@xyflow/react';

/**
 * Custom hook for managing Tone.js destination connections
 * Handles connecting audio nodes to the master output via React Flow edges
 */
export function useToneDestination(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const edges = useEdges();

	useEffect(() => {
		// Find all React Flow edges that target this destination node
		const incomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);

		console.log(
			`🎧 useToneDestination for ${nodeId}: found ${incomingEdges.length} incoming edges`,
			incomingEdges
		);

		// For each incoming edge, connect the source to Tone's destination
		// This should only happen for the final node in the audio chain
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
				// Get the Tone.js instance from the global registry
				const sourceKey = `${sourceNode.type}-${sourceNode.id}`;
				const toneInstances = (
					window as unknown as {
						toneInstances?: Record<string, Tone.ToneAudioNode>;
					}
				).toneInstances;

				console.log(`🎧 Looking for source instance: ${sourceKey}`);
				console.log(
					`🎧 Available tone instances:`,
					Object.keys(toneInstances || {})
				);

				const sourceInstance = toneInstances?.[sourceKey];

				console.log(`🎧 Found source instance:`, !!sourceInstance);

				if (sourceInstance) {
					try {
						// Connect to Tone's master destination
						sourceInstance.connect(Tone.getDestination());
						console.log(
							`✅ Connected ${sourceNode.type} ${sourceNode.id} to master destination via edge ${edge.id}`
						);
					} catch (error) {
						console.error('❌ Failed to connect to destination:', error);
					}
				} else {
					console.warn(`⚠️ Missing source instance for ${sourceKey}`);
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
				.filter((edge: Edge) => edge.target === nodeId)
				.map((edge: Edge) => edge.source);
		},
		getIncomingEdges: () => {
			return edges.filter((edge: Edge) => edge.target === nodeId);
		},
	};
}
