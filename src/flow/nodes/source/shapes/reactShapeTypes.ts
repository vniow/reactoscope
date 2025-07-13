/**
 * React Three Fiber Shape Types
 *
 * Simplified types for React Three Fiber-based shapes
 */

import type { ComponentType } from 'react';

/**
 * Transform properties for React Three Fiber shapes
 */
export interface ReactShapeTransform {
	position: { x: number; y: number; z: number };
	rotation: { x: number; y: number; z: number };
	scale: { x: number; y: number; z: number };
	animation?: {
		rotationSpeed: { x: number; y: number; z: number };
	};
}

/**
 * Configuration for React shapes
 */
export interface ReactShapeConfig {
	id: string;
	type: string;
	name?: string;
	enabled?: boolean;
	transform?: Partial<ReactShapeTransform>;
	[key: string]: unknown;
}

/**
 * Shape component props interface
 */
export interface ReactShapeProps {
	config: ReactShapeConfig;
}

/**
 * Shape component registry
 */
export interface ReactShapeComponent {
	type: string;
	name: string;
	component: ComponentType<ReactShapeProps>;
	defaultConfig: Partial<ReactShapeConfig>;
}
