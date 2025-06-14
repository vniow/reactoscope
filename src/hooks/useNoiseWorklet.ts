/**
 * useNoiseWorklet - React hook for managing noise generator worklet nodes
 *
 * This hook provides a consistent interface for managing NoiseWorkletNode instances
 * within the Reactoscope ecosystem, handling lifecycle, parameters, and store integration.
 */

import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { NoiseWorkletNode } from '../lib/worklets';
import { useAppStore } from '../stores/appStore';
import { toneRegistry } from '../utils/toneRegistry';
import type { NoiseWorkletParams } from '../stores/slices/audioSlice';

export interface NoiseWorkletControls {
	start: () => void;
	stop: () => void;
	setVolume: (volume: number) => void;
	isPlaying: boolean;
	isReady: boolean;
	params: NoiseWorkletParams;
	workletNode: NoiseWorkletNode | null;
}

/**
 * Custom hook for managing a NoiseWorkletNode
 * Handles lifecycle, parameter updates, and state synchronization
 */
export const useNoiseWorklet = (nodeId: string): NoiseWorkletControls => {
	const workletRef = useRef<NoiseWorkletNode | null>(null);
	const isStartedRef = useRef(false);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const { updateAudioNode, addAudioNode, initializeAudioContext } =
		useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: NoiseWorkletParams = {
		isPlaying: false,
		volume: 0.5,
	};

	const params = (audioNode?.params as NoiseWorkletParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'noise-worklet', {
				isPlaying: false,
				volume: 0.5,
			});
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure worklet
	useEffect(() => {
		const createWorklet = async () => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new noise worklet
				workletRef.current = new NoiseWorkletNode({
					debug: true,
					volume: 0.5, // Will be synced later
				});

				// Wait for worklet to be ready
				await workletRef.current.ready;

				// Register worklet in centralized registry
				toneRegistry.register(`noise-worklet-${nodeId}`, workletRef.current);
			} catch (error) {
				console.error(
					`Failed to create noise worklet for node ${nodeId}:`,
					error
				);
			}
		};

		createWorklet();

		// Cleanup on unmount
		return () => {
			if (workletRef.current) {
				try {
					if (isStartedRef.current) {
						workletRef.current.stop();
					}
					workletRef.current.dispose();
					toneRegistry.unregister(`noise-worklet-${nodeId}`);
				} catch (error) {
					console.error(
						`Error cleaning up noise worklet for node ${nodeId}:`,
						error
					);
				}
				workletRef.current = null;
			}
		};
	}, [nodeId, initializeAudioContext]);

	// Sync parameters with worklet
	useEffect(() => {
		if (workletRef.current && workletRef.current.isReady) {
			// Sync volume parameter
			if (workletRef.current.volume.value !== params.volume) {
				workletRef.current.setVolume(params.volume);
			}

			// Sync playing state
			if (params.isPlaying && !workletRef.current.isPlaying) {
				workletRef.current.start();
				isStartedRef.current = true;
			} else if (!params.isPlaying && workletRef.current.isPlaying) {
				workletRef.current.stop();
				isStartedRef.current = false;
			}
		}
	}, [params.volume, params.isPlaying]);

	// Control functions
	const start = useCallback(async () => {
		if (workletRef.current && workletRef.current.isReady && !params.isPlaying) {
			await Tone.start();
			workletRef.current.start();
			isStartedRef.current = true;

			// Update store
			updateAudioNode(nodeId, { isPlaying: true });
		}
	}, [nodeId, updateAudioNode, params.isPlaying]);

	const stop = useCallback(() => {
		if (workletRef.current && workletRef.current.isReady && params.isPlaying) {
			workletRef.current.stop();
			isStartedRef.current = false;

			// Update store
			updateAudioNode(nodeId, { isPlaying: false });
		}
	}, [nodeId, updateAudioNode, params.isPlaying]);

	const setVolume = useCallback(
		(volume: number) => {
			if (workletRef.current && workletRef.current.isReady) {
				workletRef.current.setVolume(volume);
			}

			// Update store
			updateAudioNode(nodeId, { volume });
		},
		[nodeId, updateAudioNode]
	);

	return {
		start,
		stop,
		setVolume,
		isPlaying: params.isPlaying,
		isReady: workletRef.current?.isReady || false,
		params,
		workletNode: workletRef.current,
	};
};
