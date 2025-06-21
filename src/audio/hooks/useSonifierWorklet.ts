/**
 * useSonifierWorklet - Hook for managing vertex data audio generation
 *
 * This hook provides a clean interface for managing a SonifierWorkletNode instance,
 * integrating with the central audio system similar to useThreeWorklet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { SonifierWorkletNode } from '../worklets/nodes/SonifierWorkletNode';
import { useSonifierStore } from '../stores/sonifierStore';
import { useAppStore } from '../../shared/stores/appStore';

/**
 * Parameter interface for the sonifier worklet
 */
export interface SonifierParams {
	isPlaying: boolean;
	volume: number;
	playbackSpeed: number;
	interpolationStep: number;
}

/**
 * Hook for managing vertex data audio generation
 *
 * @param nodeId - Unique identifier for this node instance
 * @returns Object containing worklet controls and state
 */
export function useSonifierWorklet(nodeId: string) {
	// Get state from sonifier store for SharedArrayBuffer
	const { sharedBuffer, isReady: sonifierReady } = useSonifierStore();

	// Internal state
	const sonifierNodeRef = useRef<SonifierWorkletNode | null>(null);
	const [error, setError] = useState<Error | null>(null);

	// Error handling utility
	const handleError = useCallback((error: unknown, context: string): void => {
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

	// Default parameters
	const defaultParams: SonifierParams = {
		isPlaying: false,
		volume: 0.5,
		playbackSpeed: 1.0,
		interpolationStep: 0.1,
	};

	const params = (audioNode?.params as SonifierParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect ENTRY - Initialize audio node`,
			{
				nodeId,
				hasAudioNode: !!audioNode,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		if (!audioNode) {
			try {
				console.log(
					`🔍 [useSonifierWorklet-${nodeId}] ADDING audio node to store`
				);
				addAudioNode(nodeId, 'sonifier-worklet', {
					isPlaying: false,
					volume: 0.5,
					playbackSpeed: 1.0,
					interpolationStep: 0.1,
				});
				console.log(`📊 Initialized sonifier audio node in store: ${nodeId}`);
			} catch (error) {
				console.error(
					`🚨 Failed to initialize sonifier audio node ${nodeId}:`,
					error
				);
			}
		} else {
			console.log(
				`🔍 [useSonifierWorklet-${nodeId}] SKIPPING - audio node already exists`
			);
		}

		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect EXIT - Initialize audio node`
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, addAudioNode]); // Remove audioNode to prevent infinite loop

	// Create and configure worklet
	useEffect(() => {
		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect ENTRY - Create worklet`,
			{
				nodeId,
				hasWorkletRef: !!sonifierNodeRef.current,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		const createWorklet = async (): Promise<void> => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new sonifier worklet
				sonifierNodeRef.current = new SonifierWorkletNode({
					debug: true,
					volume: 0.5, // Will be synced later
				});

				// Wait for worklet to be ready
				await sonifierNodeRef.current.ready;

				console.log(`🔊 Created sonifier worklet for node ${nodeId}`);

				// Set shared buffer if available
				if (sharedBuffer) {
					sonifierNodeRef.current.setSharedBuffer(sharedBuffer);
				}

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, sonifierNodeRef.current);
			} catch (error) {
				handleError(
					error,
					`Failed to create sonifier worklet for node ${nodeId}`
				);
			}
		};

		createWorklet();

		// Cleanup on unmount
		return () => {
			console.log(
				`🔍 [useSonifierWorklet-${nodeId}] useEffect CLEANUP starting`
			);
			if (sonifierNodeRef.current) {
				try {
					if (sonifierNodeRef.current.isPlaying) {
						console.log(
							`🔍 [useSonifierWorklet-${nodeId}] Stopping worklet before disposal`
						);
						sonifierNodeRef.current.stop();
					}
					console.log(
						`🔍 [useSonifierWorklet-${nodeId}] Disposing worklet instance`
					);
					sonifierNodeRef.current.dispose();
					removeAudioNodeInstance(nodeId);
				} catch (error) {
					console.error(
						`🚨 Error cleaning up sonifier worklet for node ${nodeId}:`,
						error
					);
				}
				sonifierNodeRef.current = null;
			}
			console.log(
				`🔍 [useSonifierWorklet-${nodeId}] useEffect CLEANUP completed`
			);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		nodeId,
		// Removed store functions and sharedBuffer from deps to prevent infinite re-renders
		// These are not stable references but the effect only needs to run once per nodeId
	]);

	// Update shared buffer when it changes (separate from worklet creation)
	useEffect(() => {
		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect ENTRY - Update shared buffer`,
			{
				nodeId,
				hasWorklet: !!sonifierNodeRef.current,
				hasSharedBuffer: !!sharedBuffer,
				isWorkletReady: sonifierNodeRef.current?.isReady,
			}
		);

		if (sonifierNodeRef.current && sharedBuffer) {
			console.log(`🔧 [useSonifierWorklet-${nodeId}] Setting shared buffer`);
			sonifierNodeRef.current.setSharedBuffer(sharedBuffer);
		}
	}, [nodeId, sharedBuffer]);

	// Sync parameters with worklet
	useEffect(() => {
		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect ENTRY - Sync params`,
			{
				nodeId,
				hasWorklet: !!sonifierNodeRef.current,
				isReady: sonifierNodeRef.current?.isReady,
				volume: params.volume,
				playbackSpeed: params.playbackSpeed,
				interpolationStep: params.interpolationStep,
				isPlaying: params.isPlaying,
				workletIsPlaying: sonifierNodeRef.current?.isPlaying,
			}
		);
		if (sonifierNodeRef.current && sonifierNodeRef.current.isReady) {
			// Sync volume parameter
			const volumeDiff = Math.abs(
				sonifierNodeRef.current.volume.value - params.volume
			);
			if (volumeDiff > 0.001) {
				sonifierNodeRef.current.volume.value = params.volume;
			}

			// Sync playback speed parameter
			const speedDiff = Math.abs(
				sonifierNodeRef.current.playbackSpeed.value - params.playbackSpeed
			);
			if (speedDiff > 0.001) {
				sonifierNodeRef.current.playbackSpeed.value = params.playbackSpeed;
			}

			// Sync interpolation step parameter
			const interpDiff = Math.abs(
				sonifierNodeRef.current.interpolationStep.value -
					params.interpolationStep
			);
			if (interpDiff > 0.001) {
				sonifierNodeRef.current.interpolationStep.value =
					params.interpolationStep;
			}

			// Sync playing state (like useThreeWorklet)
			if (params.isPlaying && !sonifierNodeRef.current.isPlaying) {
				sonifierNodeRef.current.start();
			} else if (!params.isPlaying && sonifierNodeRef.current.isPlaying) {
				sonifierNodeRef.current.stop();
			}
		}

		console.log(
			`🔍 [useSonifierWorklet-${nodeId}] useEffect EXIT - Sync params`
		);
	}, [
		nodeId,
		params.volume,
		params.playbackSpeed,
		params.interpolationStep,
		params.isPlaying,
	]);

	/**
	 * Start audio generation
	 */
	const start = useCallback(async (): Promise<void> => {
		try {
			if (
				sonifierNodeRef.current &&
				sonifierNodeRef.current.isReady &&
				!params.isPlaying
			) {
				await Tone.start(); // Ensure Tone.js audio context is started
				sonifierNodeRef.current.start();
				updateAudioNode(nodeId, { ...params, isPlaying: true });
			}
		} catch (error) {
			handleError(error, `Failed to start sonifier worklet ${nodeId}`);
		}
	}, [nodeId, params, updateAudioNode, handleError]);

	/**
	 * Stop audio generation
	 */
	const stop = useCallback((): void => {
		try {
			if (
				sonifierNodeRef.current &&
				sonifierNodeRef.current.isReady &&
				params.isPlaying
			) {
				sonifierNodeRef.current.stop();
				updateAudioNode(nodeId, { ...params, isPlaying: false });
			}
		} catch (error) {
			handleError(error, `Failed to stop sonifier worklet ${nodeId}`);
		}
	}, [nodeId, params, updateAudioNode, handleError]);

	/**
	 * Set volume level
	 */
	const setVolume = useCallback(
		(volume: number): void => {
			console.log(`🔧 [useSonifierWorklet-${nodeId}] setVolume: ${volume}`);
			updateAudioNode(nodeId, { ...params, volume });
		},
		[nodeId, params, updateAudioNode]
	);

	/**
	 * Set playback speed
	 */
	const setPlaybackSpeed = useCallback(
		(playbackSpeed: number): void => {
			console.log(
				`🔧 [useSonifierWorklet-${nodeId}] setPlaybackSpeed: ${playbackSpeed}`
			);
			updateAudioNode(nodeId, { ...params, playbackSpeed });
		},
		[nodeId, params, updateAudioNode]
	);

	/**
	 * Set interpolation step
	 */
	const setInterpolationStep = useCallback(
		(interpolationStep: number): void => {
			console.log(
				`🔧 [useSonifierWorklet-${nodeId}] setInterpolationStep: ${interpolationStep}`
			);
			updateAudioNode(nodeId, { ...params, interpolationStep });
		},
		[nodeId, params, updateAudioNode]
	);

	/**
	 * Get the current sonifier worklet node instance
	 */
	const getSonifierNode = useCallback((): SonifierWorkletNode | null => {
		return sonifierNodeRef.current;
	}, []);

	/**
	 * Get individual channel outputs for connecting to other nodes
	 */
	const getOutputs = useCallback(() => {
		const node = sonifierNodeRef.current;
		if (!node) return null;

		return {
			outputX: node.outputX,
			outputY: node.outputY,
			outputR: node.outputR,
			outputG: node.outputG,
			outputB: node.outputB,
			output: node.output, // Main mixed output
		};
	}, []);

	// Return the hook interface
	return {
		// State
		isPlaying: params.isPlaying,
		isReady: sonifierReady && !!sonifierNodeRef.current?.isReady,
		params,
		error,

		// Controls
		start,
		stop,
		setVolume,
		setPlaybackSpeed,
		setInterpolationStep,

		// Advanced
		getSonifierNode,
		getOutputs,
		sharedBuffer,
	};
}
