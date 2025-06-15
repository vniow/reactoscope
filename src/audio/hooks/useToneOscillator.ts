import { useEffect, useCallback, useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../../shared/stores/appStore';
import type { OscillatorParams, AudioNodeData } from '../stores/audioSlice'; // Added AudioNodeData

/**
 * Defines the possible wave types for an oscillator.
 */
export type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

/**
 * Defines the control interface for a Tone.js Oscillator.
 */
export interface ToneOscillatorControls {
	start: () => void;
	stop: () => void;
	updateFrequency: (frequency: number) => void;
	updateDetune: (detune: number) => void;
	updateWaveType: (
		waveType: WaveType // Use the exported WaveType
	) => void;
	updateVolume: (volume: number) => void;
	isPlaying: boolean;
	params: Readonly<OscillatorParams>; // Make params readonly for consumers
}

const RAMP_DURATION = 0.02; // 20ms for smooth parameter transitions

/**
 * Custom React hook to manage a Tone.js Oscillator instance.
 * This hook handles the lifecycle of the oscillator, including its creation,
 * parameter updates, and disposal, while synchronizing its state with a global Zustand store.
 *
 * @param nodeId - The unique identifier for the audio node.
 * @returns An object containing controls for the oscillator and its current parameters.
 */
export function useToneOscillator(nodeId: string): ToneOscillatorControls {
	const {
		getAudioNode, // Use the stable getter
		addAudioNode,
		updateAudioNode,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		initializeAudioContext,
	} = useAppStore();

	// Use the stable getter to retrieve the audio node data
	// This ensures that the component doesn't re-render unnecessarily when other nodes change.
	const audioNode = getAudioNode(nodeId) as AudioNodeData | undefined;

	// Ref to hold the Tone.js Oscillator instance
	const oscillatorRef = useRef<Tone.Oscillator | null>(null);
	// Ref to track if the audio node has been initialized in the store
	const isInitializedInStoreRef = useRef(false);
	// Ref to track if the Tone.js oscillator instance has been created
	const hasInstanceBeenCreatedRef = useRef(false);

	// Default parameters for a new oscillator node
	const defaultParams: Readonly<OscillatorParams> = useMemo(
		() =>
			Object.freeze({
				// Freeze to ensure immutability
				frequency: 440,
				detune: 0,
				waveType: 'sine',
				isPlaying: false,
				volume: 0, // Default to 0 volume (muted)
			}),
		[]
	);

	// Current parameters, derived from the store or defaults
	// Ensure params are treated as immutable
	const params = useMemo(
		() =>
			Object.freeze((audioNode?.params as OscillatorParams) || defaultParams),
		[audioNode?.params, defaultParams]
	);

	// Effect to initialize the audio node in the Zustand store if it doesn't exist
	useEffect(() => {
		// Check if the node exists using the getter before attempting to add.
		// This check is more robust as it directly queries the current state.
		if (!getAudioNode(nodeId) && !isInitializedInStoreRef.current) {
			isInitializedInStoreRef.current = true;
			addAudioNode(nodeId, 'oscillator', { ...defaultParams }); // Store a mutable copy
			console.log(
				`🎛️ Initialized oscillator node ${nodeId} in store with default params.`
			);
		}
	}, [nodeId, addAudioNode, defaultParams, getAudioNode]); // Added getAudioNode to dependencies

	// Effect to create the Tone.js Oscillator instance once the audioNode is available in the store
	useEffect(() => {
		// Ensure audioNode (retrieved via getAudioNode) exists and instance hasn't been created yet
		const currentNodeData = getAudioNode(nodeId);
		if (currentNodeData && !hasInstanceBeenCreatedRef.current) {
			hasInstanceBeenCreatedRef.current = true;

			const paramsForCreation =
				(currentNodeData.params as OscillatorParams) || defaultParams;

			async function createOscillatorInstance() {
				try {
					await initializeAudioContext(); // Ensure Tone.js audio context is started

					const newOscillator = new Tone.Oscillator({
						frequency: paramsForCreation.frequency,
						detune: paramsForCreation.detune,
						type: paramsForCreation.waveType,
						volume: paramsForCreation.volume,
					});

					oscillatorRef.current = newOscillator;
					setAudioNodeInstance(nodeId, newOscillator); // Store instance in Zustand

					console.log(
						`🎵 Created Tone.Oscillator instance for node ${nodeId} with params:`,
						paramsForCreation
					);

					// Auto-start if isPlaying is true in initial params
					if (
						paramsForCreation.isPlaying &&
						newOscillator.state !== 'started'
					) {
						newOscillator.start();
						console.log(
							`▶️ Auto-started oscillator for node ${nodeId} based on initial state.`
						);
					}
				} catch (error) {
					console.error(
						`Error creating Tone.Oscillator instance for node ${nodeId}:`,
						error
					);
				}
			}

			createOscillatorInstance();
		}
		// Dependencies: only re-run if nodeId changes or audioNode appears for the first time.
		// defaultParams is stable.
	}, [
		audioNode,
		nodeId,
		defaultParams,
		initializeAudioContext,
		setAudioNodeInstance,
		getAudioNode, // Added getAudioNode as a dependency
	]);

	// Effect for cleaning up the oscillator instance on component unmount or if nodeId changes
	useEffect(() => {
		return () => {
			const currentOscillator = oscillatorRef.current;
			if (currentOscillator) {
				try {
					if (currentOscillator.state === 'started') {
						currentOscillator.stop();
					}
					currentOscillator.dispose();
					console.log(`🧹 Disposed Tone.Oscillator for node ${nodeId}.`);
				} catch (error) {
					console.error(
						`Error disposing Tone.Oscillator for node ${nodeId}:`,
						error
					);
				}
				oscillatorRef.current = null;
				removeAudioNodeInstance(nodeId); // Remove instance from Zustand
			}
			// Reset refs related to instance creation and store initialization for this nodeId
			hasInstanceBeenCreatedRef.current = false;
			isInitializedInStoreRef.current = false;
		};
	}, [nodeId, removeAudioNodeInstance]);

	// Effect to update Tone.js oscillator parameters when `params` from the store change
	useEffect(() => {
		const currentOscillator = oscillatorRef.current;
		if (!currentOscillator || !audioNode) return; // Only update if instance and store data exist

		// Destructure params for clarity
		const { frequency, detune, waveType, volume, isPlaying } = params;

		try {
			const now = Tone.now(); // Get current audio context time for scheduling

			// Smoothly update frequency
			if (currentOscillator.frequency.value !== frequency) {
				currentOscillator.frequency.cancelScheduledValues(now);
				currentOscillator.frequency.linearRampToValueAtTime(
					frequency,
					now + RAMP_DURATION
				);
			}

			// Smoothly update detune
			if (currentOscillator.detune.value !== detune) {
				currentOscillator.detune.cancelScheduledValues(now);
				currentOscillator.detune.linearRampToValueAtTime(
					detune,
					now + RAMP_DURATION
				);
			}

			// Update wave type (discrete change)
			if (currentOscillator.type !== waveType) {
				currentOscillator.type = waveType;
			}

			// Smoothly update volume
			if (volume !== undefined && currentOscillator.volume.value !== volume) {
				currentOscillator.volume.cancelScheduledValues(now);
				currentOscillator.volume.linearRampToValueAtTime(
					volume,
					now + RAMP_DURATION
				);
			}

			// Handle play/stop based on isPlaying state, if different from oscillator's current state
			if (isPlaying && currentOscillator.state !== 'started') {
				currentOscillator.start();
				console.log(
					`▶️ Started oscillator for node ${nodeId} due to param change.`
				);
			} else if (!isPlaying && currentOscillator.state === 'started') {
				currentOscillator.stop();
				console.log(
					`🛑 Stopped oscillator for node ${nodeId} due to param change.`
				);
			}
		} catch (error) {
			console.error(
				`Error updating Tone.Oscillator parameters for node ${nodeId}:`,
				error
			);
			// Potentially add more robust error handling, e.g., trying to reset to a safe state
		}
		// This effect depends on `params` (which is memoized and changes when store data changes)
		// and `nodeId` (to ensure correct oscillator for the params).
	}, [params, nodeId, audioNode]); // audioNode dependency ensures we have the latest store data context

	// Control function to start the oscillator
	const start = useCallback(async () => {
		const currentOscillator = oscillatorRef.current;
		if (!currentOscillator) {
			console.warn(
				`Cannot start: Oscillator for node ${nodeId} not yet initialized.`
			);
			return;
		}

		try {
			await initializeAudioContext(); // Ensure audio context is active
			if (currentOscillator.state !== 'started') {
				currentOscillator.start();
				updateAudioNode(nodeId, { isPlaying: true }); // Sync state with store
				console.log(`▶️ User started oscillator for node ${nodeId}.`);
			}
		} catch (error) {
			console.error(
				`Error starting Tone.Oscillator for node ${nodeId}:`,
				error
			);
		}
	}, [nodeId, updateAudioNode, initializeAudioContext]);

	// Control function to stop the oscillator
	const stop = useCallback(() => {
		const currentOscillator = oscillatorRef.current;
		if (!currentOscillator) {
			// This case should ideally not happen if UI is disabled before instance creation
			console.warn(
				`Cannot stop: Oscillator for node ${nodeId} not initialized.`
			);
			return;
		}

		try {
			if (currentOscillator.state === 'started') {
				currentOscillator.stop();
				updateAudioNode(nodeId, { isPlaying: false }); // Sync state with store
				console.log(`🛑 User stopped oscillator for node ${nodeId}.`);
			}
		} catch (error) {
			console.error(
				`Error stopping Tone.Oscillator for node ${nodeId}:`,
				error
			);
		}
	}, [nodeId, updateAudioNode]);

	// Control function to update frequency
	const updateFrequency = useCallback(
		(frequency: number) => {
			updateAudioNode(nodeId, { frequency });
		},
		[nodeId, updateAudioNode]
	);

	// Control function to update detune
	const updateDetune = useCallback(
		(detune: number) => {
			updateAudioNode(nodeId, { detune });
		},
		[nodeId, updateAudioNode]
	);

	// Control function to update wave type
	const updateWaveType = useCallback(
		(waveType: 'sine' | 'square' | 'triangle' | 'sawtooth') => {
			updateAudioNode(nodeId, { waveType });
		},
		[nodeId, updateAudioNode]
	);

	// Control function to update volume
	const updateVolume = useCallback(
		(volume: number) => {
			updateAudioNode(nodeId, { volume });
		},
		[nodeId, updateAudioNode]
	);

	// Return the memoized control interface
	return useMemo(
		() => ({
			start,
			stop,
			updateFrequency,
			updateDetune,
			updateWaveType,
			updateVolume,
			isPlaying: params.isPlaying, // Reflect current playing state from params
			params, // Provide readonly params to the consumer
		}),
		[
			start,
			stop,
			updateFrequency,
			updateDetune,
			updateWaveType,
			updateVolume,
			params,
		]
	);
}
