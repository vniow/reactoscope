export interface PolygonShapeProps extends ShapeProps {
	sides: number;
}

import { Line } from '@react-three/drei';
import { Color } from 'three';
import { getRotatedDotPosition } from '../utils/geometry';

// Utility to compute centroid, rotated points, and dot position for a shape
function getShapeGeometry({
	points,
	rotation,
	dotIndex = 0,
}: {
	points: [number, number, number][];
	rotation: [number, number, number];
	dotIndex?: number;
}) {
	const centroid = points
		.slice(0, points.length - 1)
		.reduce(
			(acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
			[0, 0, 0]
		)
		.map((v) => v / (points.length - 1)) as [number, number, number];
	const rotatedPoints = points.map((p) =>
		getRotatedDotPosition(p, centroid, rotation)
	);
	const dotPosition = getRotatedDotPosition(
		points[dotIndex],
		centroid,
		rotation
	);
	return { centroid, rotatedPoints, dotPosition };
}
import { ShapeDot } from './ShapeDot';

export interface ShapeProps {
	lineWidth?: number;
	rotation?: [number, number, number];
}

export function TriangleShape({
	lineWidth = 1,
	rotation = [0, 0, 0],
}: ShapeProps) {
	// Shift triangle up by 0.75 on y
	const yOffset = 0.75;
	const points: [number, number, number][] = [
		[-1, 0 + yOffset, 0],
		[0, 0 + yOffset, 0],
		[0, 1 + yOffset, 0],
		[-1, 0 + yOffset, 0],
	];
	const vertexColors = [
		new Color(0xff0000),
		new Color(0x00ff00),
		new Color(0x0000ff),
		new Color(0xff0000),
	];
	// Use utility for geometry
	const { rotatedPoints, dotPosition } = getShapeGeometry({
		points,
		rotation,
		dotIndex: 2,
	});
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

export function SquareShape({
	lineWidth = 1,
	rotation = [0, 0, 0],
}: ShapeProps) {
	// Shift square up by 0.75 on y
	const yOffset = 0.75;
	const points: [number, number, number][] = [
		[0.5, 0.5 + yOffset, 0],
		[1.0, 0.5 + yOffset, 0],
		[1.0, 0 + yOffset, 0],
		[0.5, 0 + yOffset, 0],
		[0.5, 0.5 + yOffset, 0],
	];
	const vertexColors = [
		new Color(0x00ff00),
		new Color(0x0000ff),
		new Color(0xff0000),
		new Color(0xff9900),
		new Color(0x00ff00),
	];
	// Use utility for geometry
	const { rotatedPoints, dotPosition } = getShapeGeometry({
		points,
		rotation,
		dotIndex: 0,
	});
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
