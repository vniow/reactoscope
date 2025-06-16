/**
 * useSimpleNoiseWorkletStore - Store-integrated version of the simple noise worklet
 *
 * This version integrates with your existing audio store for consistency with other nodes,
 * while still using the simplified direct AudioWorklet approach.
 */

import { useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { SimpleNoiseNode } from '../SimpleNoiseNode';
import { useAppStore } from '../../shared/stores/appStore';

export interface SimpleNoiseStoreParams {
	isPlaying: boolean;
	volume: number;
}

export interface SimpleNoiseStoreControls {
	start: () => Promise<void>;
	stop: () => void;
	setVolume: (volume: number) => void;
	isPlaying: boolean;
	isReady: boolean;
	params: SimpleNoiseStoreParams;
	workletNode: SimpleNoiseNode | null;
}

/**
 * Store-integrated hook for managing a SimpleNoiseNode
 *
 * @param nodeId - Unique identifier for the audio node
 * @returns Controls and state for the simple noise worklet
 */
export const useSimpleNoiseWorkletStore = (
	nodeId: string
): SimpleNoiseStoreControls => {
	// Input validation
	if (!nodeId || typeof nodeId !== 'string') {
		console.error(
			'🚨 useSimpleNoiseWorkletStore: nodeId must be a non-empty string',
			{
				nodeId,
			}
		);
		throw new Error('Invalid nodeId provided to useSimpleNoiseWorkletStore');
	}

	const workletRef = useRef<SimpleNoiseNode | null>(null);

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
	const defaultParams: SimpleNoiseStoreParams = {
		isPlaying: false,
		volume: 0.5,
	};

	const params = (audioNode?.params as SimpleNoiseStoreParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			try {
				addAudioNode(nodeId, 'simple-noise-worklet', {
					isPlaying: false,
					volume: 0.5,
				});
				console.log(
					`📊 Initialized simple noise audio node in store: ${nodeId}`
				);
			} catch (error) {
				console.error(
					`🚨 Failed to initialize simple noise audio node ${nodeId}:`,
					error
				);
			}
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure worklet
	useEffect(() => {
		const createWorklet = async (): Promise<void> => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new simple noise worklet
				workletRef.current = new SimpleNoiseNode({
					volume: params.volume,
				});

				// Wait for worklet to be ready
				await workletRef.current.ready;

				console.log(`🔊 Created simple noise worklet for node ${nodeId}`);

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, workletRef.current);
			} catch (error) {
				console.error(
					`🚨 Failed to create simple noise worklet for node ${nodeId}:`,
					error
				);
			}
		};

		createWorklet();

		// Cleanup on unmount
		return () => {
			if (workletRef.current) {
				try {
					if (workletRef.current.isPlaying) {
						workletRef.current.stop();
					}
					workletRef.current.dispose();
					removeAudioNodeInstance(nodeId);
				} catch (error) {
					console.error(
						`🚨 Error cleaning up simple noise worklet for node ${nodeId}:`,
						error
					);
				}
				workletRef.current = null;
			}
		};
	}, [
		nodeId,
		params.volume,
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
			} else if (!params.isPlaying && workletRef.current.isPlaying) {
				workletRef.current.stop();
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
				await workletRef.current.start();

				// Update store
				updateAudioNode(nodeId, { isPlaying: true });
				console.log(`▶️ Started simple noise worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(
				`🚨 Failed to start simple noise worklet ${nodeId}:`,
				error
			);
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

				// Update store
				updateAudioNode(nodeId, { isPlaying: false });
				console.log(`⏹️ Stopped simple noise worklet: ${nodeId}`);
			}
		} catch (error) {
			console.error(`🚨 Failed to stop simple noise worklet ${nodeId}:`, error);
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
