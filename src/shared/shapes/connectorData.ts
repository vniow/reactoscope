import { RGB_TRIANGLE_POINTS } from './triangleData';
import { GREEN_SQUARE_POINTS } from './squareData';

/**
 * Connector shape data
 * Uses last triangle vertex and first square vertex
 */
export const CONNECTOR_POINTS1: [number, number, number][] = [
	RGB_TRIANGLE_POINTS[RGB_TRIANGLE_POINTS.length - 1],
	GREEN_SQUARE_POINTS[0],
];

export const CONNECTOR_POINTS2: [number, number, number][] = [
	GREEN_SQUARE_POINTS[GREEN_SQUARE_POINTS.length - 1],
	RGB_TRIANGLE_POINTS[0],
];

/**
 * Connector line colors (black)
 */
export const CONNECTOR_COLORS: [number, number, number][] = [
	[0, 0, 0],
	[0, 0, 0],
];
