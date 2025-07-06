/**
 * Shape Registry
 *
 * Manages shape instances and their lifecycle for the XYRGB Generator Node.
 * Provides centralized management of all shapes in a scene.
 */

import * as THREE from 'three';
import type {
	Shape,
	HighResolutionShape,
	ShapeConfig,
	ShapeFactory,
	ShapeUpdateFunction,
	ShapeAudioData,
	SceneAudioData,
} from './types';
import { extractVerticesFromScene } from '../sceneTraversal';

/**
 * Registry for managing shapes and their factories
 */
export class ShapeRegistry {
	private shapes = new Map<string, Shape>();
	private factories = new Map<string, ShapeFactory>();
	private updateFunctions = new Map<string, ShapeUpdateFunction>();
	private scene: THREE.Scene | null = null;

	/**
	 * Register a shape factory for a specific shape type
	 */
	registerShapeType<T extends Shape>(
		type: string,
		factory: ShapeFactory<T>,
		updateFunction?: ShapeUpdateFunction<T>
	): void {
		this.factories.set(type, factory as ShapeFactory);
		if (updateFunction) {
			this.updateFunctions.set(type, updateFunction as ShapeUpdateFunction);
		}
	}

	/**
	 * Create a new shape instance
	 */
	createShape(id: string, config: ShapeConfig): Shape | null {
		const factory = this.factories.get(config.type);
		if (!factory) {
			console.warn(`No factory registered for shape type: ${config.type}`);
			return null;
		}

		const shape = factory({
			...config,
			name: config.name ?? `${config.type}-${id}`,
		});

		shape.id = id;
		this.shapes.set(id, shape);

		// Add to scene if available
		if (this.scene && shape.object3D) {
			this.scene.add(shape.object3D);
		}

		return shape;
	}

	/**
	 * Remove a shape instance
	 */
	removeShape(id: string): boolean {
		const shape = this.shapes.get(id);
		if (!shape) {
			return false;
		}

		// Remove from scene
		if (this.scene && shape.object3D) {
			this.scene.remove(shape.object3D);
		}

		this.shapes.delete(id);
		return true;
	}

	/**
	 * Get a shape by ID
	 */
	getShape(id: string): Shape | undefined {
		return this.shapes.get(id);
	}

	/**
	 * Get all shapes
	 */
	getAllShapes(): Shape[] {
		return Array.from(this.shapes.values());
	}

	/**
	 * Get shapes by type
	 */
	getShapesByType(type: string): Shape[] {
		return this.getAllShapes().filter((shape) => shape.type === type);
	}

	/**
	 * Get enabled shapes only
	 */
	getEnabledShapes(): Shape[] {
		return this.getAllShapes().filter((shape) => shape.enabled);
	}

	/**
	 * Update a shape's properties
	 */
	updateShape(id: string, updates: Partial<Shape>): boolean {
		const shape = this.shapes.get(id);
		if (!shape) {
			return false;
		}

		Object.assign(shape, updates);
		return true;
	}

	/**
	 * Set the Three.js scene for shape management
	 */
	setScene(scene: THREE.Scene): void {
		this.scene = scene;

		// Add existing shapes to the new scene
		for (const shape of this.shapes.values()) {
			if (shape.object3D) {
				scene.add(shape.object3D);
			}
		}
	}

	/**
	 * Update all shapes (called on each frame)
	 */
	updateShapes(deltaTime: number): void {
		for (const shape of this.shapes.values()) {
			if (!shape.enabled) continue;

			const updateFunction = this.updateFunctions.get(shape.type);
			if (updateFunction) {
				updateFunction(shape, deltaTime);
			}

			// Apply transform animations if defined
			this.updateShapeTransform(shape, deltaTime);
		}
	}

