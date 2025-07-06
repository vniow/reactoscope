import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
	extractVerticesFromScene,
	type SceneTraversalOptions,
} from './sceneTraversal';
import type { SceneData } from './sceneTypes';

/**
 * React hook for scene traversal with configurable scan rate
 *
 * @param onSceneData - Callback function to handle extracted scene data
 * @param scanRate - Scan rate in Hz (default: 30)
 * @param options - Optional scene traversal configuration
 */
export function useSceneTraversal(
	onSceneData: (data: SceneData) => void,
	scanRate: number = 30,
	options?: SceneTraversalOptions
) {
	const { scene, camera, size } = useThree();
	const lastUpdateRef = useRef(0);

	useFrame(() => {
		const now = Date.now();
		const updateInterval = 1000 / (scanRate || 30); // Convert Hz to ms

		if (now - lastUpdateRef.current > updateInterval) {
			const sceneData = extractVerticesFromScene(scene, camera, options, {
				width: size.width,
				height: size.height,
			});
			onSceneData(sceneData);
			lastUpdateRef.current = now;
		}
	});
}
