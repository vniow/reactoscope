/**
 * useCoordinateAudioWorklet.ts
 * Hook for managing coordinate-to-audio worklet instances
 */

import { useRef, useEffect, useCallback } from 'react';
import { CoordinateAudioWorkletNode } from '../lib/worklets';
import { useAppStore } from '../stores/appStore';
import type { CoordinateAudioWorkletParams } from '../stores/slices/audioSlice';

interface CoordinateAudioWorkletOptions {
	axis: 'x' | 'y';
	gain?: number;
	frequency?: number;
	nodeId: string;
}

export interface CoordinateAudioWorkletControls {
	audioNode: CoordinateAudioWorkletNode | null;
	updateBuffer: (buffer: Float32Array) => void;
	setGain: (gain: number) => void;
	setFrequency: (frequency: number) => void;
	setAxis: (axis: 'x' | 'y') => void;
	isReady: boolean;
	params: CoordinateAudioWorkletParams;
}

export function useCoordinateAudioWorklet({
	axis,
	gain = 0.5,
	frequency = 1.0,
	nodeId,
}: CoordinateAudioWorkletOptions): CoordinateAudioWorkletControls {
	const workletRef = useRef<CoordinateAudioWorkletNode | null>(null);

	// Get audio node data from store
	const audioNode = useAppStore((state) => state.audioNodes[nodeId]);
	const {
		updateAudioNode,
		addAudioNode,
		initializeAudioContext,
		setAudioNodeInstance,
		removeAudioNodeInstance,
	} = useAppStore();

	// Initialize default parameters if node doesn't exist
	const defaultParams: CoordinateAudioWorkletParams = {
		axis,
		gain,
		frequency,
		bufferSize: 512,
		isReady: false,
	};

	const params =
		(audioNode?.params as CoordinateAudioWorkletParams) || defaultParams;

	// Initialize audio node in store if it doesn't exist
	useEffect(() => {
		if (!audioNode) {
			const initParams: CoordinateAudioWorkletParams = {
				axis,
				gain,
				frequency,
				bufferSize: 512,
				isReady: false,
			};
			addAudioNode(nodeId, 'coordinate-audio-worklet', initParams);
		}
	}, [nodeId, audioNode, addAudioNode, axis, gain, frequency]);

	// Create and configure worklet
	useEffect(() => {
		const createWorklet = async () => {
			try {
				// Ensure audio context is started
				await initializeAudioContext();

				// Create new coordinate audio worklet
				workletRef.current = new CoordinateAudioWorkletNode({
					debug: true,
					axis,
					gain,
					frequency,
					bufferSize: 512,
				});

				// Wait for worklet to be ready
				await workletRef.current.ready;

				// Store worklet instance in Zustand
				setAudioNodeInstance(nodeId, workletRef.current);

				// Update store to indicate readiness
				updateAudioNode(nodeId, {
					...params,
					isReady: true,
				});
			} catch (error) {
				console.error(
					`Failed to create coordinate audio worklet for node ${nodeId}:`,
					error
				);
				// Update store to indicate failure
				updateAudioNode(nodeId, {
					...params,
					isReady: false,
				});
			}
		};

		createWorklet();

		// Cleanup on unmount
		return () => {
			if (workletRef.current) {
				try {
					workletRef.current.dispose();
					removeAudioNodeInstance(nodeId);
				} catch (error) {
					console.error(
						`Error cleaning up coordinate audio worklet for ${nodeId}:`,
						error
					);
				}
				workletRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		nodeId,
		axis,
		gain,
		frequency,
		setAudioNodeInstance,
		removeAudioNodeInstance,
	]);

	// Update coordinate buffer
	const updateBuffer = useCallback(
		(buffer: Float32Array) => {
			if (workletRef.current && params.isReady) {
				workletRef.current.updateBuffer(buffer);
			}
		},
		[params.isReady]
	);

	// Set gain
	const setGain = useCallback(
		(newGain: number) => {
			if (workletRef.current && params.isReady) {
				workletRef.current.setGain(newGain);
				// Update store
				updateAudioNode(nodeId, {
					...params,
					gain: newGain,
				});
			}
		},
		[nodeId, params, updateAudioNode]
	);

	// Set frequency (playback speed)
	const setFrequency = useCallback(
		(newFrequency: number) => {
			if (workletRef.current && params.isReady) {
				workletRef.current.setFrequency(newFrequency);
				// Update store
				updateAudioNode(nodeId, {
					...params,
					frequency: newFrequency,
				});
			}
		},
		[nodeId, params, updateAudioNode]
	);

	// Set axis
	const setAxis = useCallback(
		(newAxis: 'x' | 'y') => {
			if (workletRef.current && params.isReady) {
				workletRef.current.setAxis(newAxis);
				// Update store
				updateAudioNode(nodeId, {
					...params,
					axis: newAxis,
				});
			}
		},
		[nodeId, params, updateAudioNode]
	);

	return {
		audioNode: workletRef.current,
		updateBuffer,
		setGain,
		setFrequency,
		setAxis,
		isReady: params.isReady || false,
		params,
	};
}
