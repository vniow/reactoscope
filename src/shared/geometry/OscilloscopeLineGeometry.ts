/**
 * Oscilloscope Line Geometry
 *
 * Generates Three.js BufferGeometry for oscilloscope line rendering
 * from audio analyzer data. Creates quad-based line segments with
 * proper attributes for gaussian shader rendering.
 */

import * as THREE from 'three';

export interface AudioChannelData {
	x: Float32Array;
	y: Float32Array;
	r: Float32Array;
	g: Float32Array;
	b: Float32Array;
}

/**
 * Creates line geometry from audio channel data
 * Each line segment becomes a quad (4 vertices) for shader-based rendering
 */
export class OscilloscopeLineGeometry extends THREE.BufferGeometry {
	private maxSegments: number;
	private currentSegments: number = 0;

	// Attribute arrays (pre-allocated for performance)
	private indices: Uint16Array;
	private startPositions: Float32Array;
	private endPositions: Float32Array;
	private vertexIndices: Float32Array;
	private startColors: Float32Array;
	private endColors: Float32Array;

	constructor(maxSegments: number = 512) {
		super();

		this.maxSegments = maxSegments;

		// Pre-allocate all attribute arrays
		// Each segment = 4 vertices
		this.startPositions = new Float32Array(maxSegments * 4 * 2);
		this.endPositions = new Float32Array(maxSegments * 4 * 2);
		this.vertexIndices = new Float32Array(maxSegments * 4);
		this.startColors = new Float32Array(maxSegments * 4 * 3);
		this.endColors = new Float32Array(maxSegments * 4 * 3);

		// Indices for quad triangulation (2 triangles per segment)
		this.indices = new Uint16Array(maxSegments * 6);

		// Set up index buffer (this never changes)
		this.setupIndices();

		// Initialize Three.js attributes
		this.setupAttributes();
	}

	/**
	 * Set up triangle indices for quad rendering
	 * Each quad uses 2 triangles: [0,1,2] and [0,2,3]
	 */
	private setupIndices(): void {
		for (let i = 0; i < this.maxSegments; i++) {
			const baseVertex = i * 4;
			const baseIndex = i * 6;

			// First triangle: 0-1-2
			this.indices[baseIndex] = baseVertex;
			this.indices[baseIndex + 1] = baseVertex + 1;
			this.indices[baseIndex + 2] = baseVertex + 2;

			// Second triangle: 0-2-3
			this.indices[baseIndex + 3] = baseVertex;
			this.indices[baseIndex + 4] = baseVertex + 2;
			this.indices[baseIndex + 5] = baseVertex + 3;
		}
	}

	/**
	 * Initialize Three.js buffer attributes
	 */
	private setupAttributes(): void {
		// Position attribute - use 3D positions for Three.js compatibility
		const positions3D = new Float32Array(this.maxSegments * 4 * 3);
		this.setAttribute('position', new THREE.BufferAttribute(positions3D, 3));

		// Custom attributes for shader
		this.setAttribute(
			'aStart',
			new THREE.BufferAttribute(this.startPositions, 2)
		);
		this.setAttribute('aEnd', new THREE.BufferAttribute(this.endPositions, 2));
		this.setAttribute(
			'aIndex',
			new THREE.BufferAttribute(this.vertexIndices, 1)
		);
		this.setAttribute(
			'aColorStart',
			new THREE.BufferAttribute(this.startColors, 3)
		);
		this.setAttribute(
			'aColorEnd',
			new THREE.BufferAttribute(this.endColors, 3)
		);

		// Set up index buffer
		this.setIndex(new THREE.BufferAttribute(this.indices, 1));
	}

	/**
	 * Update geometry from audio analyzer data
	 */
	updateFromAudioData(audioData: AudioChannelData): void {
		const dataLength = Math.min(
			audioData.x.length,
			audioData.y.length,
			audioData.r.length,
			audioData.g.length,
			audioData.b.length
		);

		// Number of line segments = dataLength - 1
		this.currentSegments = Math.min(dataLength - 1, this.maxSegments);

		if (this.currentSegments <= 0) return;

		// Generate line segments
		for (let i = 0; i < this.currentSegments; i++) {
			this.createLineSegment(i, audioData, i, i + 1);
		}

		// Update draw range
		this.setDrawRange(0, this.currentSegments * 6);

		// Mark attributes as needing update
		this.getAttribute('position').needsUpdate = true;
		this.getAttribute('aStart').needsUpdate = true;
		this.getAttribute('aEnd').needsUpdate = true;
		this.getAttribute('aIndex').needsUpdate = true;
		this.getAttribute('aColorStart').needsUpdate = true;
		this.getAttribute('aColorEnd').needsUpdate = true;
	}

