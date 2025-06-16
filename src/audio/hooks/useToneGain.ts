import { useEffect, useCallback, useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../../shared/stores/appStore';
import type { GainParams, AudioNodeData } from '../stores/audioSlice';

/**
 * Control interface for a Tone.js Gain node.
 * Provides methods to update gain parameters and access current state.
 */
export interface ToneGainControls {
	updateGain: (gain: number) => void;
	updateMute: (mute: boolean) => void;
	params: GainParams;
}

/**
 * Custom React hook for managing a Tone.js Gain node.
 * Handles lifecycle, parameter updates, and state synchronization using Zustand as single source of truth.
 *
 * @param nodeId - The unique identifier for the audio node.
 * @returns An object containing controls for the gain node and its current parameters.
 */
export function useToneGain(nodeId: string): ToneGainControls {
	// Store actions for managing both UI state and Tone.js instances
	const {
		getAudioNode,
		addAudioNode,
		updateAudioNode,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		getAudioNodeInstance,
		initializeAudioContext,
	} = useAppStore();

	// Ref to track if the audio node has been initialized
	const isInitializedRef = useRef(false);
	// Ref to track if the Tone.js instance has been created
	const hasInstanceRef = useRef(false);

	// Get audio node data from store using stable getter
	const audioNode = getAudioNode(nodeId) as AudioNodeData | undefined;

	// Default parameters
	const defaultParams: GainParams = useMemo(
		() => ({
			gain: 1.0, // Unity gain
			mute: false,
		}),
		[]
	);

	// Current parameters from store or defaults
	const params = useMemo(
		() => (audioNode?.params as GainParams) || defaultParams,
		[audioNode?.params, defaultParams]
	);

	const gainNode = getAudioNodeInstance(nodeId) as Tone.Gain | undefined;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode && !isInitializedRef.current) {
			isInitializedRef.current = true;
			addAudioNode(nodeId, 'gain', defaultParams);
		}
	}, [nodeId, audioNode, addAudioNode, defaultParams]);

	// Create gain node instance and manage lifecycle
	useEffect(() => {
		const createGain = async (): Promise<void> => {
			if (audioNode && !hasInstanceRef.current) {
				hasInstanceRef.current = true;

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
					hasInstanceRef.current = false; // Reset on error
				}
			}
		};

		createGain();

		// Cleanup on unmount
		return (): void => {
			if (gainNode) {
				try {
					gainNode.dispose();
				} catch (error) {
					console.error(`Error disposing gain node for ${nodeId}:`, error);
				}
				removeAudioNodeInstance(nodeId);
			}
			// Reset refs
			hasInstanceRef.current = false;
			isInitializedRef.current = false;
		};
	}, [
		nodeId,
		audioNode,
		gainNode,
		params,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		initializeAudioContext,
	]);

	// Update gain parameters when they change
	useEffect(() => {
		if (!gainNode || !audioNode) return;

		try {
			const now = Tone.now();
			// Update gain value (apply mute if needed)
			const targetGain = params.mute ? 0 : params.gain;

			// Use smooth ramping to avoid audio artifacts
			gainNode.gain.cancelScheduledValues(now);
			gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.02); // 20ms ramp
		} catch (error) {
			console.error(`Error updating gain parameters for ${nodeId}:`, error);
		}
	}, [gainNode, params, nodeId, audioNode]);

	// Control functions with proper error handling
	const updateGain = useCallback(
		(gain: number): void => {
			// Validate gain value
			if (gain < 0 || gain > 2) {
				console.warn(`Gain value ${gain} is outside recommended range [0, 2]`);
			}
			updateAudioNode(nodeId, { gain } as Partial<GainParams>);
		},
		[nodeId, updateAudioNode]
	);

	const updateMute = useCallback(
		(mute: boolean): void => {
			updateAudioNode(nodeId, { mute } as Partial<GainParams>);
		},
		[nodeId, updateAudioNode]
	);

	return {
		updateGain,
		updateMute,
		params,
	};
}
