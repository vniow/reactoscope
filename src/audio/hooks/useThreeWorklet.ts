/**
 * useThreeWorklet - React hook for managing three generator worklet nodes
 *
 * This hook provides a consistent interface for managing ThreeWorkletNode instances
 * within the Reactoscope ecosystem, handling lifecycle, parameters, and store integration.
 */

import { useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { ThreeWorkletNode } from '../worklets';
import { useAppStore } from '../../shared/stores/appStore';
import type { ThreeWorkletParams } from '../stores/audioSlice';

export interface ThreeWorkletControls {
	start: () => void;
	stop: () => void;
	setVolume: (volume: number) => void;
	isPlaying: boolean;
	isReady: boolean;
	params: ThreeWorkletParams;
	workletNode: ThreeWorkletNode | null;
}

/**
 * Custom hook for managing a ThreeWorkletNode
 * Handles lifecycle, parameter updates, and state synchronization
 *
 * @param nodeId - Unique identifier for the audio node
 * @returns Controls and state for the three worklet
 */
export const useThreeWorklet = (nodeId: string): ThreeWorkletControls => {
	// Input validation
	if (!nodeId || typeof nodeId !== 'string') {
		console.error('🚨 useThreeWorklet: nodeId must be a non-empty string', {
			nodeId,
		});
		throw new Error('Invalid nodeId provided to useThreeWorklet');
	}
	const workletRef = useRef<ThreeWorkletNode | null>(null);
	const isStartedRef = useRef(false);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const {
		updateAudioNode,
		addAudioNode,
		initializeAudioContext,
		setAudioNodeInstance,
		removeAudioNodeInstance,
	} = useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: ThreeWorkletParams = {
		isPlaying: false,
		volume: 0.5,
	};

	const params = (audioNode?.params as ThreeWorkletParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			try {
				addAudioNode(nodeId, 'three-worklet', {
					isPlaying: false,
					volume: 0.5,
				});
				console.log(`📊 Initialized audio node in store: ${nodeId}`);
			} catch (error) {
				console.error(`🚨 Failed to initialize audio node ${nodeId}:`, error);
			}
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure worklet
	useEffect(() => {
		const createWorklet = async (): Promise<void> => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new three worklet
				workletRef.current = new ThreeWorkletNode({
					debug: true,
					volume: 0.5, // Will be synced later
				});

				// Wait for worklet to be ready
				await workletRef.current.ready;

				console.log(`🔊 Created three worklet for node ${nodeId}`);

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, workletRef.current);
			} catch (error) {
				console.error(
					`🚨 Failed to create three worklet for node ${nodeId}:`,
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
					removeAudioNodeInstance(nodeId);
				} catch (error) {
					console.error(
						`🚨 Error cleaning up three worklet for node ${nodeId}:`,
						error
					);
				}
				workletRef.current = null;
			}
		};
	}, [
		nodeId,
		initializeAudioContext,
		setAudioNodeInstance,
		removeAudioNodeInstance,
	]);

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
	const start = useCallback(async (): Promise<void> => {
		try {
			if (
				workletRef.current &&
				workletRef.current.isReady &&
				!params.isPlaying
			) {
				await Tone.start();
				workletRef.current.start();
				isStartedRef.current = true;

				// Update store
				updateAudioNode(nodeId, { isPlaying: true });
				console.log(`▶️ Started three worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(`🚨 Failed to start three worklet ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode, params.isPlaying]);

	const stop = useCallback((): void => {
		try {
			if (
				workletRef.current &&
				workletRef.current.isReady &&
				params.isPlaying
			) {
				workletRef.current.stop();
				isStartedRef.current = false;

				// Update store
				updateAudioNode(nodeId, { isPlaying: false });
				console.log(`⏹️ Stopped three worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(`🚨 Failed to stop three worklet ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode, params.isPlaying]);

	const setVolume = useCallback(
		(volume: number): void => {
			// Input validation
			if (typeof volume !== 'number' || volume < 0 || volume > 1) {
				console.error(`🚨 Invalid volume value for ${nodeId}:`, volume);
				return;
			}

			try {
				if (workletRef.current && workletRef.current.isReady) {
					workletRef.current.setVolume(volume);
				}

				// Update store
				updateAudioNode(nodeId, { volume });
				console.log(
					`🔊 Set volume for ${nodeId}: ${Math.round(volume * 100)}%`
				);
			} catch (error) {
				console.error(`🚨 Failed to set volume for ${nodeId}:`, error);
			}
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
