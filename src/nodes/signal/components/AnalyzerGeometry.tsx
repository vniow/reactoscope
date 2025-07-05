/**
 * XYRGB Analyzer Geometry Component
 *
 * Creates a dynamic buffer geometry that translates analyzer data to vertices.
 * Each analyzer channel (X, Y, R, G, B) controls different aspects of the geometry.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { XYRGBAnalyzerData } from '../../../audio/hooks/useXYRGBAnalyzers';

export interface AnalyzerGeometryProps {
	/** Analyzer data from the audio inputs */
	analyzerData: XYRGBAnalyzerData;
	/** Number of vertices to generate (default: 64) */
	vertexCount?: number;
	/** Scale multiplier for position data (default: 2) */
	positionScale?: number;
	/** Animation speed multiplier (default: 1) */
	animationSpeed?: number;
	/** Whether to enable smooth interpolation (default: true) */
	smoothing?: boolean;
}

export function AnalyzerGeometry({
	analyzerData,
	vertexCount = 64,
	positionScale = 2,
	animationSpeed = 1,
	smoothing = true,
}: AnalyzerGeometryProps): React.ReactElement {
	const meshRef = useRef<THREE.Line>(null);

	// Previous frame data for smoothing
	const prevDataRef = useRef<{
		positions: Float32Array;
		colors: Float32Array;
	}>({
		positions: new Float32Array(vertexCount * 3),
		colors: new Float32Array(vertexCount * 3),
	});

	// Create initial geometry
	const geometry = useMemo(() => {
		const geo = new THREE.BufferGeometry();

		// Initialize with empty arrays
		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);
		const indices = new Uint16Array((vertexCount - 1) * 2);

		// Create line indices (connecting consecutive vertices)
		for (let i = 0; i < vertexCount - 1; i++) {
			indices[i * 2] = i;
			indices[i * 2 + 1] = i + 1;
		}

		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));

		return geo;
	}, [vertexCount]);

	// Convert analyzer data to vertex positions and colors
	const updateGeometry = (data: XYRGBAnalyzerData) => {
		if (!meshRef.current?.geometry) return;

		const positions = meshRef.current.geometry.attributes.position
			.array as Float32Array;
		const colors = meshRef.current.geometry.attributes.color
			.array as Float32Array;

		const prevPositions = prevDataRef.current.positions;
		const prevColors = prevDataRef.current.colors;

		// Calculate step size for sampling analyzer data
		const xStep = Math.max(1, Math.floor(data.x.length / vertexCount));
		const yStep = Math.max(1, Math.floor(data.y.length / vertexCount));
		const rStep = Math.max(1, Math.floor(data.r.length / vertexCount));
		const gStep = Math.max(1, Math.floor(data.g.length / vertexCount));
		const bStep = Math.max(1, Math.floor(data.b.length / vertexCount));

		for (let i = 0; i < vertexCount; i++) {
			const i3 = i * 3;

			// Sample analyzer data
			const xSample = data.x[Math.min(i * xStep, data.x.length - 1)] || 0;
			const ySample = data.y[Math.min(i * yStep, data.y.length - 1)] || 0;
			const rSample = Math.abs(
				data.r[Math.min(i * rStep, data.r.length - 1)] || 0
			);
			const gSample = Math.abs(
				data.g[Math.min(i * gStep, data.g.length - 1)] || 0
			);
			const bSample = Math.abs(
				data.b[Math.min(i * bStep, data.b.length - 1)] || 0
			);

			// Convert to positions (X and Y control position, create circular arrangement)
			const angle = (i / vertexCount) * Math.PI * 2;
			const radius = 1 + (xSample + ySample) * positionScale * 0.5;

			const targetX = Math.cos(angle) * radius;
			const targetY = Math.sin(angle) * radius;
			const targetZ = (xSample - ySample) * positionScale;

			// Convert to colors (R, G, B control color channels)
			const targetR = Math.min(1, Math.max(0, rSample * 2));
			const targetG = Math.min(1, Math.max(0, gSample * 2));
			const targetB = Math.min(1, Math.max(0, bSample * 2));

			if (smoothing) {
				// Smooth interpolation
				const smoothFactor = 0.1 * animationSpeed;

				positions[i3] =
					prevPositions[i3] + (targetX - prevPositions[i3]) * smoothFactor;
				positions[i3 + 1] =
					prevPositions[i3 + 1] +
					(targetY - prevPositions[i3 + 1]) * smoothFactor;
				positions[i3 + 2] =
					prevPositions[i3 + 2] +
					(targetZ - prevPositions[i3 + 2]) * smoothFactor;

				colors[i3] = prevColors[i3] + (targetR - prevColors[i3]) * smoothFactor;
				colors[i3 + 1] =
					prevColors[i3 + 1] + (targetG - prevColors[i3 + 1]) * smoothFactor;
				colors[i3 + 2] =
					prevColors[i3 + 2] + (targetB - prevColors[i3 + 2]) * smoothFactor;
			} else {
				// Direct assignment
				positions[i3] = targetX;
				positions[i3 + 1] = targetY;
				positions[i3 + 2] = targetZ;

				colors[i3] = targetR;
				colors[i3 + 1] = targetG;
				colors[i3 + 2] = targetB;
			}
		}

		// Store current values for next frame
		prevPositions.set(positions);
		prevColors.set(colors);

		// Mark attributes as needing update
		if (meshRef.current?.geometry) {
			meshRef.current.geometry.attributes.position.needsUpdate = true;
			meshRef.current.geometry.attributes.color.needsUpdate = true;
			meshRef.current.geometry.computeBoundingSphere();
		}
	};

	// Update geometry on each frame
	useFrame(() => {
		updateGeometry(analyzerData);
	});

	return (
		<primitive
			object={
				new THREE.Line(
					geometry,
					new THREE.LineBasicMaterial({
						vertexColors: true,
						linewidth: 2,
						transparent: true,
						opacity: 0.8,
					})
				)
			}
			ref={meshRef}
		/>
	);
}
