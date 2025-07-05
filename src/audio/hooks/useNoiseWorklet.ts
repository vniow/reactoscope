/**
 * React hook for managing a noise generator worklet
 */
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { NoiseNode } from '../core/NoiseNode';

export interface UseNoiseWorkletOptions {
	autostart?: boolean;
	debug?: boolean;
}

export interface UseNoiseWorkletResult {
	noiseNode: NoiseNode | null;
	isReady: boolean;
	isPlaying: boolean;
	amplitude: number;
	start: () => Promise<void>;
	stop: () => void;
	setAmplitude: (value: number) => void;
}

/**
 * Hook to create and manage a noise generator worklet
 */
export function useNoiseWorklet(
	options: UseNoiseWorkletOptions = {}
): UseNoiseWorkletResult {
	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [amplitude, setAmplitudeState] = useState(0.5);

	const noiseNodeRef = useRef<NoiseNode | null>(null);
	const mountedRef = useRef(true);

	// Initialize the noise node
	useEffect(() => {
		mountedRef.current = true;

		const initializeNode = async () => {
			try {
				console.log('🎛️ Initializing noise worklet...');

				const node = new NoiseNode({
					amplitude: 0.5, // Use default, will be updated via setAmplitude
					autostart: options.autostart,
					debug: options.debug,
				});

				await node.ready;

				if (!mountedRef.current) {
					node.dispose();
					return;
				}

				noiseNodeRef.current = node;
				setIsReady(true);

				if (options.autostart) {
					setIsPlaying(true);
				}

				console.log('✅ Noise worklet initialized successfully');
			} catch (error) {
				console.error('❌ Failed to initialize noise worklet:', error);
				// Set ready to false in case of error to show proper state in UI
				setIsReady(false);
			}
		};

		initializeNode();

		return () => {
			mountedRef.current = false;
			if (noiseNodeRef.current) {
				console.log('🧹 Cleaning up noise worklet');
				noiseNodeRef.current.dispose();
				noiseNodeRef.current = null;
			}
			// Reset states on cleanup
			setIsReady(false);
			setIsPlaying(false);
		};
	}, [options.autostart, options.debug]);

	const start = async (): Promise<void> => {
		if (noiseNodeRef.current && isReady && !isPlaying) {
			try {
				// Ensure Tone.js context is started - this is crucial for web audio
				if (Tone.getContext().state !== 'running') {
					await Tone.start();
					console.log('🎵 Tone.js context started');
				}

				noiseNodeRef.current.start();
				setIsPlaying(true);

				if (options.debug) {
					console.log('▶️ Noise generation started');
				}
			} catch (error) {
				console.error('❌ Failed to start noise generation:', error);
			}
		}
	};

	const stop = (): void => {
		if (noiseNodeRef.current && isReady && isPlaying) {
			try {
				noiseNodeRef.current.stop();
				setIsPlaying(false);

				if (options.debug) {
					console.log('⏹️ Noise generation stopped');
				}
			} catch (error) {
				console.error('❌ Failed to stop noise generation:', error);
			}
		}
	};

	const setAmplitude = (value: number): void => {
		const clampedValue = Math.max(0, Math.min(1, value));
		setAmplitudeState(clampedValue);

		if (noiseNodeRef.current && isReady) {
			noiseNodeRef.current.setAmplitude(clampedValue);
		}
	};

	return {
		noiseNode: noiseNodeRef.current,
		isReady,
		isPlaying,
		amplitude,
		start,
		stop,
		setAmplitude,
	};
}