	/**
	 * Extract audio data from all enabled shapes
	 * Supports both traditional scene traversal and high-resolution cached vertices
	 */
	extractAudioData(camera: THREE.Camera): SceneAudioData {
		const enabledShapes = this.getEnabledShapes();
		const shapeAudioData: ShapeAudioData[] = [];
		const allVertices: Array<import('../sceneTypes').VertexInfo> = [];

		for (const shape of enabledShapes) {
			let processedVertices: Array<import('../sceneTypes').VertexInfo>;

			// Check if shape supports high-resolution audio generation
			if (this.isHighResolutionShape(shape)) {
				// Use cached high-resolution vertices for audio
				const cachedVertices = shape.getCachedAudioVertices();

				// Apply shape-specific audio properties to cached vertices
				processedVertices = cachedVertices.map(
					(vertex: import('../sceneTypes').VertexInfo) => ({
						...vertex,
						// Apply amplitude scaling
						screen: {
							x: vertex.screen.x * shape.audioProperties.amplitude,
							y: vertex.screen.y * shape.audioProperties.amplitude,
						},
						// Apply phase offset to color channels
						color: {
							r: Math.max(
								0,
								Math.min(1, vertex.color.r + shape.audioProperties.phaseOffset)
							),
							g: Math.max(
								0,
								Math.min(1, vertex.color.g + shape.audioProperties.phaseOffset)
							),
							b: Math.max(
								0,
								Math.min(1, vertex.color.b + shape.audioProperties.phaseOffset)
							),
						},
					})
				);
			} else {
				// Fallback to traditional scene traversal for non-high-res shapes
				if (!shape.object3D || !this.scene) {
					continue;
				}

				// Create a temporary scene with just this shape for isolated extraction
				const tempScene = new THREE.Scene();
				tempScene.add(shape.object3D.clone());

				// Extract vertices for this shape only
				const sceneData = extractVerticesFromScene(tempScene, camera);

				// Apply shape-specific audio properties to vertices
				processedVertices = sceneData.vertices.map((vertex) => ({
					...vertex,
					// Apply amplitude scaling
					screen: {
						x: vertex.screen.x * shape.audioProperties.amplitude,
						y: vertex.screen.y * shape.audioProperties.amplitude,
					},
					// Apply phase offset to color channels
					color: {
						r: Math.max(
							0,
							Math.min(1, vertex.color.r + shape.audioProperties.phaseOffset)
						),
						g: Math.max(
							0,
							Math.min(1, vertex.color.g + shape.audioProperties.phaseOffset)
						),
						b: Math.max(
							0,
							Math.min(1, vertex.color.b + shape.audioProperties.phaseOffset)
						),
					},
				}));
			}

			const shapeData: ShapeAudioData = {
				shape,
				vertices: processedVertices,
				timestamp: Date.now(),
			};

			shapeAudioData.push(shapeData);

			// Add to combined vertices (priority-sorted)
			allVertices.push(...processedVertices);
		}

		// Sort by shape priority (higher first)
		shapeAudioData.sort(
			(a, b) =>
				b.shape.audioProperties.priority - a.shape.audioProperties.priority
		);

		return {
			shapes: shapeAudioData,
			vertices: allVertices,
			timestamp: Date.now(),
			shapeCount: enabledShapes.length,
		};
	}

	/**
	 * Clear all shapes
	 */
	clear(): void {
		// Remove all shapes from scene
		if (this.scene) {
			for (const shape of this.shapes.values()) {
				if (shape.object3D) {
					this.scene.remove(shape.object3D);
				}
			}
		}

		this.shapes.clear();
	}

	/**
	 * Type guard to check if a shape supports high-resolution audio generation
	 */
	private isHighResolutionShape(shape: Shape): shape is HighResolutionShape {
		return (
			'getCachedAudioVertices' in shape &&
			typeof shape.getCachedAudioVertices === 'function'
		);
	}

	/**
	 * Private method to update shape transforms based on animation properties
	 */
	private updateShapeTransform(shape: Shape, deltaTime: number): void {
		if (!shape.object3D || !shape.transform.animation) return;

		const { animation } = shape.transform;
		const obj = shape.object3D;

		// Apply rotation animation
		if (animation.rotationSpeed) {
			obj.rotation.x += animation.rotationSpeed.x * deltaTime;
			obj.rotation.y += animation.rotationSpeed.y * deltaTime;
			obj.rotation.z += animation.rotationSpeed.z * deltaTime;
		}

		// Apply oscillation animation
		if (animation.oscillation) {
			const time = Date.now() * 0.001; // Convert to seconds
			const { amplitude, frequency } = animation.oscillation;

			obj.position.x =
				shape.transform.position.x + Math.sin(time * frequency.x) * amplitude.x;
			obj.position.y =
				shape.transform.position.y + Math.sin(time * frequency.y) * amplitude.y;
			obj.position.z =
				shape.transform.position.z + Math.sin(time * frequency.z) * amplitude.z;
		} else {
			// Apply static transform
			obj.position.set(
				shape.transform.position.x,
				shape.transform.position.y,
				shape.transform.position.z
			);
		}

		// Apply scale
		obj.scale.set(
			shape.transform.scale.x,
			shape.transform.scale.y,
			shape.transform.scale.z
		);

		// Apply static rotation if no animation
		if (!animation.rotationSpeed) {
			obj.rotation.set(
				shape.transform.rotation.x,
				shape.transform.rotation.y,
				shape.transform.rotation.z
			);
		}
	}
}

/**
 * Global shape registry instance
 */
export const globalShapeRegistry = new ShapeRegistry();

/**
 * Hook for accessing the shape registry in React components
 */
export function useShapeRegistry(): ShapeRegistry {
	return globalShapeRegistry;
}
