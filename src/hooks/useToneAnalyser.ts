import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../stores/appStore';
import { toneRegistry } from '../utils/toneRegistry';
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
 * Handles lifecycle, parameter updates, and state synchronization
 */
export const useToneAnalyser = (nodeId: string): ToneAnalyserControls => {
	const analyserXRef = useRef<Tone.Analyser | null>(null);
	const analyserYRef = useRef<Tone.Analyser | null>(null);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const { updateAudioNode, addAudioNode, initializeAudioContext } =
		useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: AnalyserParams = {
		size: 1024,
		smoothing: 0.8,
		isConnected: false,
	};

	const params = (audioNode?.params as AnalyserParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			addAudioNode(nodeId, 'visualizer', {
				size: 1024,
				smoothing: 0.8,
				isConnected: false,
			});
		}
	}, [nodeId, audioNode, addAudioNode]);

	// Create and configure analyser nodes
	useEffect(() => {
		const createAnalysers = async () => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create X and Y analysers independently
				analyserXRef.current = new Tone.Analyser({
					type: 'waveform',
					size: params.size,
					smoothing: params.smoothing,
				});

				analyserYRef.current = new Tone.Analyser({
					type: 'waveform',
					size: params.size,
					smoothing: params.smoothing,
				});

				// Register in ToneRegistry for audio routing
				toneRegistry.register(`visualizer-${nodeId}-X`, analyserXRef.current);
				toneRegistry.register(`visualizer-${nodeId}-Y`, analyserYRef.current);

				console.log(
					`🎵 Created independent analyser nodes for ${nodeId}:`,
					params
				);
				console.log(`📝 ToneRegistry after registration:`, {
					registeredKeys: toneRegistry.getKeys(),
					xKey: `visualizer-${nodeId}-X`,
					yKey: `visualizer-${nodeId}-Y`,
					xInstance: toneRegistry.get(`visualizer-${nodeId}-X`),
					yInstance: toneRegistry.get(`visualizer-${nodeId}-Y`),
				});
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
			if (analyserXRef.current) {
				try {
					// Remove from ToneRegistry
					toneRegistry.unregister(`visualizer-${nodeId}-X`);
					toneRegistry.unregister(`visualizer-${nodeId}-Y`);

					analyserXRef.current.dispose();
					analyserYRef.current?.dispose();
					console.log(`🗑️ Disposed analyser nodes for ${nodeId}`);
				} catch (error) {
					console.error(
						`🚨 Error disposing analyser nodes for ${nodeId}:`,
						error
					);
				}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, initializeAudioContext]); // Re-create only when nodeId changes

	// Update analyser parameters when store params change
	useEffect(() => {
		if (!analyserXRef.current || !analyserYRef.current) return;

		try {
			// Update size and smoothing for both analysers
			analyserXRef.current.size = params.size;
			analyserXRef.current.smoothing = params.smoothing;
			analyserYRef.current.size = params.size;
			analyserYRef.current.smoothing = params.smoothing;

			console.log(`🎚️ Updated analyser parameters for ${nodeId}:`, params);
		} catch (error) {
			console.error(
				`🚨 Error updating analyser parameters for ${nodeId}:`,
				error
			);
		}
	}, [params, nodeId]);

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
		return analyserXRef.current;
	}, []);

	const getAnalyserY = useCallback(() => {
		return analyserYRef.current;
	}, []);

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
