/**
 * Simple Scene Manager Component (React Three Fiber)
 *
 * Radically simplified component that just renders the RGB triangle
 * and extracts audio data directly from the scene.
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RGBTriangleComponent } from './RGBTriangleComponent';
import { extractVerticesFromScene } from '../sceneTraversal';

import type { SceneTraversalOptions } from '../sceneTraversal';
import type { SceneData } from '../types';

interface ShapeSceneManagerProps {
	/** Callback for scene audio data updates */
	onSceneData?: (data: SceneData) => void;
	/** Scan rate in Hz for audio data extraction */
	scanRate?: number;
	/** Scene traversal options */
	traversalOptions?: SceneTraversalOptions;
}

/**
 * Component that simply renders the RGB triangle and extracts audio data
 */
export function ShapeSceneManager({
	onSceneData,
	scanRate = 30,
	traversalOptions = {},
}: ShapeSceneManagerProps): React.ReactElement | null {
	const { scene, camera, size } = useThree();
	const lastUpdateRef = useRef(0);

	// Animation and audio data extraction loop
	useFrame(() => {
		// Extract audio data at the specified scan rate
		if (onSceneData) {
			const now = Date.now();
			const updateInterval = 1000 / scanRate;

			if (now - lastUpdateRef.current > updateInterval) {
				// Extract vertices directly from the scene
				const sceneData = extractVerticesFromScene(
					scene,
					camera,
					traversalOptions,
					{ width: size.width, height: size.height }
				);

				// Pass the scene data directly (already in the correct format)
				onSceneData(sceneData);
				lastUpdateRef.current = now;
			}
		}
	});

	// Just render the RGB triangle directly
	return <RGBTriangleComponent />;
}
