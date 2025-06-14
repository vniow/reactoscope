import { useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../stores/appStore';
import type { GainParams } from '../stores/slices/audioSlice';

export interface ToneGainControls {
	updateGain: (gain: number) => void;
	updateMute: (mute: boolean) => void;
	params: GainParams;
}

/**
 * Custom hook for managing a Tone.js Gain node
 * Handles lifecycle, parameter updates, and state synchronization using Zustand as single source of truth
 */
export const useToneGain = (nodeId: string): ToneGainControls => {
	// Store actions for managing both UI state and Tone.js instances
	const {
		audioNodes,
		addAudioNode,
		updateAudioNode,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		getAudioNodeInstance,
		initializeAudioContext,
	} = useAppStore();

	// Get audio node data from store
	const audioNode = audioNodes[nodeId];

	// Default parameters
	const defaultParams: GainParams = useMemo(
		() => ({
			gain: 1.0, // Unity gain
			mute: false,
		}),
		[]
	);

	const params = (audioNode?.params as GainParams) || defaultParams;
	const gainNode = getAudioNodeInstance(nodeId) as Tone.Gain | undefined;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'gain', defaultParams);
		}
	}, [nodeId, audioNode, addAudioNode, defaultParams]);

	// Create gain node instance and manage lifecycle
	useEffect(() => {
		const createGain = async () => {
			try {
				// Ensure audio context is initialized
				await initializeAudioContext();

				// Create new gain node if it doesn't exist
				if (!gainNode) {
					const newGainNode = new Tone.Gain({
						gain: params.mute ? 0 : params.gain,
					});

					// Store instance in Zustand
					setAudioNodeInstance(nodeId, newGainNode);
				}
			} catch (error) {
				console.error(`Failed to create gain node for ${nodeId}:`, error);
			}
		};

		createGain();

		// Cleanup on unmount
		return () => {
			if (gainNode) {
				try {
					gainNode.dispose();
				} catch (error) {
					console.error(`Error disposing gain node for ${nodeId}:`, error);
				}
				removeAudioNodeInstance(nodeId);
			}
		};
	}, [
		nodeId,
		gainNode,
		params,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		initializeAudioContext,
	]);

	// Update gain parameters when they change
	useEffect(() => {
		if (!gainNode) return;

		try {
			const now = Tone.now();
			// Update gain value (apply mute if needed)
			const targetGain = params.mute ? 0 : params.gain;
			gainNode.gain.setValueAtTime(targetGain, now);
		} catch (error) {
			console.error(`Error updating gain parameters for ${nodeId}:`, error);
		}
	}, [gainNode, params, nodeId]);

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

	return {
		updateGain,
		updateMute,
		params,
	};
};
