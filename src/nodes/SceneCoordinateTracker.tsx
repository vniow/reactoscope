import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector2, Vector3 } from 'three';
import { useRef } from 'react';
import {
	SCENE_EXTRACTION_CONFIG,
	COORDINATE_BUFFER_CONFIG,
} from './ThreeWorkletNodeConfig';

// Debug metrics interface
export interface SceneDebugMetrics {
	meshCount: number;
	totalVertices: number;
	sampleStep: number;
	extractedPoints: number;
	duplicatesFiltered: number;
	pointsPerObject: { [key: string]: number };
	coordinateRange: { xMin: number; xMax: number; yMin: number; yMax: number };
	processingTime: number;
	centerPointsAdded: number;
}

// Component to traverse scene and extract coordinates from all objects
export function SceneCoordinateTracker({
	onCoordinatesUpdate,
	onDebugUpdate,
	sampleRate = SCENE_EXTRACTION_CONFIG.vertexSamplingRate, // Default to config value
}: {
	onCoordinatesUpdate: (coords: Vector2[]) => void;
	onDebugUpdate?: (metrics: SceneDebugMetrics) => void;
	sampleRate?: number;
}) {
	const { camera, scene } = useThree();

	// Add frame throttling to reduce CPU usage
	const frameCountRef = useRef(0);
	const FRAME_SKIP = 2; // Process every 3rd frame (20fps instead of 60fps)

	useFrame(() => {
		// Skip frames to reduce CPU usage
		frameCountRef.current++;
		if (frameCountRef.current % FRAME_SKIP !== 0) {
			return;
		}

		const startTime = performance.now();
		const allCoords: Vector2[] = [];
		const seenPoints = new Set<string>(); // Prevent duplicate points

		// Debug metrics
		let meshCount = 0;
		let totalVertices = 0;
		let extractedPoints = 0;
		let duplicatesFiltered = 0;
		let centerPointsAdded = 0;
		const pointsPerObject: { [key: string]: number } = {};
		let xMin = Infinity,
			xMax = -Infinity,
			yMin = Infinity,
			yMax = -Infinity;

		const sampleStep = Math.max(1, Math.floor(1 / sampleRate));

		scene.traverse((object) => {
			// Handle both Mesh and Line objects
			if (
				(object instanceof THREE.Mesh || object instanceof THREE.Line) &&
				object.geometry
			) {
				meshCount++;
				const geometry = object.geometry;
				const positions = geometry.attributes.position;

				if (!positions) return;

				const objectName = object.name || `object-${meshCount}`;
				let objectPointCount = 0;
				const vertexCount = positions.count;
				totalVertices += vertexCount;

				// Extract vertices with sampling
				for (
					let i = 0;
					i < vertexCount &&
					objectPointCount < SCENE_EXTRACTION_CONFIG.maxPointsPerObject;
					i += sampleStep
				) {
					const vertex = new Vector3().fromBufferAttribute(positions, i);
					extractedPoints++;

					// Apply object's world transformation
					vertex.applyMatrix4(object.matrixWorld);

					// Project to screen coordinates
					vertex.project(camera);

					// Apply coordinate system flipping
					let x = vertex.x;
					let y = vertex.y;

					if (COORDINATE_BUFFER_CONFIG.flipXAxis) {
						x = -x;
					}
					if (COORDINATE_BUFFER_CONFIG.flipYAxis) {
						y = -y;
					}

					// Track coordinate range
					xMin = Math.min(xMin, x);
					xMax = Math.max(xMax, x);
					yMin = Math.min(yMin, y);
					yMax = Math.max(yMax, y);

					// Check for minimum distance to prevent clustering
					const pointKey = `${x.toFixed(3)},${y.toFixed(3)}`;
					if (!seenPoints.has(pointKey)) {
						seenPoints.add(pointKey);
						allCoords.push(new Vector2(x, y));
						objectPointCount++;
					} else {
						duplicatesFiltered++;
					}
				}

				pointsPerObject[objectName] = objectPointCount;

				// Optionally include object center
				if (SCENE_EXTRACTION_CONFIG.includeObjectCenters) {
					const center = new Vector3();
					object.getWorldPosition(center);
					center.project(camera);

					let centerX = center.x;
					let centerY = center.y;

					if (COORDINATE_BUFFER_CONFIG.flipXAxis) {
						centerX = -centerX;
					}
					if (COORDINATE_BUFFER_CONFIG.flipYAxis) {
						centerY = -centerY;
					}

					// Track coordinate range for centers too
					xMin = Math.min(xMin, centerX);
					xMax = Math.max(xMax, centerX);
					yMin = Math.min(yMin, centerY);
					yMax = Math.max(yMax, centerY);

					const centerKey = `${centerX.toFixed(3)},${centerY.toFixed(3)}`;
					if (!seenPoints.has(centerKey)) {
						seenPoints.add(centerKey);
						allCoords.push(new Vector2(centerX, centerY));
						centerPointsAdded++;
					} else {
						duplicatesFiltered++;
					}
				}
			}
		});

		const processingTime = performance.now() - startTime;

		// Send debug metrics if callback provided
		if (onDebugUpdate) {
			const debugMetrics: SceneDebugMetrics = {
				meshCount,
				totalVertices,
				sampleStep,
				extractedPoints,
				duplicatesFiltered,
				pointsPerObject,
				coordinateRange: {
					xMin: xMin === Infinity ? 0 : xMin,
					xMax: xMax === -Infinity ? 0 : xMax,
					yMin: yMin === Infinity ? 0 : yMin,
					yMax: yMax === -Infinity ? 0 : yMax,
				},
				processingTime,
				centerPointsAdded,
			};
			onDebugUpdate(debugMetrics);
		}

		onCoordinatesUpdate(allCoords);
	});

	return null; // This component doesn't render anything
}
