/**
 * Zustand slice for managing scene-related state
 *
 * This slice handles the state for coordinates and debug metrics extracted
 * from the Three.js scene. It follows the standard slice pattern for
 * easy integration into the main application store.
 */
import type { StateCreator } from 'zustand';
import * as THREE from 'three';
import { Vector2, Vector3 } from 'three';
import type { AppStore } from '../../shared/stores/types';
import {
	SCENE_EXTRACTION_CONFIG,
	COORDINATE_BUFFER_CONFIG,
} from '../ThreeWorkletNodeConfig';

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

export interface SceneSlice {
	coordinates: Vector2[];
	debugMetrics: SceneDebugMetrics | null;
	updateCoordinatesFromScene: (
		scene: THREE.Scene,
		camera: THREE.Camera,
		sampleRate: number
	) => void;
	setCoordinates: (coordinates: Vector2[]) => void; // Keep this for direct manipulation if needed
	setDebugMetrics: (metrics: SceneDebugMetrics) => void; // Keep this for direct manipulation if needed
}

export const createSceneSlice: StateCreator<
	AppStore,
	[['zustand/devtools', never]],
	[],
	SceneSlice
> = (set) => ({
	coordinates: [],
	debugMetrics: null,
	setCoordinates: (coordinates) =>
		set({ coordinates }, false, 'setCoordinates'),
	setDebugMetrics: (debugMetrics) =>
		set({ debugMetrics }, false, 'setDebugMetrics'),
	updateCoordinatesFromScene: (scene, camera, sampleRate) => {
		const startTime = performance.now();
		const allCoords: Vector2[] = [];
		const seenPoints = new Set<string>();

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

				for (
					let i = 0;
					i < vertexCount &&
					objectPointCount < SCENE_EXTRACTION_CONFIG.maxPointsPerObject;
					i += sampleStep
				) {
					const vertex = new Vector3().fromBufferAttribute(positions, i);
					extractedPoints++;
					vertex.applyMatrix4(object.matrixWorld);
					vertex.project(camera);

					let x = vertex.x;
					let y = vertex.y;

					if (COORDINATE_BUFFER_CONFIG.flipXAxis) x = -x;
					if (COORDINATE_BUFFER_CONFIG.flipYAxis) y = -y;

					xMin = Math.min(xMin, x);
					xMax = Math.max(xMax, x);
					yMin = Math.min(yMin, y);
					yMax = Math.max(yMax, y);

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

				if (SCENE_EXTRACTION_CONFIG.includeObjectCenters) {
					const center = new Vector3();
					object.getWorldPosition(center);
					center.project(camera);

					let centerX = center.x;
					let centerY = center.y;

					if (COORDINATE_BUFFER_CONFIG.flipXAxis) centerX = -centerX;
					if (COORDINATE_BUFFER_CONFIG.flipYAxis) centerY = -centerY;

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

		set(
			{ coordinates: allCoords, debugMetrics },
			false,
			'updateCoordinatesFromScene'
		);
	},
});
