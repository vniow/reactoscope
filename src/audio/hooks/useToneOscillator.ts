import { useEffect, useCallback, useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../../shared/stores/appStore';
import type { OscillatorParams } from '../stores/audioSlice';

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
 * Simplified approach to prevent infinite loops by managing state locally and syncing with store
 */
export const useToneOscillator = (nodeId: string): ToneOscillatorControls => {
	const { audioNodes, addAudioNode, updateAudioNode } = useAppStore();

	const audioNode = audioNodes[nodeId];

	// Local instance management with ref
	const oscillatorRef = useRef<Tone.Oscillator | null>(null);
	const isInitializedRef = useRef(false);
	const hasCreatedRef = useRef(false); // To ensure creation logic runs once per mount

	const defaultParams: OscillatorParams = useMemo(
		() => ({
			frequency: 440,
			detune: 0,
			waveType: 'sine',
			isPlaying: false,
			volume: 0,
		}),
		[]
	);

	// Current parameters from store or defaults
	const params = (audioNode?.params as OscillatorParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode && !isInitializedRef.current) {
			isInitializedRef.current = true;
			addAudioNode(nodeId, 'oscillator', defaultParams);
		}
	}, [nodeId, audioNode, addAudioNode, defaultParams]);

	// Create oscillator instance once when node appears
	useEffect(() => {
		if (audioNode && !hasCreatedRef.current) {
			hasCreatedRef.current = true;

			// Use current params from audioNode for creation, or defaults
			const paramsForCreation =
				(audioNode.params as OscillatorParams) || defaultParams;

			const createOscillator = async () => {
				try {
					// Initialize audio context
					await useAppStore.getState().initializeAudioContext();

					const oscillator = new Tone.Oscillator({
						frequency: paramsForCreation.frequency,
						detune: paramsForCreation.detune,
						type: paramsForCreation.waveType,
						volume: paramsForCreation.volume,
					});

					oscillatorRef.current = oscillator;
					useAppStore.getState().setAudioNodeInstance(nodeId, oscillator);

					console.log(
						`🎵 Created oscillator instance for node ${nodeId} with initial params:`,
						paramsForCreation
					);

					if (paramsForCreation.isPlaying && oscillator.state !== 'started') {
						oscillator.start();
						console.log(
							`▶️ Auto-started oscillator for node ${nodeId} based on stored state at creation.`
						);
					}
				} catch (error) {
					console.error(
						`Failed to create oscillator instance for node ${nodeId}:`,
						error
					);
				}
			};

			createOscillator();
		}
	}, [audioNode, nodeId, defaultParams]);

	// Cleanup oscillator on unmount or nodeId change
	useEffect(() => {
		return () => {
			if (oscillatorRef.current) {
				try {
					if (oscillatorRef.current.state === 'started') {
						oscillatorRef.current.stop();
					}
					oscillatorRef.current.dispose();
					console.log(`🧹 Disposed oscillator for node ${nodeId}`);
				} catch (error) {
					console.error(
						`Error disposing oscillator for node ${nodeId}:`,
						error
					);
				}
				oscillatorRef.current = null;
				useAppStore.getState().removeAudioNodeInstance(nodeId);
			}
		};
	}, [nodeId]);

	// Update oscillator parameters when they change
	useEffect(() => {
		const oscillator = oscillatorRef.current;
		if (!oscillator) return;

		const { frequency, detune, waveType, volume } = params;

		try {
			const now = Tone.now();
			if (oscillator.frequency.value !== frequency) {
				oscillator.frequency.setValueAtTime(frequency, now);
			}
			if (oscillator.detune.value !== detune) {
				oscillator.detune.setValueAtTime(detune, now);
			}
			if (oscillator.type !== waveType) {
				oscillator.type = waveType;
			}
			if (volume !== undefined && oscillator.volume.value !== volume) {
				oscillator.volume.setValueAtTime(volume, now);
			}
		} catch (error) {
			console.error(
				`Error updating oscillator parameters for node ${nodeId}:`,
				error
			);
		}
	}, [nodeId, params]);

	// Control functions
	const start = useCallback(async () => {
		const oscillator = oscillatorRef.current;
		if (!oscillator) return;

		try {
			await Tone.start(); // Ensure audio context is running

			if (oscillator.state !== 'started') {
				oscillator.start();
				updateAudioNode(nodeId, { isPlaying: true });
				console.log(`▶️ Started oscillator for node ${nodeId}`);
			}
		} catch (error) {
			console.error(`Error starting oscillator for node ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode]);

	const stop = useCallback(() => {
		const oscillator = oscillatorRef.current;
		if (!oscillator) return;

		try {
			if (oscillator.state === 'started') {
				oscillator.stop();
				updateAudioNode(nodeId, { isPlaying: false });
				console.log(`🛑 Stopped oscillator for node ${nodeId}`);
			}
		} catch (error) {
			console.error(`Error stopping oscillator for node ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode]);

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
