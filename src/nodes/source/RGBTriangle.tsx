import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';

interface RGBTriangleProps {
	/** Scale factor for triangle size */
	scale?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
}

/**
 * RGB Triangle Component
 * Creates a triangle with red, green, and blue vertices using BufferGeometry
 */
export function RGBTriangle({
	scale = 1,
	rotationSpeed = 1,
}: RGBTriangleProps): React.ReactElement {
	const groupRef = useRef<THREE.Group>(null);

	// State for segment density
	const [segmentDensity, setSegmentDensity] = useState(16);

	// Triangle vertices and their colors, and interpolate points/colors
	const { points, colorsArr } = useMemo(() => {
		const vertices: [number, number, number][] = [
			[0, scale, 0],
			[-0.866 * scale, -0.5 * scale, 0],
			[0.866 * scale, -0.5 * scale, 0],
		];
		const vertexColors: [number, number, number][] = [
			[1, 0, 0], // Red
			[0, 1, 0], // Green
			[0, 0, 1], // Blue
		];
		const pts: [number, number, number][] = [];
		const cols: [number, number, number][] = [];
		for (let edge = 0; edge < 3; edge++) {
			const start = vertices[edge];
			const end = vertices[(edge + 1) % 3];
			const colorStart = vertexColors[edge];
			const colorEnd = vertexColors[(edge + 1) % 3];
			for (let i = 0; i < segmentDensity; i++) {
				const t = i / segmentDensity;
				const pt: [number, number, number] = [
					start[0] * (1 - t) + end[0] * t,
					start[1] * (1 - t) + end[1] * t,
					start[2] * (1 - t) + end[2] * t,
				];
				const col: [number, number, number] = [
					colorStart[0] * (1 - t) + colorEnd[0] * t,
					colorStart[1] * (1 - t) + colorEnd[1] * t,
					colorStart[2] * (1 - t) + colorEnd[2] * t,
				];
				pts.push(pt);
				cols.push(col);
			}
		}
		// Close the triangle
		pts.push(vertices[0]);
		cols.push(vertexColors[0]);
		return { points: pts, colorsArr: cols };
	}, [scale, segmentDensity]);

	// Animate rotation
	useFrame((_, delta) => {
		if (groupRef.current) {
			groupRef.current.rotation.z += rotationSpeed * delta;
		}
	});

	return (
		<>
			<group ref={groupRef}>
				<Line
					points={points}
					vertexColors={colorsArr}
					lineWidth={1}
				/>
				<Html
					position={[0, 0, 0]}
					style={{ pointerEvents: 'auto' }}
					zIndexRange={[10, 0]}
				>
					<div
						style={{
							background: 'rgba(0,0,0,0.5)',
							padding: 8,
							borderRadius: 8,
							color: '#fff',
							fontSize: 12,
						}}
					>
						<label>
							Segment Density: {segmentDensity}
							<input
								type='range'
								min={3}
								max={128}
								value={segmentDensity}
								onChange={(e) => setSegmentDensity(Number(e.target.value))}
								style={{ width: 120, marginLeft: 8 }}
							/>
						</label>
					</div>
				</Html>
			</group>
		</>
	);
}
