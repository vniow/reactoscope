/**
 * React hook for managing XYRGB Interpolator audio node
 *
 * Provides a convenient interface for creating and managing an XYRGB interpolator
 * that generates audio signals from 3D scene vertex data.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { XYRGBInterpolatorNode } from '../core/XYRGBInterpolatorNode';
import type { VertexInfo } from '../../nodes/source/DebugPanel';

interface UseXYRGBInterpolatorReturn {
	/** The XYRGB interpolator node instance */
	node: XYRGBInterpolatorNode | null;
	/** Whether the node is ready */
	isReady: boolean;
	/** Whether the node is currently playing */
	isPlaying: boolean;
	/** Update vertex data */
	updateVertices: (vertices: VertexInfo[]) => void;
	/** Start interpolation */
	start: () => void;
	/** Stop interpolation */
	stop: () => void;
	/** Update scan rate */
	setScanRate: (rate: number) => void;
	/** Update interpolation mode */
	setInterpolationMode: (mode: 'linear' | 'cubic' | 'circular') => void;
	/** Update scan pattern */
	setScanPattern: (pattern: 'sequential' | 'ping_pong' | 'random') => void;
	/** Update amplitude */
	setAmplitude: (amplitude: number) => void;
	/** Update smoothing */
	setSmoothing: (smoothing: number) => void;
	/** Ready promise */
	ready: Promise<void> | null;
}

/**
 * Hook for managing XYRGB Interpolator audio node
 */
export function useXYRGBInterpolator(
	enabled: boolean = true
): UseXYRGBInterpolatorReturn {
	const nodeRef = useRef<XYRGBInterpolatorNode | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const readyPromiseRef = useRef<Promise<void> | null>(null);

	// Initialize node only once when enabled changes
	useEffect(() => {
		if (!enabled) {
			// Clean up if disabled
			if (nodeRef.current) {
				nodeRef.current.dispose();
				nodeRef.current = null;
				setIsReady(false);
				setIsPlaying(false);
				readyPromiseRef.current = null;
			}
			return;
		}

		// Only initialize if we don't already have a node
		if (nodeRef.current) return;

		const initializeNode = async () => {
			try {
				const node = new XYRGBInterpolatorNode({
					debug: true,
				});

				nodeRef.current = node;
				readyPromiseRef.current = node.ready;

				await node.ready;
				setIsReady(true);
				setIsPlaying(node.isPlaying);

				console.log('🎵 XYRGB Interpolator hook initialized');
			} catch (error) {
				console.error('❌ Failed to initialize XYRGB Interpolator:', error);
			}
		};

		initializeNode();

		// Cleanup only when component unmounts or enabled becomes false
		return () => {
			if (nodeRef.current) {
				nodeRef.current.dispose();
				nodeRef.current = null;
				setIsReady(false);
				setIsPlaying(false);
				readyPromiseRef.current = null;
			}
		};
	}, [enabled]);

	// Stable callback functions
	const updateVertices = useCallback(
		(vertices: VertexInfo[]) => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setVertices(vertices);
			}
		},
		[isReady]
	);

	const start = useCallback(() => {
		if (nodeRef.current && isReady) {
			nodeRef.current.start();
			setIsPlaying(true);
		}
	}, [isReady]);

	const stop = useCallback(() => {
		if (nodeRef.current && isReady) {
			nodeRef.current.stop();
			setIsPlaying(false);
		}
	}, [isReady]);

	const setScanRate = useCallback(
		(rate: number) => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setScanRate(rate);
			}
		},
		[isReady]
	);

	const setInterpolationMode = useCallback(
		(mode: 'linear' | 'cubic' | 'circular') => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setInterpolationMode(mode);
			}
		},
		[isReady]
	);

	const setScanPattern = useCallback(
		(pattern: 'sequential' | 'ping_pong' | 'random') => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setScanPattern(pattern);
			}
		},
		[isReady]
	);

	const setAmplitude = useCallback(
		(amplitude: number) => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setAmplitude(amplitude);
			}
		},
		[isReady]
	);

	const setSmoothing = useCallback(
		(smoothing: number) => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setSmoothing(smoothing);
			}
		},
		[isReady]
	);

	return {
		node: nodeRef.current,
		isReady,
		isPlaying,
		updateVertices,
		start,
		stop,
		setScanRate,
		setInterpolationMode,
		setScanPattern,
		setAmplitude,
		setSmoothing,
		ready: readyPromiseRef.current,
	};
}
