import { RGB_TRIANGLE_POINTS } from './triangleData';
import { GREEN_SQUARE_POINTS } from './squareData';

/**
 * Connector shape data
 * Uses last triangle vertex and first square vertex
 */
export const CONNECTOR_POINTS: [number, number, number][] = [
	[-0.5, 0.5, 0],
	[0.5, 0.5, 0],
];

/**
 * Connector line colors (white)
 */
export const CONNECTOR_COLORS: [number, number, number][] = [
	[1, 1, 1],
	[1, 1, 1],
];
