import { useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../stores/appStore';
import type { AnalyserParams } from '../stores/slices/audioSlice';
import type { Edge } from '@xyflow/react';

export interface ToneAnalyserControls {
	updateSize: (size: number) => void;
	updateSmoothing: (smoothing: number) => void;
	getAnalyserX: () => Tone.Analyser | null;
	getAnalyserY: () => Tone.Analyser | null;
	params: AnalyserParams;
}

/**
 * Custom hook for managing Tone.js Analyser nodes for X/Y axis audio visualization
 * Handles lifecycle, parameter updates, and state synchronization using Zustand as single source of truth
 */
export const useToneAnalyser = (nodeId: string): ToneAnalyserControls => {
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
			addAudioNode(nodeId, 'visualizer', defaultParams);
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
				console.error(`Failed to create analyser nodes for ${nodeId}:`, error);
			}
		};

		createAnalysers();

		// Cleanup on unmount
		return () => {
			if (analyserX) {
				try {
					analyserX.dispose();
				} catch (error) {
					console.error(`Error disposing analyser X for ${nodeId}:`, error);
				}
				removeAudioNodeInstance(nodeId, 'X');
			}
			if (analyserY) {
				try {
					analyserY.dispose();
				} catch (error) {
					console.error(`Error disposing analyser Y for ${nodeId}:`, error);
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
			console.error(`Error updating analyser parameters for ${nodeId}:`, error);
		}
	}, [analyserX, analyserY, params, nodeId]);

	// Control functions
	const updateSize = useCallback(
		(size: number) => {
			updateAudioNode(nodeId, { size } as Partial<AnalyserParams>);
		},
		[nodeId, updateAudioNode]
	);

	const updateSmoothing = useCallback(
		(smoothing: number) => {
			updateAudioNode(nodeId, { smoothing } as Partial<AnalyserParams>);
		},
		[nodeId, updateAudioNode]
	);

	const getAnalyserX = useCallback(() => {
		return analyserX || null;
	}, [analyserX]);

	const getAnalyserY = useCallback(() => {
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
