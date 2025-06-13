import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../stores/appStore';
import { toneRegistry } from '../utils/toneRegistry';
import type { OscillatorParams } from '../stores/slices/audioSlice';

export interface ToneOscillatorControls {
	start: () => void;
	stop: () => void;
	updateFrequency: (frequency: number) => void;
	updateDetune: (detune: number) => void;
	updateWaveType: (
		waveType: 'sine' | 'square' | 'triangle' | 'sawtooth'
	) => void;
	updateVolume: (volume: number) => void;
	isPlaying: boolean;
	params: OscillatorParams;
}

/**
 * Custom hook for managing a Tone.js Oscillator
 * Handles lifecycle, parameter updates, and state synchronization
 */
export const useToneOscillator = (nodeId: string): ToneOscillatorControls => {
	const oscillatorRef = useRef<Tone.Oscillator | null>(null);
	const isStartedRef = useRef(false);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const { updateAudioNode, addAudioNode, initializeAudioContext } =
		useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: OscillatorParams = {
		frequency: 440,
		detune: 0,
		waveType: 'sine',
		isPlaying: false,
		volume: 0, // 0 dB volume
	};

	const params = (audioNode?.params as OscillatorParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'oscillator', {
				frequency: 440,
				detune: 0,
				waveType: 'sine',
				isPlaying: false,
				volume: 0, // 0 dB volume
			});
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure oscillator
	useEffect(() => {
		console.log(`🎵 useToneOscillator effect running for ${nodeId}`, {
			params,
			audioNode,
		});

		const createOscillator = async () => {
			try {
				console.log(`🎵 About to initialize audio context for ${nodeId}`);
				// Ensure audio context is started
				await initializeAudioContext();
				console.log(`🎵 Audio context initialized for ${nodeId}`);

				// Create new oscillator WITHOUT auto-connecting to destination
				console.log(`🎵 Creating oscillator for ${nodeId}`, params);
				oscillatorRef.current = new Tone.Oscillator({
					frequency: params.frequency,
					detune: params.detune,
					type: params.waveType,
					volume: params.volume,
				}); // Removed .toDestination() so destination node can control connections

				// Register oscillator in centralized registry
				console.log(`🎵 Registering oscillator-${nodeId} in tone registry`);
				toneRegistry.register(`oscillator-${nodeId}`, oscillatorRef.current);

				console.log(`🎵 Created oscillator for node ${nodeId}:`, params);
			} catch (error) {
				console.error(
					`🚨 Failed to create oscillator for node ${nodeId}:`,
					error
				);
			}
		};

		createOscillator();

		// Cleanup on unmount
		return () => {
			if (oscillatorRef.current) {
				try {
					if (isStartedRef.current) {
						oscillatorRef.current.stop();
					}

					// Remove from centralized registry
					toneRegistry.unregister(`oscillator-${nodeId}`);

					oscillatorRef.current.dispose();
					console.log(`🗑️ Disposed oscillator for node ${nodeId}`);
				} catch (error) {
					console.error(
						`🚨 Error disposing oscillator for node ${nodeId}:`,
						error
					);
				}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, initializeAudioContext]); // Re-create only when nodeId changes

	// Update oscillator parameters when store params change
	useEffect(() => {
		if (!oscillatorRef.current) return;

		try {
			const osc = oscillatorRef.current;
			const now = Tone.now();

			// Update frequency
			osc.frequency.setValueAtTime(params.frequency, now);

			// Update detune
			osc.detune.setValueAtTime(params.detune, now);

			// Update wave type
			osc.type = params.waveType;

			// Update volume
			osc.volume.setValueAtTime(params.volume, now);

			console.log(`🎛️ Updated oscillator ${nodeId} parameters:`, params);
		} catch (error) {
			console.error(`🚨 Error updating oscillator ${nodeId}:`, error);
		}
	}, [nodeId, params]);

	// Control functions
	const start = useCallback(async () => {
		console.log(
			`🎵 START called for oscillator ${nodeId}, isStarted: ${isStartedRef.current}`
		);

		if (!oscillatorRef.current || isStartedRef.current) return;

		try {
			// Ensure audio context is started before playing
			console.log(
				`🔊 Starting oscillator ${nodeId} - checking audio context...`
			);

			// Force start the audio context on user interaction
			if (Tone.getContext().state !== 'running') {
				console.log(`🔊 Audio context not running, starting now...`);
				await Tone.start();
				console.log(`🔊 Audio context started successfully`);
			}

			await initializeAudioContext();

			// Log current volume for debugging
			console.log(`🔊 Oscillator ${nodeId} volume: ${params.volume} dB`);
			console.log(`🔊 Oscillator ${nodeId} frequency: ${params.frequency} Hz`);

			// // TEMPORARY TEST: Connect directly to destination to verify audio works
			// oscillatorRef.current.connect(Tone.getDestination());
			// console.log(
			// 	`🔌 TEMP: Connected oscillator ${nodeId} directly to destination for testing`
			// );

			oscillatorRef.current.start();
			isStartedRef.current = true;
			updateAudioNode(nodeId, { isPlaying: true });
			console.log(`▶️ Started oscillator ${nodeId}`);
		} catch (error) {
			console.error(`🚨 Error starting oscillator ${nodeId}:`, error);
		}
	}, [
		nodeId,
		updateAudioNode,
		initializeAudioContext,
		params.volume,
		params.frequency,
	]);

	const stop = useCallback(() => {
		if (!oscillatorRef.current || !isStartedRef.current) return;

		try {
			oscillatorRef.current.stop();
			isStartedRef.current = false;
			updateAudioNode(nodeId, { isPlaying: false });
			console.log(`⏹️ Stopped oscillator ${nodeId}`);
			// Create a new oscillator for next play
			setTimeout(() => {
				if (oscillatorRef.current) {
					oscillatorRef.current.dispose();
					oscillatorRef.current = new Tone.Oscillator({
						frequency: params.frequency,
						detune: params.detune,
						type: params.waveType,
						volume: params.volume,
					}); // Removed .toDestination() so destination node can control connections

					// Register new oscillator in centralized registry
					toneRegistry.register(`oscillator-${nodeId}`, oscillatorRef.current);
				}
			}, 100);
		} catch (error) {
			console.error(`🚨 Error stopping oscillator ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode, params]);

	const updateFrequency = useCallback(
		(frequency: number) => {
			updateAudioNode(nodeId, { frequency });
		},
		[nodeId, updateAudioNode]
	);

	const updateDetune = useCallback(
		(detune: number) => {
			updateAudioNode(nodeId, { detune });
		},
		[nodeId, updateAudioNode]
	);

	const updateWaveType = useCallback(
		(waveType: 'sine' | 'square' | 'triangle' | 'sawtooth') => {
			updateAudioNode(nodeId, { waveType });
		},
		[nodeId, updateAudioNode]
	);

	const updateVolume = useCallback(
		(volume: number) => {
			updateAudioNode(nodeId, { volume });
		},
		[nodeId, updateAudioNode]
	);

	return {
		start,
		stop,
		updateFrequency,
		updateDetune,
		updateWaveType,
		updateVolume,
		isPlaying: params.isPlaying,
		params,
	};
};
