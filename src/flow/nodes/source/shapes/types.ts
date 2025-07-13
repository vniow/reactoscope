/**
 * Shape System Types
 *
 * Defines the interface and types for the shape-based architecture.
 * All shapes must implement the Shape interface to be processed by scene traversal.
 */

import type * as THREE from 'three';
import type { VertexInfo } from '../sceneTypes';

/**
 * Base interface that all shapes must implement
 */
export interface Shape {
	/** Unique identifier for this shape instance */
	id: string;
	/** Type identifier for the shape (e.g., 'triangle', 'circle', 'polygon') */
	type: string;
	/** Human-readable name for the shape */
	name: string;
	/** Whether this shape should be included in scene traversal */
	enabled: boolean;
	/** Three.js Object3D that represents this shape in the scene */
	object3D: THREE.Object3D | null;
	/** Transform properties for positioning, rotation, and scale */
	transform: ShapeTransform;
	/** Visual properties specific to this shape */
	visualProperties: Record<string, unknown>;
	/** Audio properties that affect how this shape generates audio */
	audioProperties: ShapeAudioProperties;
}

/**
 * Extended interface for shapes that support high-resolution audio generation
 */
export interface HighResolutionShape extends Shape {
	/** Generate interpolated vertices at specified resolution for audio */
	generateAudioVertices(resolution: number): VertexInfo[];
	/** Get vertex at specific parameter t (0-1) along shape perimeter */
	getVertexAt(t: number): VertexInfo;
	/** Calculate shape circumference/perimeter for even distribution */
	getPerimeter(): number;
	/** Update the cached high-resolution audio data */
	updateAudioCache(): void;
	/** Get cached high-resolution vertices for audio generation */
	getCachedAudioVertices(): VertexInfo[];
	/** Check if audio cache is valid/up-to-date */
	isAudioCacheValid(): boolean;
}

/**
 * Transform properties for shape positioning and animation
 */
export interface ShapeTransform {
	/** Position in 3D space */
	position: { x: number; y: number; z: number };
	/** Rotation in radians */
	rotation: { x: number; y: number; z: number };
	/** Scale factors */
	scale: { x: number; y: number; z: number };
	/** Animation properties */
	animation?: {
		/** Rotation speed in radians per second */
		rotationSpeed?: { x: number; y: number; z: number };
		/** Position oscillation */
		oscillation?: {
			amplitude: { x: number; y: number; z: number };
			frequency: { x: number; y: number; z: number };
		};
	};
}

/**
 * Audio-specific properties for shapes
 */
export interface ShapeAudioProperties {
	/** Priority for audio processing (higher = processed first) */
	priority: number;
	/** Whether this shape contributes to each audio channel */
	channels: {
		x: boolean;
		y: boolean;
		r: boolean;
		g: boolean;
		b: boolean;
	};
	/** Amplitude scaling for this shape's contribution */
	amplitude: number;
	/** Phase offset for this shape's audio contribution */
	phaseOffset: number;
	/** High-resolution audio properties */
	highResolution: {
		/** Number of interpolated points for audio generation */
		audioResolution: number;
		/** Whether to cache high-resolution data */
		enableCaching: boolean;
		/** Cache update frequency in Hz (0 = update every frame) */
		cacheUpdateRate: number;
		/** Interpolation method for audio data */
		/** Interpolation method for audio data */
		interpolationMethod: 'linear' | 'catmullrom' | 'cubic' | 'bezier';
	};
}

/**
 * Configuration for creating a new shape
 */
export interface ShapeConfig {
	type: string;
	name?: string;
	transform?: Partial<ShapeTransform>;
	visualProperties?: Record<string, unknown>;
	audioProperties?: Partial<ShapeAudioProperties>;
}

/**
 * Result of shape processing for audio generation
 */
export interface ShapeAudioData {
	/** Shape that generated this data */
	shape: Shape;
	/** Extracted vertices with audio-relevant information */
	vertices: VertexInfo[];
	/** Processing timestamp */
	timestamp: number;
}

/**
 * Aggregated audio data from all shapes
 */
export interface SceneAudioData {
	/** Individual shape contributions */
	shapes: ShapeAudioData[];
	/** Combined vertices from all shapes */
	vertices: VertexInfo[];
	/** Processing timestamp */
	timestamp: number;
	/** Total number of shapes processed */
	shapeCount: number;
}

/**
 * Shape factory function signature
 */
export type ShapeFactory<T extends Shape = Shape> = (config: ShapeConfig) => T;

/**
 * Shape update function signature
 */
export type ShapeUpdateFunction<T extends Shape = Shape> = (
	shape: T,
	deltaTime: number
) => void;
