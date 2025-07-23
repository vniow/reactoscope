import type { VertexInfo } from '../../flow/nodes/source/sceneTypes';

/**
 * Chunk an array of VertexInfo by objectName.
 * Preserves the order of first appearance.
 */
export function chunkVerticesByObject(vertices: VertexInfo[]): VertexInfo[][] {
	const chunks: VertexInfo[][] = [];
	const indexMap = new Map<string, number>();
	vertices.forEach((vertex) => {
		const name = vertex.objectName || '';
		if (!indexMap.has(name)) {
			indexMap.set(name, chunks.length);
			chunks.push([]);
		}
		chunks[indexMap.get(name)!].push(vertex);
	});
	return chunks;
}

/**
 * Linear interpolation between two numbers
 */
function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Linear interpolation between two 2D points
 */
function lerpVec2(
	a: { x: number; y: number },
	b: { x: number; y: number },
	t: number
): { x: number; y: number } {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
	};
}

/**
 * Linear interpolation between two 3D points
 */
function lerpVec3(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
	t: number
): { x: number; y: number; z: number } {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
		z: lerp(a.z, b.z, t),
	};
}

/**
 * Given chunks of vertices per object, insert linear interpolated vertices
 * between the end of each chunk and the start of the next.
 * @param chunks Array of vertex chunks grouped by object
 * @param steps Number of interpolation steps between chunks
 */
export function interpolateBetweenChunks(
	chunks: VertexInfo[][],
	steps: number = 1
): VertexInfo[] {
	const result: VertexInfo[] = [];
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		if (chunk.length === 0) continue;
		// Append current chunk
		result.push(...chunk);

		// If next chunk exists, interpolate
		if (i < chunks.length - 1) {
			const last = chunk[chunk.length - 1];
			const nextFirst = chunks[i + 1][0];
			for (let s = 1; s <= steps; s++) {
				const t = s / (steps + 1);
				// Override z to constant 1 for screen and world
				const interp: VertexInfo = {
					screen: { ...lerpVec3(last.screen, nextFirst.screen, t), z: 1 },
					screenRaw: lerpVec2(last.screenRaw, nextFirst.screenRaw, t),
					world: { ...lerpVec3(last.world, nextFirst.world, t), z: 1 },
					color: { r: 0, g: 0, b: 0 },
					objectName: 'interpolation',
					isInterpolated: true,
				};
				result.push(interp);
			}
		}
	}
	// console.log('[interpolateBetweenChunks] result:', result);
	return result;
}
