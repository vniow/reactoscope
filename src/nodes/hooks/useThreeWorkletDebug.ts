/**
 * useThreeWorkletDebug - Custom hook for Three Worklet Node debugging
 *
 * Separates debug logic from the main component to improve maintainability
 * and follow the Single Responsibility Principle.
 */

import { useState, useRef, useCallback } from 'react';
import type { SceneDebugMetrics } from '../SceneCoordinateTracker';

export interface BufferStats {
	fillPercentage: number;
	oldestPointAge: number;
	lastSendTime: number;
	throttleHits: number;
}

export interface ThreeWorkletDebugState {
	debugMetrics: SceneDebugMetrics | null;
	frameRate: number;
	bufferStats: BufferStats;
}

export interface ThreeWorkletDebugControls extends ThreeWorkletDebugState {
	handleDebugUpdate: (metrics: SceneDebugMetrics) => void;
	updateBufferStats: (stats: BufferStats) => void;
}

/**
 * Custom hook for managing Three Worklet Node debug information
 */
export function useThreeWorkletDebug(): ThreeWorkletDebugControls {
	// Debug panel state
	const [debugMetrics, setDebugMetrics] = useState<SceneDebugMetrics | null>(
		null
	);
	const [frameRate, setFrameRate] = useState<number>(0);
	const [bufferStats, setBufferStats] = useState<BufferStats>({
		fillPercentage: 0,
		oldestPointAge: 0,
		lastSendTime: 0,
		throttleHits: 0,
	});

	// Debug tracking refs
	const frameCountRef = useRef<number>(0);
	const lastFpsUpdateRef = useRef<number>(0);

	// Handle debug updates from scene tracker
	const handleDebugUpdate = useCallback((metrics: SceneDebugMetrics) => {
		setDebugMetrics(metrics);

		// Update frame rate calculation
		frameCountRef.current++;
		const now = Date.now();
		if (now - lastFpsUpdateRef.current > 1000) {
			setFrameRate(frameCountRef.current);
			frameCountRef.current = 0;
			lastFpsUpdateRef.current = now;
		}
	}, []);

	// Update buffer statistics
	const updateBufferStats = useCallback((stats: BufferStats) => {
		setBufferStats(stats);
	}, []);

	return {
		debugMetrics,
		frameRate,
		bufferStats,
		handleDebugUpdate,
		updateBufferStats,
	};
}
