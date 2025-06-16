import { useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../../shared/stores/appStore';
import type { AnalyserParams } from '../stores/audioSlice';
import type { Edge } from '@xyflow/react';

export interface ToneAnalyserControls {
	updateSize: (size: number) => void;
	updateSmoothing: (smoothing: number) => void;
	getAnalyserX: () => Tone.Analyser | null;
	getAnalyserY: () => Tone.Analyser | null;
	params: AnalyserParams;
}

/**
 * useToneAnalyser - React hook for managing Tone.js Analyser nodes for audio visualization
 *
 * This hook provides a comprehensive interface for managing dual-axis (X/Y) Tone.js Analyser nodes
 * within the Reactoscope ecosystem, handling lifecycle, parameter updates, and state synchronization.
 *
 * @param nodeId - Unique identifier for the audio node
 * @returns Controls and state for the analyser nodes
 */
export const useToneAnalyser = (nodeId: string): ToneAnalyserControls => {
	// Input validation
	if (!nodeId || typeof nodeId !== 'string') {
		console.error('🚨 useToneAnalyser: nodeId must be a non-empty string', {
			nodeId,
		});
		throw new Error('Invalid nodeId provided to useToneAnalyser');
	}
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
	const defaultParams: AnalyserParams = useMemo(
		() => ({
			size: 1024,
			smoothing: 0.8,
			isConnected: false,
		}),
		[]
	);

	const params = (audioNode?.params as AnalyserParams) || defaultParams;

	// Get analyser instances using multi-instance pattern (X/Y channels)
	const analyserX = getAudioNodeInstance(nodeId, 'X') as
		| Tone.Analyser
		| undefined;
	const analyserY = getAudioNodeInstance(nodeId, 'Y') as
		| Tone.Analyser
		| undefined;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			try {
				addAudioNode(nodeId, 'visualizer', defaultParams);
				console.log(`📊 Initialized analyser node in store: ${nodeId}`);
			} catch (error) {
				console.error(
					`🚨 Failed to initialize analyser node ${nodeId}:`,
					error
				);
			}
		}
	}, [nodeId, audioNode, addAudioNode, defaultParams]);

	// Create analyser instances and manage lifecycle
	useEffect(() => {
		const createAnalysers = async () => {
			try {
				// Ensure audio context is initialized
				await initializeAudioContext();

				// Create X analyser if it doesn't exist
				if (!analyserX) {
					const newAnalyserX = new Tone.Analyser({
						type: 'waveform',
						size: params.size,
						smoothing: params.smoothing,
					});
					setAudioNodeInstance(nodeId, newAnalyserX, 'X');
				}

				// Create Y analyser if it doesn't exist
				if (!analyserY) {
					const newAnalyserY = new Tone.Analyser({
						type: 'waveform',
						size: params.size,
						smoothing: params.smoothing,
					});
					setAudioNodeInstance(nodeId, newAnalyserY, 'Y');
				}
			} catch (error) {
				console.error(
					`🚨 Failed to create analyser nodes for ${nodeId}:`,
					error
				);
			}
		};

		createAnalysers();

		// Cleanup on unmount
		return () => {
			if (analyserX) {
				try {
					analyserX.dispose();
				} catch (error) {
					console.error(`🚨 Error disposing analyser X for ${nodeId}:`, error);
				}
				removeAudioNodeInstance(nodeId, 'X');
			}
			if (analyserY) {
				try {
					analyserY.dispose();
				} catch (error) {
					console.error(`🚨 Error disposing analyser Y for ${nodeId}:`, error);
				}
				removeAudioNodeInstance(nodeId, 'Y');
			}
		};
	}, [
		nodeId,
		analyserX,
		analyserY,
		params,
		setAudioNodeInstance,
		removeAudioNodeInstance,
		initializeAudioContext,
	]);

	// Update analyser parameters when they change
	useEffect(() => {
		if (!analyserX || !analyserY) return;

		try {
			// Update size and smoothing for both analysers
			analyserX.size = params.size;
			analyserX.smoothing = params.smoothing;
			analyserY.size = params.size;
			analyserY.smoothing = params.smoothing;
		} catch (error) {
			console.error(
				`🚨 Error updating analyser parameters for ${nodeId}:`,
				error
			);
		}
	}, [analyserX, analyserY, params, nodeId]);

	// Control functions with improved error handling and validation
	const updateSize = useCallback(
		(size: number): void => {
			// Input validation
			if (typeof size !== 'number' || size <= 0 || !Number.isInteger(size)) {
				console.error('🚨 Invalid FFT size value:', size);
				return;
			}

			// Check if size is a power of 2
			if ((size & (size - 1)) !== 0) {
				console.error('🚨 FFT size must be a power of 2:', size);
				return;
			}

			try {
				updateAudioNode(nodeId, { size } as Partial<AnalyserParams>);
				console.log(`📊 Updated FFT size for ${nodeId}: ${size}`);
			} catch (error) {
				console.error(`🚨 Failed to update FFT size for ${nodeId}:`, error);
			}
		},
		[nodeId, updateAudioNode]
	);

	const updateSmoothing = useCallback(
		(smoothing: number): void => {
			// Input validation
			if (typeof smoothing !== 'number' || smoothing < 0 || smoothing > 1) {
				console.error('🚨 Invalid smoothing value (must be 0-1):', smoothing);
				return;
			}

			try {
				updateAudioNode(nodeId, { smoothing } as Partial<AnalyserParams>);
				console.log(
					`📊 Updated smoothing for ${nodeId}: ${smoothing.toFixed(2)}`
				);
			} catch (error) {
				console.error(`🚨 Failed to update smoothing for ${nodeId}:`, error);
			}
		},
		[nodeId, updateAudioNode]
	);

	const getAnalyserX = useCallback((): Tone.Analyser | null => {
		return analyserX || null;
	}, [analyserX]);

	const getAnalyserY = useCallback((): Tone.Analyser | null => {
		return analyserY || null;
	}, [analyserY]);

	// Monitor incoming connections to update isConnected status
	const edges = useEdges();
	useEffect(() => {
		const incomingEdges = edges.filter(
			(edge: Edge) =>
				edge.target === nodeId &&
				(edge.targetHandle === 'audio-in-X' ||
					edge.targetHandle === 'audio-in-Y')
		);

		const isConnected = incomingEdges.length > 0;
		if (params.isConnected !== isConnected) {
			updateAudioNode(nodeId, { isConnected } as Partial<AnalyserParams>);
		}
	}, [edges, nodeId, params.isConnected, updateAudioNode]);

	return {
		updateSize,
		updateSmoothing,
		getAnalyserX,
		getAnalyserY,
		params,
	};
};