	/**
	 * Create a single line segment quad
	 */
	private createLineSegment(
		segmentIndex: number,
		audioData: AudioChannelData,
		startDataIndex: number,
		endDataIndex: number
	): void {
		const baseVertex = segmentIndex * 4;

		// Extract start and end positions
		const startX = audioData.x[startDataIndex];
		const startY = audioData.y[startDataIndex];
		const endX = audioData.x[endDataIndex];
		const endY = audioData.y[endDataIndex];

		// Extract start and end colors (map from [-1,1] to [0,1])
		const startR = Math.max(
			0,
			Math.min(1, (audioData.r[startDataIndex] + 1) * 0.5)
		);
		const startG = Math.max(
			0,
			Math.min(1, (audioData.g[startDataIndex] + 1) * 0.5)
		);
		const startB = Math.max(
			0,
			Math.min(1, (audioData.b[startDataIndex] + 1) * 0.5)
		);

		const endR = Math.max(
			0,
			Math.min(1, (audioData.r[endDataIndex] + 1) * 0.5)
		);
		const endG = Math.max(
			0,
			Math.min(1, (audioData.g[endDataIndex] + 1) * 0.5)
		);
		const endB = Math.max(
			0,
			Math.min(1, (audioData.b[endDataIndex] + 1) * 0.5)
		);

		// Get 3D position attribute
		const positionAttribute = this.getAttribute(
			'position'
		) as THREE.BufferAttribute;
		const positions3D = positionAttribute.array as Float32Array;

		// Create 4 vertices for the quad
		// The shader will position them correctly based on line direction
		for (let v = 0; v < 4; v++) {
			const vertexIndex = baseVertex + v;
			const pos2DIndex = vertexIndex * 2;
			const pos3DIndex = vertexIndex * 3;
			const colorIndex = vertexIndex * 3;

			// 3D Position for Three.js (will be overridden by shader)
			positions3D[pos3DIndex] = startX;
			positions3D[pos3DIndex + 1] = startY;
			positions3D[pos3DIndex + 2] = 0;

			// Start and end positions for shader
			this.startPositions[pos2DIndex] = startX;
			this.startPositions[pos2DIndex + 1] = startY;
			this.endPositions[pos2DIndex] = endX;
			this.endPositions[pos2DIndex + 1] = endY;

			// Vertex index for shader quad generation
			this.vertexIndices[vertexIndex] = v;

			// Start and end colors for interpolation
			this.startColors[colorIndex] = startR;
			this.startColors[colorIndex + 1] = startG;
			this.startColors[colorIndex + 2] = startB;

			this.endColors[colorIndex] = endR;
			this.endColors[colorIndex + 1] = endG;
			this.endColors[colorIndex + 2] = endB;
		}
	}

	/**
	 * Get current number of active segments
	 */
	getSegmentCount(): number {
		return this.currentSegments;
	}

	/**
	 * Get maximum capacity
	 */
	getMaxSegments(): number {
		return this.maxSegments;
	}

	/**
	 * Resize geometry capacity (rebuilds arrays)
	 */
	resize(newMaxSegments: number): void {
		if (newMaxSegments === this.maxSegments) return;

		this.maxSegments = newMaxSegments;

		// Recreate arrays
		this.startPositions = new Float32Array(newMaxSegments * 4 * 2);
		this.endPositions = new Float32Array(newMaxSegments * 4 * 2);
		this.vertexIndices = new Float32Array(newMaxSegments * 4);
		this.startColors = new Float32Array(newMaxSegments * 4 * 3);
		this.endColors = new Float32Array(newMaxSegments * 4 * 3);
		this.indices = new Uint16Array(newMaxSegments * 6);

		// Rebuild geometry
		this.setupIndices();
		this.setupAttributes();
	}
}
