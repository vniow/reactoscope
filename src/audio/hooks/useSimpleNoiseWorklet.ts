/**
 * useSimpleNoiseWorklet - Simplified hook for the direct AudioWorklet approach
 *
 * This hook manages a SimpleNoiseNode without complex store integration,
 * providing a cleaner interface for basic noise generation.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { SimpleNoiseNode } from '../SimpleNoiseNode';

export interface SimpleNoiseControls {
	start: () => Promise<void>;
	stop: () => void;
	setVolume: (volume: number) => void;
	isPlaying: boolean;
	isReady: boolean;
	volume: number;
	node: SimpleNoiseNode | null;
}

/**
 * Simple hook for managing a noise worklet
 *
 * @param initialVolume - Initial volume level (0-1)
 * @param autostart - Whether to start automatically when ready
 * @returns Controls for the noise worklet
 */
export const useSimpleNoiseWorklet = (
	initialVolume: number = 0.5,
	autostart: boolean = false
): SimpleNoiseControls => {
	const nodeRef = useRef<SimpleNoiseNode | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [volume, setVolumeState] = useState(initialVolume);

	// Create and initialize the node
	useEffect(() => {
		const initNode = async () => {
			try {
				// Create the noise node
				nodeRef.current = new SimpleNoiseNode({
					volume: initialVolume,
					autostart: false, // We'll handle autostart manually
				});

				// Wait for it to be ready
				await nodeRef.current.ready;

				setIsReady(true);
				console.log('🔊 SimpleNoiseNode initialized and ready');

				// Auto-start if requested
				if (autostart) {
					await nodeRef.current.start();
					setIsPlaying(true);
				}
			} catch (error) {
				console.error('❌ Failed to initialize SimpleNoiseNode:', error);
			}
		};

		initNode();

		// Cleanup on unmount
		return () => {
			if (nodeRef.current) {
				nodeRef.current.dispose();
				nodeRef.current = null;
			}
			setIsReady(false);
			setIsPlaying(false);
		};
	}, [initialVolume, autostart]); // Include dependencies

	// Control functions
	const start = useCallback(async (): Promise<void> => {
		if (nodeRef.current && isReady && !isPlaying) {
			try {
				await nodeRef.current.start();
				setIsPlaying(true);
				console.log('▶️ Started noise generation');
			} catch (error) {
				console.error('❌ Failed to start noise:', error);
			}
		}
	}, [isReady, isPlaying]);

	const stop = useCallback((): void => {
		if (nodeRef.current && isReady && isPlaying) {
			nodeRef.current.stop();
			setIsPlaying(false);
			console.log('⏹️ Stopped noise generation');
		}
	}, [isReady, isPlaying]);

	const setVolume = useCallback(
		(newVolume: number): void => {
			// Clamp volume to valid range
			const clampedVolume = Math.max(0, Math.min(1, newVolume));

			if (nodeRef.current && isReady) {
				nodeRef.current.setVolume(clampedVolume);
			}

			setVolumeState(clampedVolume);
			console.log(`🔊 Volume set to ${Math.round(clampedVolume * 100)}%`);
		},
		[isReady]
	);

	return {
		start,
		stop,
		setVolume,
		isPlaying,
		isReady,
		volume,
		node: nodeRef.current,
	};
};
