/**
 * ThreeCoordinateProcessor - Three.js-based coordinate interpolation component
 *
 * This component handles coordinate interpolation using Three.js built-in lerp functionality,
 * replacing manual smoothing algorithms with optimized Three.js Vector operations.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2 } from 'three';
import {
	ThreeCoordinateInterpolator,
	type LerpConfig,
} from '../utils/ThreeCoordinateInterpolator';

export interface ThreeCoordinateProcessorProps {
	/**
	 * Input coordinates to interpolate
	 */
	coordinates: Vector2[];

	/**
	 * Callback when interpolated coordinates are ready
	 */
	onInterpolatedCoordinates: (coords: Vector2[]) => void;

	/**
	 * Lerp interpolation configuration
	 */
	lerpConfig: LerpConfig;

	/**
	 * Whether to enable real-time processing
	 */
	enabled: boolean;

	/**
	 * Optional debug callback for interpolation state
	 */
	onDebugUpdate?: (debugInfo: {
		current?: { x: number; y: number };
		target?: { x: number; y: number };
		velocity?: { x: number; y: number };
		frameRate: number;
		interpolatedCount: number;
		lerpConfig: LerpConfig;
	}) => void;
}

/**
 * Three.js-based coordinate processor component
 * Uses useFrame for smooth interpolation synchronized with Three.js render loop
 */
export function ThreeCoordinateProcessor({
	coordinates,
	onInterpolatedCoordinates,
	lerpConfig,
	enabled,
	onDebugUpdate,
}: ThreeCoordinateProcessorProps) {
	const interpolatorRef = useRef<ThreeCoordinateInterpolator | null>(null);
	const lastFrameTimeRef = useRef<number>(0);
	const processorIdRef = useRef<string>('coord-processor');

	// Initialize interpolator
	useEffect(() => {
		interpolatorRef.current = new ThreeCoordinateInterpolator(lerpConfig);
	}, [lerpConfig]);

	// Update lerp configuration
	useEffect(() => {
		if (interpolatorRef.current) {
			interpolatorRef.current.updateConfig(lerpConfig);
		}
	}, [lerpConfig]);

	// Set target coordinates when input changes
	useEffect(() => {
		if (interpolatorRef.current && coordinates.length > 0) {
			interpolatorRef.current.setTargets(processorIdRef.current, coordinates);
		}
	}, [coordinates]);

	// Real-time interpolation using useFrame
	useFrame((state) => {
		if (!enabled || !interpolatorRef.current) return;

		const currentTime = state.clock.elapsedTime;
		const deltaTime = currentTime - lastFrameTimeRef.current;
		lastFrameTimeRef.current = currentTime;

		// Get interpolated coordinates
		const interpolatedCoords = interpolatorRef.current.update(
			processorIdRef.current,
			deltaTime
		);

		// Send interpolated coordinates to callback
		if (interpolatedCoords.length > 0) {
			onInterpolatedCoordinates(interpolatedCoords);
		}

		// Debug information
		if (onDebugUpdate) {
			const debugInfo = interpolatorRef.current.getDebugInfo(
				processorIdRef.current
			);
			onDebugUpdate({
				...debugInfo,
				frameRate: 1 / deltaTime,
				interpolatedCount: interpolatedCoords.length,
				lerpConfig: interpolatorRef.current.getConfig(),
			});
		}
	});

	// Reset interpolator when disabled
	useEffect(() => {
		if (!enabled && interpolatorRef.current) {
			interpolatorRef.current.reset(processorIdRef.current);
		}
	}, [enabled]);

	// This is a processing component, no visual output
	return null;
}
