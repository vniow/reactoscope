import { Line } from '@react-three/drei';
import { Color } from 'three';
import { getRotatedDotPosition } from '../utils/geometry';
import type { PolygonShapeProps } from './BasicShapes';
import { ShapeDot } from './ShapeDot';

export function PolygonShape({
	sides,
	lineWidth = 1,
	rotation = [0, 0, 0],
}: PolygonShapeProps) {
	// Clamp sides to minimum 3
	const n = Math.max(3, Math.floor(sides));
	const angleStep = (Math.PI * 2) / n;
	// Generate vertices on unit circle, shifted down by 0.75 on y
	const yOffset = -0.75;
	const points: [number, number, number][] = Array.from(
		{ length: n + 1 },
		(_, i) => {
			const angle = i * angleStep;
			return [Math.cos(angle), Math.sin(angle) + yOffset, 0];
		}
	);
	// Assign colors (cycle through a palette)
	const palette = [
		0xff0000, 0x00ff00, 0x0000ff, 0xff9900, 0x00ffff, 0xff00ff, 0xffff00,
	];
	const vertexColors = points.map(
		(_, i) => new Color(palette[i % palette.length])
	);
	// Centroid (average of first n points)
	const centroid = points
		.slice(0, n)
		.reduce(
			(acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
			[0, 0, 0]
		)
		.map((v) => v / n) as [number, number, number];
	const rotatedPoints = points.map((p) =>
		getRotatedDotPosition(p, centroid, rotation)
	);
	// Last vertex for dot
	const dotPosition = getRotatedDotPosition(points[n - 1], centroid, rotation);
	return (
		<>
			<Line
				points={rotatedPoints}
				vertexColors={vertexColors}
				lineWidth={lineWidth}
			/>
			<ShapeDot position={dotPosition} />
		</>
	);
}
