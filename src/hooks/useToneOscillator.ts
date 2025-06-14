import { useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../stores/appStore';
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
 * Handles lifecycle, parameter updates, and state synchronization using Zustand as single source of truth
 */
export const useToneOscillator = (nodeId: string): ToneOscillatorControls => {
	// Store actions for managing both UI state and Tone.js instances
	const {
		audioNodes,
		addAudioNode,
		updateAudioNode,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		getAudioNodeInstance,
		initializeAudioContext,
	} = useAppStore();

	// Get audio node data from store
	const audioNode = audioNodes[nodeId];

	// Default parameters
	const defaultParams: OscillatorParams = useMemo(
		() => ({
			frequency: 440,
			detune: 0,
			waveType: 'sine',
			isPlaying: false,
			// volume: -12, // -12 dB volume (reasonable default)
		}),
		[]
	);

	const params = (audioNode?.params as OscillatorParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'oscillator', defaultParams);
		}
	}, [nodeId, audioNode, addAudioNode, defaultParams]);

	// Create oscillator instance and manage lifecycle
	useEffect(() => {
		const createOscillator = async () => {
			try {
				// Ensure audio context is initialized
				await initializeAudioContext();

				// Only create if no instance exists
				const existingInstance = getAudioNodeInstance(nodeId);
				if (!existingInstance) {
					const newOscillator = new Tone.Oscillator({
						frequency: params.frequency,
						detune: params.detune,
						type: params.waveType,
						volume: params.volume,
					}); // Not auto-connected to destination

					console.log(`🎵 Created oscillator for node ${nodeId}`);

					// Store instance in Zustand
					setAudioNodeInstance(nodeId, newOscillator);
				}
			} catch (error) {
				console.error(`Failed to create oscillator for node ${nodeId}:`, error);
			}
		};

		createOscillator();

		// Cleanup on unmount only
		return () => {
			const currentOscillator = getAudioNodeInstance(nodeId) as Tone.Oscillator;
			if (currentOscillator) {
				try {
					if (currentOscillator.state === 'started') {
						currentOscillator.stop();
					}
					currentOscillator.dispose();
				} catch (error) {
					console.error(
						`Error disposing oscillator for node ${nodeId}:`,
						error
					);
				}
				removeAudioNodeInstance(nodeId);
			}
		};
	}, [
		nodeId,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		initializeAudioContext,
		getAudioNodeInstance,
		params.frequency,
		params.detune,
		params.waveType,
		params.volume,
	]);

	// Update oscillator parameters when they change
	useEffect(() => {
		const currentOscillator = getAudioNodeInstance(nodeId) as Tone.Oscillator;
		if (!currentOscillator) return;

		try {
			const now = Tone.now();
			currentOscillator.frequency.setValueAtTime(params.frequency, now);
			currentOscillator.detune.setValueAtTime(params.detune, now);
			currentOscillator.type = params.waveType;
			currentOscillator.volume.setValueAtTime(params.volume, now);
		} catch (error) {
			console.error(
				`Error updating oscillator parameters for node ${nodeId}:`,
				error
			);
		}
	}, [params, nodeId, getAudioNodeInstance]);

	// Control functions
	const start = useCallback(async () => {
		const currentOscillator = getAudioNodeInstance(nodeId) as Tone.Oscillator;
		if (!currentOscillator) return;

		try {
			// Ensure audio context is started before playing
			if (Tone.getContext().state !== 'running') {
				await Tone.start();
			}

			if (currentOscillator.state !== 'started') {
				currentOscillator.start();
				updateAudioNode(nodeId, { isPlaying: true });
				console.log(`▶️ Started oscillator for node ${nodeId}`);
			}
		} catch (error) {
			console.error(`Error starting oscillator for node ${nodeId}:`, error);
		}
	}, [nodeId, updateAudioNode, getAudioNodeInstance]);

	const stop = useCallback(() => {
		const currentOscillator = getAudioNodeInstance(nodeId) as Tone.Oscillator;
		if (!currentOscillator) return;

		try {
			if (currentOscillator.state === 'started') {
				currentOscillator.stop();
				updateAudioNode(nodeId, { isPlaying: false });

				// Tone.js oscillators can only be started once, so we need a new one for next play
				// But we should do this immediately, not in a timeout
				currentOscillator.dispose();

				// Create new oscillator for next play
				const newOscillator = new Tone.Oscillator({
					frequency: params.frequency,
					detune: params.detune,
					type: params.waveType,
					volume: params.volume,
				});

				// Store the new instance
				setAudioNodeInstance(nodeId, newOscillator);

				console.log(`🛑 Stopped and recreated oscillator for node ${nodeId}`);

				// Small delay to ensure the new instance is stored, then trigger reconnection
				setTimeout(() => {
					// The useToneConnections hook should automatically handle reconnection
					// since it will detect the new instance when it next runs
					console.log(`🔄 Oscillator ${nodeId} ready for reconnection`);
				}, 10);
			}
		} catch (error) {
			console.error(`Error stopping oscillator for node ${nodeId}:`, error);
		}
	}, [
		nodeId,
		updateAudioNode,
		params,
		setAudioNodeInstance,
		getAudioNodeInstance,
	]);

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
