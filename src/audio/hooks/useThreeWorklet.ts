/**
 * useThreeWorklet - React hook for managing three generator worklet nodes
 *
 * This hook provides a consistent interface for managing ThreeWorkletNode instances
 * within the Reactoscope ecosystem, handling lifecycle, parameters, and store integration.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ThreeWorkletNode, type CoordinatePoint } from '../worklets';
import { useAppStore } from '../../shared/stores/appStore';
import type { ThreeWorkletParams } from '../stores/audioSlice';

export interface ThreeWorkletControls {
	start: () => Promise<void>;
	stop: () => void;
	setVolume: (volume: number) => void;
	setPlaybackSpeed: (speed: number) => void;
	setInterpolationStep: (step: number) => void;
	setCoordinates: (coordinates: CoordinatePoint[]) => void;
	isPlaying: boolean;
	isReady: boolean;
	params: ThreeWorkletParams;
	workletNode: ThreeWorkletNode | null;
	// Add error state
	error: Error | null;
}

/**
 * Custom hook for managing a ThreeWorkletNode
 * Handles lifecycle, parameter updates, and state synchronization
 * Enhanced with better error handling and type safety
 *
 * @param nodeId - Unique identifier for the audio node
 * @returns Controls and state for the three worklet
 */
export const useThreeWorklet = (nodeId: string): ThreeWorkletControls => {
	// Input validation with better error messages
	if (!nodeId?.trim()) {
		throw new Error('useThreeWorklet: nodeId must be a non-empty string');
	}

	const workletRef = useRef<ThreeWorkletNode | null>(null);
	const isStartedRef = useRef(false);
	const [error, setError] = useState<Error | null>(null);

	// Utility function to safely convert unknown error to Error
	const handleError = useCallback((error: unknown, context: string) => {
		const errorInstance =
			error instanceof Error ? error : new Error(String(error));
		console.error(`🚨 ${context}:`, errorInstance);
		setError(errorInstance);
	}, []);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const {
		updateAudioNode,
		addAudioNode,
		initializeAudioContext,
		setAudioNodeInstance,
		removeAudioNodeInstance,
	} = useAppStore();

	// Default parameters need to include playbackSpeed and interpolationStep
	const defaultParams: ThreeWorkletParams = {
		isPlaying: false,
		volume: 0.5,
		playbackSpeed: 1.0,
		interpolationStep: 0.1,
	};

	const params = (audioNode?.params as ThreeWorkletParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			try {
				addAudioNode(nodeId, 'three-worklet', {
					isPlaying: false,
					volume: 1,
				});
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

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, workletRef.current);
			} catch (error) {
				handleError(error, `Failed to create three worklet for node ${nodeId}`);
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
		handleError,
	]);

	// Sync parameters with worklet
	useEffect(() => {
		if (workletRef.current && workletRef.current.isReady) {
			// Sync volume parameter - use a small tolerance for floating point comparison
			const volumeDiff = Math.abs(
				workletRef.current.volume.value - params.volume
			);
			if (volumeDiff > 0.001) {
				workletRef.current.volume.value = params.volume;
			}

			// Sync playback speed parameter
			if (params.playbackSpeed) {
				const speedDiff = Math.abs(
					workletRef.current.playbackSpeed.value - params.playbackSpeed
				);
				if (speedDiff > 0.001) {
					workletRef.current.playbackSpeed.value = params.playbackSpeed;
				}
			}

			// Sync interpolation step parameter
			if (params.interpolationStep) {
				const interpDiff = Math.abs(
					workletRef.current.interpolationStep.value - params.interpolationStep
				);
				if (interpDiff > 0.0001) {
					workletRef.current.interpolationStep.value = params.interpolationStep;
				}
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
	}, [
		params.volume,
		params.playbackSpeed,
		params.interpolationStep,
		params.isPlaying,
	]);

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
			}
		} catch (error) {
			handleError(error, `Failed to start three worklet ${nodeId}`);
		}
	}, [nodeId, updateAudioNode, params.isPlaying, handleError]);

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
			}
		} catch (error) {
			handleError(error, `Failed to stop three worklet ${nodeId}`);
		}
	}, [nodeId, updateAudioNode, params.isPlaying, handleError]);

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
			} catch (error) {
				handleError(error, `Failed to set volume for ${nodeId}`);
			}
		},
		[nodeId, updateAudioNode, handleError]
	);

	const setPlaybackSpeed = useCallback(
		(speed: number): void => {
			// Input validation
			if (typeof speed !== 'number' || speed <= 0) {
				console.error(`🚨 Invalid playback speed value for ${nodeId}:`, speed);
				return;
			}

			try {
				if (workletRef.current && workletRef.current.isReady) {
					workletRef.current.setPlaybackSpeed(speed);
				}

				// Update store
				updateAudioNode(nodeId, { playbackSpeed: speed });
			} catch (error) {
				handleError(error, `Failed to set playback speed for ${nodeId}`);
			}
		},
		[nodeId, updateAudioNode, handleError]
	);

	const setInterpolationStep = useCallback(
		(step: number): void => {
			// Input validation
			if (typeof step !== 'number' || step <= 0) {
				console.error(
					`🚨 Invalid interpolation step value for ${nodeId}:`,
					step
				);
				return;
			}

			try {
				if (workletRef.current && workletRef.current.isReady) {
					workletRef.current.setInterpolationStep(step);
				}

				// Update store
				updateAudioNode(nodeId, { interpolationStep: step });
			} catch (error) {
				handleError(error, `Failed to set interpolation step for ${nodeId}`);
			}
		},
		[nodeId, updateAudioNode, handleError]
	);

	const setCoordinates = useCallback(
		(coordinates: CoordinatePoint[]): void => {
			try {
				if (workletRef.current && workletRef.current.isReady) {
					workletRef.current.setCoordinates(coordinates);
				}
			} catch (error) {
				handleError(error, `Failed to set coordinates for ${nodeId}`);
			}
		},
		[nodeId, handleError]
	);

	return {
		start,
		stop,
		setVolume,
		setPlaybackSpeed,
		setInterpolationStep,
		setCoordinates,
		isPlaying: params.isPlaying,
		isReady: workletRef.current?.isReady || false,
		params,
		workletNode: workletRef.current,
		error,
	};
};
