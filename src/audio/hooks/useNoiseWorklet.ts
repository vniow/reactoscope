/**
 * useNoiseWorklet - React hook for managing noise generator worklet nodes
 *
 * This hook provides a consistent interface for managing NoiseWorkletNode instances
 * within the Reactoscope ecosystem, handling lifecycle, parameters, and store integration.
 */

import { useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { NoiseWorkletNode } from '../worklets';
import { useAppStore } from '../../shared/stores/appStore';
import type { NoiseWorkletParams } from '../stores/audioSlice';

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
 *
 * @param nodeId - Unique identifier for the audio node
 * @returns Controls and state for the noise worklet
 */
export const useNoiseWorklet = (nodeId: string): NoiseWorkletControls => {
	// Input validation
	if (!nodeId || typeof nodeId !== 'string') {
		console.error('🚨 useNoiseWorklet: nodeId must be a non-empty string', {
			nodeId,
		});
		throw new Error('Invalid nodeId provided to useNoiseWorklet');
	}
	const workletRef = useRef<NoiseWorkletNode | null>(null);
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
	const defaultParams: NoiseWorkletParams = {
		isPlaying: false,
		volume: 0.5,
	};

	const params = (audioNode?.params as NoiseWorkletParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		console.log(
			`🔍 [useNoiseWorklet-${nodeId}] useEffect ENTRY - Initialize audio node`,
			{
				nodeId,
				hasAudioNode: !!audioNode,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		if (!audioNode) {
			try {
				console.log(
					`🔍 [useNoiseWorklet-${nodeId}] ADDING audio node to store`
				);
				addAudioNode(nodeId, 'noise-worklet', {
					isPlaying: false,
					volume: 0.5,
				});
				console.log(`📊 Initialized audio node in store: ${nodeId}`);
			} catch (error) {
				console.error(`🚨 Failed to initialize audio node ${nodeId}:`, error);
			}
		} else {
			console.log(
				`🔍 [useNoiseWorklet-${nodeId}] SKIPPING - audio node already exists`
			);
		}

		console.log(
			`🔍 [useNoiseWorklet-${nodeId}] useEffect EXIT - Initialize audio node`
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, addAudioNode]); // Remove audioNode to prevent infinite loop

	// Create and configure worklet
	useEffect(() => {
		console.log(
			`🔍 [useNoiseWorklet-${nodeId}] useEffect ENTRY - Create worklet`,
			{
				nodeId,
				hasWorkletRef: !!workletRef.current,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		const createWorklet = async (): Promise<void> => {
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

				console.log(`🔊 Created noise worklet for node ${nodeId}`);

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, workletRef.current);
			} catch (error) {
				console.error(
					`🚨 Failed to create noise worklet for node ${nodeId}:`,
					error
				);
			}
		};

		createWorklet();

		// Cleanup on unmount
		return () => {
			console.log(`🔍 [useNoiseWorklet-${nodeId}] useEffect CLEANUP starting`);
			if (workletRef.current) {
				try {
					if (isStartedRef.current) {
						console.log(
							`🔍 [useNoiseWorklet-${nodeId}] Stopping worklet before disposal`
						);
						workletRef.current.stop();
					}
					console.log(
						`🔍 [useNoiseWorklet-${nodeId}] Disposing worklet instance`
					);
					workletRef.current.dispose();
					removeAudioNodeInstance(nodeId);
				} catch (error) {
					console.error(
						`🚨 Error cleaning up noise worklet for node ${nodeId}:`,
						error
					);
				}
				workletRef.current = null;
			}
			console.log(`🔍 [useNoiseWorklet-${nodeId}] useEffect CLEANUP completed`);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		nodeId,
		// Removed store functions from deps to prevent infinite re-renders
		// These are not stable references but the effect only needs to run once per nodeId
	]);

	// Sync parameters with worklet
	useEffect(() => {
		console.log(
			`🔍 [useNoiseWorklet-${nodeId}] useEffect ENTRY - Sync params`,
			{
				nodeId,
				hasWorklet: !!workletRef.current,
				isReady: workletRef.current?.isReady,
				volume: params.volume,
				isPlaying: params.isPlaying,
				workletIsPlaying: workletRef.current?.isPlaying,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		if (workletRef.current && workletRef.current.isReady) {
			// Sync volume parameter
			if (workletRef.current.volume.value !== params.volume) {
				console.log(
					`🔍 [useNoiseWorklet-${nodeId}] Updating volume: ${params.volume}`
				);
				workletRef.current.setVolume(params.volume);
			}

			// Sync playing state
			if (params.isPlaying && !workletRef.current.isPlaying) {
				console.log(`🔍 [useNoiseWorklet-${nodeId}] Starting worklet`);
				workletRef.current.start();
				isStartedRef.current = true;
			} else if (!params.isPlaying && workletRef.current.isPlaying) {
				console.log(`🔍 [useNoiseWorklet-${nodeId}] Stopping worklet`);
				workletRef.current.stop();
				isStartedRef.current = false;
			}
		}

		console.log(`🔍 [useNoiseWorklet-${nodeId}] useEffect EXIT - Sync params`);
	}, [params.volume, params.isPlaying, nodeId]);

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
				console.log(`▶️ Started noise worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(`🚨 Failed to start noise worklet ${nodeId}:`, error);
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
				console.log(`⏹️ Stopped noise worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(`🚨 Failed to stop noise worklet ${nodeId}:`, error);
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
