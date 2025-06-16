import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../../shared/stores/appStore';
import type { Edge } from '@xyflow/react';

export interface ToneAnalyserModularControls {
	updateSize: (size: number) => void;
	updateSmoothing: (smoothing: number) => void;
	getAnalyser: () => Tone.Analyser | null;
	params: {
		size: number;
		smoothing: number;
		isConnected: boolean;
	};
	isAnalyserReady: boolean;
}

/**
 * useToneAnalyserModular - Modular React hook for managing a single Tone.js Analyser node
 *
 * This hook manages a single Tone.Analyser instance, registering it under a parent nodeId
 * with a specific channel key (e.g., 'X', 'Y'). Parameters like size and smoothing are
 * managed locally within the hook.
 *
 * @param nodeId - Unique identifier for the parent audio node
 * @param channel - Channel identifier (e.g., 'X', 'Y'), used as a key in the parent node's instances map
 * @param targetHandle - The target handle ID this analyser listens for connections on (e.g., 'audio-in-X')
 * @param initialSize - Initial FFT size for the analyser
 * @param initialSmoothing - Initial smoothing factor for the analyser
 * @returns Controls and state for the single analyser node
 */
export const useToneAnalyserModular = (
	nodeId: string,
	channel: string,
	targetHandle: string,
	initialSize: number = 1024,
	initialSmoothing: number = 0.8
): ToneAnalyserModularControls => {
	// Input validation
	if (!nodeId || typeof nodeId !== 'string') {
		console.error(
			'🚨 useToneAnalyserModular: nodeId must be a non-empty string',
			{ nodeId }
		);
		throw new Error('Invalid nodeId provided to useToneAnalyserModular');
	}
	if (!channel || typeof channel !== 'string') {
		console.error(
			'🚨 useToneAnalyserModular: channel must be a non-empty string',
			{ channel }
		);
		throw new Error('Invalid channel provided to useToneAnalyserModular');
	}
	if (!targetHandle || typeof targetHandle !== 'string') {
		console.error(
			'🚨 useToneAnalyserModular: targetHandle must be a non-empty string',
			{ targetHandle }
		);
		throw new Error('Invalid targetHandle provided to useToneAnalyserModular');
	}

	const {
		setAudioNodeInstance,
		removeAudioNodeInstance,
		getAudioNodeInstance,
		initializeAudioContext,
	} = useAppStore();

	const [size, setSize] = useState(initialSize);
	const [smoothing, setSmoothing] = useState(initialSmoothing);
	const [isAnalyserReady, setIsAnalyserReady] = useState(false);
	const analyserRef = useRef<Tone.Analyser | null>(null);

	const edges = useEdges();
	const isConnected = useMemo(() => {
		return edges.some(
			(edge: Edge) =>
				edge.target === nodeId && edge.targetHandle === targetHandle
		);
	}, [edges, nodeId, targetHandle]);

	useEffect(() => {
		let didDispose = false;

		const setupAnalyser = async () => {
			await initializeAudioContext();
			if (didDispose) return;

			// Check if an instance already exists in the store for this nodeId/channel
			// This can happen with HMR or if the parent node already has this instance.
			const instanceInStore = getAudioNodeInstance(nodeId, channel) as
				| Tone.Analyser
				| undefined;

			if (instanceInStore) {
				// Adopt instance, ensure its params match initial state of this hook instance
				// (or current state if we prefer that, but initial makes sense for adoption)
				instanceInStore.size = initialSize;
				instanceInStore.smoothing = initialSmoothing;
				analyserRef.current = instanceInStore;
				// console.log(
				// \`📊 Adopted modular analyser: ${nodeId}_${channel}, size: ${instanceInStore.size}, smoothing: ${instanceInStore.smoothing}\`
				// );
			} else {
				const newAnalyser = new Tone.Analyser({
					type: 'waveform',
					size: initialSize, // Use initialSize from props for creation
					smoothing: initialSmoothing, // Use initialSmoothing from props for creation
				});
				setAudioNodeInstance(nodeId, newAnalyser, channel);
				analyserRef.current = newAnalyser;
				// console.log(
				// \`📊 Created modular analyser: ${nodeId}_${channel}, size: ${newAnalyser.size}, smoothing: ${newAnalyser.smoothing}\`
				// );
			}

			// Sync current local state (size, smoothing) to the analyser instance
			// This is important if initialSize/initialSmoothing differ from useState defaults
			// or if the adopted instance needs to match the current state of an already active hook.
			if (analyserRef.current) {
				if (analyserRef.current.size !== size) analyserRef.current.size = size;
				if (analyserRef.current.smoothing !== smoothing)
					analyserRef.current.smoothing = smoothing;
			}

			if (!didDispose) setIsAnalyserReady(true);
		};

		setupAnalyser();

		return () => {
			didDispose = true;
			// console.log(\`🧹 Attempting to dispose modular analyser: ${nodeId}_${channel}\`);
			if (analyserRef.current) {
				try {
					// Check if the instance is still managed by this hook before disposing
					// This check might be complex if another hook instance adopted it.
					// For now, assume if analyserRef.current is set, this hook owns it.
					analyserRef.current.dispose();
					// console.log(\`🧹 Disposed modular analyser: ${nodeId}_${channel}\`);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (e) {
					// console.error(
					// \`🚨 Error disposing analyser ${nodeId}_${channel}:\`,
					// e
					// );
				}
			}
			removeAudioNodeInstance(nodeId, channel); // Remove from store
			analyserRef.current = null;
			setIsAnalyserReady(false);
			// console.log(
			// \`🗑️ Removed modular analyser instance from store: ${nodeId}_${channel}\`
			// );
		};
	}, [
		nodeId,
		channel,
		initialSize,
		initialSmoothing,
		initializeAudioContext,
		getAudioNodeInstance,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		size, // Add size and smoothing to re-run if they change from parent,
		smoothing, // though they are managed by internal useState here.
	]);

	// Effect to update Tone.Analyser instance when local size/smoothing state changes
	useEffect(() => {
		if (analyserRef.current && isAnalyserReady) {
			if (analyserRef.current.size !== size) {
				analyserRef.current.size = size;
				// console.log(\`🎛️ Updated analyser ${nodeId}_${channel} size to: ${size}\`);
			}
			if (analyserRef.current.smoothing !== smoothing) {
				analyserRef.current.smoothing = smoothing;
				// console.log(
				// \`🎛️ Updated analyser ${nodeId}_${channel} smoothing to: ${smoothing.toFixed(1)}\`
				// );
			}
		}
	}, [size, smoothing, isAnalyserReady, nodeId, channel]); // Added nodeId, channel for logging context

	const updateSizeCallback = useCallback(
		(newSize: number): void => {
			if (
				typeof newSize !== 'number' ||
				newSize <= 0 ||
				!Number.isInteger(newSize) ||
				(newSize & (newSize - 1)) !== 0 // Power of 2 check
			) {
				console.error(
					'🚨 Invalid FFT size value (must be a power of 2 > 0):',
					newSize
				);
				return;
			}
			// Typical range check, e.g., Tone.Analyser.defaults.size is 1024
			// Min FFT size is 32. Max can be quite large.
			if (newSize < 32 || newSize > 32768) {
				console.warn(
					'🚨 FFT size is outside typical range (32-32768):',
					newSize
				);
			}
			setSize(newSize);
		},
		[setSize]
	);

	const updateSmoothingCallback = useCallback(
		(newSmoothing: number): void => {
			if (
				typeof newSmoothing !== 'number' ||
				newSmoothing < 0 ||
				newSmoothing > 1
			) {
				console.error(
					'🚨 Invalid smoothing value (must be 0-1):',
					newSmoothing
				);
				return;
			}
			setSmoothing(newSmoothing);
		},
		[setSmoothing]
	);

	const getAnalyserCallback = useCallback((): Tone.Analyser | null => {
		return analyserRef.current;
	}, []);

	return {
		updateSize: updateSizeCallback,
		updateSmoothing: updateSmoothingCallback,
		getAnalyser: getAnalyserCallback,
		params: {
			size,
			smoothing,
			isConnected,
		},
		isAnalyserReady,
	};
};
