/**
 * Simple types for scene traversal
 */

export interface VertexInfo {
	screen: { x: number; y: number };
	screenRaw: { x: number; y: number };
	color: { r: number; g: number; b: number };
	world: { x: number; y: number; z: number };
}

export interface SceneData {
	vertices: VertexInfo[];
	timestamp: number;
}
