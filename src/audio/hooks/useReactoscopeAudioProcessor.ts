/**
 * React hook for managing XYRGB Interpolator audio node
 *
 * Provides a convenient interface for creating and managing an XYRGB interpolator
 * that generates audio signals from 3D scene vertex data.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { ReactoscopeAudioProcessorNode } from '../core/ReactoscopeAudioProcessorNode';
import type { VertexInfo } from '../../flow/nodes/source/sceneTypes';

interface UseReactoscopeProcessorReturn {
	/** The XYRGB interpolator node instance */
	node: ReactoscopeAudioProcessorNode | null;
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

	/** Update interpolation steps */
	setInterpolationSteps: (steps: number) => void;
	/** Ready promise */
	ready: Promise<void> | null;
}

/**
 * Hook for managing XYRGB Interpolator audio node
 */
export function useReactoscopeAudioProcessor(): UseReactoscopeProcessorReturn {
	const nodeRef = useRef<ReactoscopeAudioProcessorNode | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const readyPromiseRef = useRef<Promise<void> | null>(null);

		 // Initialize node once on mount
		 useEffect(() => {
			 if (nodeRef.current) return;
			 const initialize = async () => {
				 try {
					 const node = new ReactoscopeAudioProcessorNode({ debug: true });
					 nodeRef.current = node;
					 readyPromiseRef.current = node.ready;
					 await node.ready;
					 setIsReady(true);
					 setIsPlaying(node.isPlaying);
					 console.log('🎵 Reactoscope Processor initialized');
				 } catch (error) {
					 console.error('❌ Failed to initialize Reactoscope Processor:', error);
				 }
			 };
			 initialize();
		 }, []);

		// No automatic disposal: worklet continues until explicitly stopped or disposed

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

	const setInterpolationSteps = useCallback(
		(steps: number) => {
			if (nodeRef.current && isReady) {
				nodeRef.current.setInterpolationSteps(steps);
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
		setInterpolationSteps,
		ready: readyPromiseRef.current,
	};
}
