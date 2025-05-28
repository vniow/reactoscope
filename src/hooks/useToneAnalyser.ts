import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../stores/appStore';
import { useFlowEdges } from './useFlow';
import type { AnalyserParams } from '../stores/slices/audioSlice';
import type { Edge } from '@xyflow/react';

export interface ToneAnalyserControls {
	updateSize: (size: number) => void;
	updateSmoothing: (smoothing: number) => void;
	getAnalyserL: () => Tone.Analyser | null;
	getAnalyserR: () => Tone.Analyser | null;
	params: AnalyserParams;
}

/**
 * Custom hook for managing Tone.js Analyser nodes for stereo audio visualization
 * Handles lifecycle, parameter updates, and state synchronization
 */
export const useToneAnalyser = (nodeId: string): ToneAnalyserControls => {
	const analyserLRef = useRef<Tone.Analyser | null>(null);
	const analyserRRef = useRef<Tone.Analyser | null>(null);

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
			addAudioNode(nodeId, 'analyser', {
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

				// Create left and right analysers independently
				analyserLRef.current = new Tone.Analyser({
					type: 'waveform',
					size: params.size,
					smoothing: params.smoothing,
				});

				analyserRRef.current = new Tone.Analyser({
					type: 'waveform',
					size: params.size,
					smoothing: params.smoothing,
				});

				// Register in global registry for audio routing
				const windowWithTone = window as unknown as {
					toneInstances?: Record<string, Tone.ToneAudioNode>;
				};
				if (!windowWithTone.toneInstances) {
					windowWithTone.toneInstances = {};
				}
				// Register both analysers with separate handles
				windowWithTone.toneInstances[`analyser-${nodeId}-L`] =
					analyserLRef.current;
				windowWithTone.toneInstances[`analyser-${nodeId}-R`] =
					analyserRRef.current;

				console.log(
					`🎵 Created independent analyser nodes for ${nodeId}:`,
					params
				);
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
			if (analyserLRef.current) {
				try {
					// Remove from global registry
					const toneInstances = (
						window as unknown as {
							toneInstances?: Record<string, Tone.ToneAudioNode>;
						}
					).toneInstances;
					if (toneInstances) {
						delete toneInstances[`analyser-${nodeId}-L`];
						delete toneInstances[`analyser-${nodeId}-R`];
					}

					analyserLRef.current.dispose();
					analyserRRef.current?.dispose();
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
		if (!analyserLRef.current || !analyserRRef.current) return;

		try {
			// Update size and smoothing for both analysers
			analyserLRef.current.size = params.size;
			analyserLRef.current.smoothing = params.smoothing;
			analyserRRef.current.size = params.size;
			analyserRRef.current.smoothing = params.smoothing;

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

	const getAnalyserL = useCallback(() => {
		return analyserLRef.current;
	}, []);

	const getAnalyserR = useCallback(() => {
		return analyserRRef.current;
	}, []);

	// Monitor incoming connections to update isConnected status
	const edges = useFlowEdges();
	useEffect(() => {
		const incomingEdges = edges.filter(
			(edge: Edge) =>
				edge.target === nodeId &&
				(edge.targetHandle === 'audio-in-L' ||
					edge.targetHandle === 'audio-in-R')
		);

		const isConnected = incomingEdges.length > 0;
		if (params.isConnected !== isConnected) {
			updateAudioNode(nodeId, { isConnected } as Partial<AnalyserParams>);
		}
	}, [edges, nodeId, params.isConnected, updateAudioNode]);

	return {
		updateSize,
		updateSmoothing,
		getAnalyserL,
		getAnalyserR,
		params,
	};
};
