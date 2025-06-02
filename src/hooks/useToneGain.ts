import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../stores/appStore';
import type { GainParams } from '../stores/slices/audioSlice';
import type { Edge } from '@xyflow/react';

export interface ToneGainControls {
	updateGain: (gain: number) => void;
	updateMute: (mute: boolean) => void;
	params: GainParams;
}

/**
 * Custom hook for managing a Tone.js Gain node
 * Handles lifecycle, parameter updates, and state synchronization
 */
export const useToneGain = (nodeId: string): ToneGainControls => {
	const gainRef = useRef<Tone.Gain | null>(null);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const { updateAudioNode, addAudioNode, initializeAudioContext } =
		useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: GainParams = {
		gain: 1.0, // Unity gain
		mute: false,
	};

	const params = (audioNode?.params as GainParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'gain', {
				gain: 1.0,
				mute: false,
			});
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure gain node
	useEffect(() => {
		const createGain = async () => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new gain node
				gainRef.current = new Tone.Gain({
					gain: params.mute ? 0 : params.gain,
				});

				// Register gain node in global registry for audio routing
				const windowWithTone = window as unknown as {
					toneInstances?: Record<string, Tone.Gain>;
				};
				if (!windowWithTone.toneInstances) {
					windowWithTone.toneInstances = {};
				}
				windowWithTone.toneInstances[`gain-${nodeId}`] = gainRef.current;

				console.log(`🎚️ Created gain node for ${nodeId}:`, params);
			} catch (error) {
				console.error(`🚨 Failed to create gain node for ${nodeId}:`, error);
			}
		};

		createGain();

		// Cleanup on unmount
		return () => {
			if (gainRef.current) {
				try {
					// Remove from global registry
					const toneInstances = (
						window as unknown as {
							toneInstances?: Record<string, Tone.Gain>;
						}
					).toneInstances;
					if (toneInstances) {
						delete toneInstances[`gain-${nodeId}`];
					}

					gainRef.current.dispose();
					console.log(`🗑️ Disposed gain node for ${nodeId}`);
				} catch (error) {
					console.error(`🚨 Error disposing gain node for ${nodeId}:`, error);
				}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, initializeAudioContext]); // Re-create only when nodeId changes

	// Update gain parameters when store params change
	useEffect(() => {
		if (!gainRef.current) return;

		try {
			const gain = gainRef.current;
			const now = Tone.now();

			// Update gain value (apply mute if needed)
			const targetGain = params.mute ? 0 : params.gain;
			gain.gain.setValueAtTime(targetGain, now);

			console.log(`🎚️ Updated gain for ${nodeId}:`, {
				gain: targetGain,
				mute: params.mute,
			});
		} catch (error) {
			console.error(`🚨 Error updating gain parameters for ${nodeId}:`, error);
		}
	}, [params, nodeId]);

	// Control functions
	const updateGain = useCallback(
		(gain: number) => {
			updateAudioNode(nodeId, { gain } as Partial<GainParams>);
		},
		[nodeId, updateAudioNode]
	);

	const updateMute = useCallback(
		(mute: boolean) => {
			updateAudioNode(nodeId, { mute } as Partial<GainParams>);
		},
		[nodeId, updateAudioNode]
	);

	// Edge monitoring for incoming audio connections
	const edges = useEdges();
	useEffect(() => {
		if (!gainRef.current) return;

		const gainNode = gainRef.current;

		// Connect incoming audio edges to the gain node
		const connections = edges
			.filter((edge: Edge) => edge.target === nodeId)
			.map((edge: Edge) => {
				const sourceNode = (
					window as unknown as {
						toneInstances?: Record<string, Tone.ToneAudioNode>;
					}
				).toneInstances?.[edge.source];

				return sourceNode ? sourceNode.connect(gainNode) : null;
			})
			.filter((connection): connection is Tone.ToneAudioNode =>
				Boolean(connection)
			);

		// Cleanup connections on unmount or nodeId change
		return () => {
			connections.forEach((connection) => connection.disconnect());
		};
	}, [edges, nodeId]);

	return {
		updateGain,
		updateMute,
		params,
	};
};
