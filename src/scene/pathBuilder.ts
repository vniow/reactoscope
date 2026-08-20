/**
 * Scene-to-audio path builder.
 *
 * Three pipeline stages:
 *   1. collectSegments  — traverse the Three.js scene, project geometry to NDC
 *   2. orderSegments    — nearest-neighbour ordering to minimise blank travel
 *   3. buildCoordBuffer — resample into a fixed-resolution coordinate buffer
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Segment = {
	/**
	 * NDC-space projected points: [x, y, intensity].
	 * x, y are NDC after MVP projection.
	 * intensity ∈ [0, 1]: from geometry.attributes.intensity if present,
	 * otherwise falls back to (1 − ndcZ) depth heuristic.
	 */
	points: [number, number, number][];
	/**
	 * Per-vertex linear-space RGB ∈ [0, 1]. Same length as points.
	 * From geometry.attributes.color (vertexColors) if present,
	 * otherwise the object's material color replicated to each vertex.
	 */
	colors: [number, number, number][];
};

export type OrderedPath = {
	segments:      Segment[];
	traversal:     number[];   // visit order (indices into segments[])
	reversed:      boolean[];  // true → traverse this segment backwards
	blankDists:    number[];   // blank travel distance before each visited segment
	totalGeomLen:  number;     // sum of all visible segment arc lengths
	totalBlankLen: number;     // sum of all blank travel distances
};

// ─── Tuning constants ─────────────────────────────────────────────────────────

const VISIBLE_FRACTION  = 0.85; // fraction of sample budget for geometry vs blanking

/**
 * Set `object.userData[EXCLUDE_FROM_SCAN_KEY] = true` on a scene object to
 * keep it (and its whole subtree) out of the beam path — for UI-only scene
 * content that must render visually but isn't part of the authored geometry,
 * e.g. the arrange-scene's TransformControls gizmo (its rings/arrows are
 * real THREE.Line objects living in the same scene collectSegments scans).
 */
export const EXCLUDE_FROM_SCAN_KEY = 'reactoscopeExcludeFromScan';

// ─── Reusable scratch objects (avoids GC pressure in useFrame) ────────────────

const _vpMatrix = new THREE.Matrix4();
const _mvpCache = new WeakMap<THREE.Object3D, THREE.Matrix4>();
const _v4       = new THREE.Vector4();
// Shared arc-length accumulator — reset and reused each segment to avoid per-call allocation.
const _cumLen: number[] = [];

// ─── Stage 1: collectSegments ─────────────────────────────────────────────────

/**
 * Traverse the scene, projecting visible line/point geometry into NDC space.
 * Each contiguous sub-path becomes one Segment with per-vertex color and intensity.
 *
 * Per-vertex data sources (in priority order):
 *   color     — geometry.attributes.color (Float32, 3 components, linear RGB)
 *               falls back to the material's base color for all vertices
 *   intensity — geometry.attributes.intensity (Float32, 1 component, [0..1])
 *               falls back to (1 − ndcZ) depth heuristic for backward compatibility
 */
export function collectSegments(scene: THREE.Scene, camera: THREE.Camera): Segment[] {
	camera.updateWorldMatrix(true, false);
	_vpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

	const segments: Segment[] = [];

	// Manual recursion (not scene.traverse) so an excluded object's whole
	// subtree is pruned rather than visited-then-filtered per node — needed
	// for UI-only scene objects like the arrange-scene's TransformControls
	// gizmo (its rings/arrows are real THREE.Line objects that would
	// otherwise get scanned into the beam path — see EXCLUDE_FROM_SCAN_KEY).
	function walk(obj: THREE.Object3D): void {
		if (!obj.visible || obj.userData[EXCLUDE_FROM_SCAN_KEY]) return;
		visit(obj);
		for (const child of obj.children) walk(child);
	}

	function visit(obj: THREE.Object3D): void {

		// ── Resolve MVP matrix (cached per object reference) ──
		let mvp = _mvpCache.get(obj);
		if (!mvp) {
			mvp = new THREE.Matrix4();
			_mvpCache.set(obj, mvp);
		}
		mvp.multiplyMatrices(_vpMatrix, obj.matrixWorld);

		// ── Resolve base colour from material (fallback when no vertex colors) ──
		let matR = 1, matG = 1, matB = 1;
		const mat = (obj as THREE.LineSegments).material;
		if (mat && (mat as THREE.LineBasicMaterial).isLineBasicMaterial) {
			const lm = mat as THREE.LineBasicMaterial;
			matR = lm.color.r; matG = lm.color.g; matB = lm.color.b;
		} else if (mat && (mat as THREE.PointsMaterial).isPointsMaterial) {
			const pm = mat as THREE.PointsMaterial;
			matR = pm.color.r; matG = pm.color.g; matB = pm.color.b;
		}

		const geo = (obj as THREE.LineSegments).geometry as THREE.BufferGeometry | undefined;
		if (!geo) return;
		const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
		if (!pos) return;

		const colorAttr     = geo.attributes.color     as THREE.BufferAttribute | undefined;
		const intensityAttr = geo.attributes.intensity as THREE.BufferAttribute | undefined;

		// Build one vertex's [ndcX, ndcY, intensity] + [r, g, b] from index.
		const buildVertex = (index: number): {
			pt:  [number, number, number];
			col: [number, number, number];
		} => {
			const [ndcX, ndcY, ndcZ] = projectVertex(pos, index, mvp!);
			const intensity = intensityAttr
				? Math.max(0, Math.min(1, intensityAttr.getX(index)))
				: Math.max(0, Math.min(1, 1.0 - ndcZ));
			const r = colorAttr ? colorAttr.getX(index) : matR;
			const g = colorAttr ? colorAttr.getY(index) : matG;
			const b = colorAttr ? colorAttr.getZ(index) : matB;
			return { pt: [ndcX, ndcY, intensity], col: [r, g, b] };
		};

		if (obj instanceof THREE.LineSegments) {
			// Pairs of vertices form individual segments
			for (let i = 0; i + 1 < pos.count; i += 2) {
				const a = buildVertex(i);
				const b = buildVertex(i + 1);
				segments.push({ points: [a.pt, b.pt], colors: [a.col, b.col] });
			}
		} else if (obj instanceof THREE.Line) {
			// Consecutive vertices — split into individual pairs for nearest-neighbour
			const isLoop = obj instanceof THREE.LineLoop;
			for (let i = 0; i + 1 < pos.count; i++) {
				const a = buildVertex(i);
				const b = buildVertex(i + 1);
				segments.push({ points: [a.pt, b.pt], colors: [a.col, b.col] });
			}
			if (isLoop && pos.count > 1) {
				const a = buildVertex(pos.count - 1);
				const b = buildVertex(0);
				segments.push({ points: [a.pt, b.pt], colors: [a.col, b.col] });
			}
		} else if (obj instanceof THREE.Points) {
			// Each point is a zero-length segment (dwell point)
			for (let i = 0; i < pos.count; i++) {
				const v = buildVertex(i);
				segments.push({ points: [v.pt, v.pt], colors: [v.col, v.col] });
			}
		}
	}

	walk(scene);

	return segments;
}

function projectVertex(
	pos: THREE.BufferAttribute,
	index: number,
	mvp:   THREE.Matrix4,
): [number, number, number] {
	_v4.set(pos.getX(index), pos.getY(index), pos.getZ(index), 1).applyMatrix4(mvp);
	const w = _v4.w || 1;
	return [_v4.x / w, _v4.y / w, _v4.z / w];
}

// ─── Stage 2: orderSegments ───────────────────────────────────────────────────

/** 2D Euclidean distance. */
function dist(ax: number, ay: number, bx: number, by: number): number {
	const dx = ax - bx, dy = ay - by;
	return Math.sqrt(dx * dx + dy * dy);
}

function segStart(seg: Segment): [number, number] { return [seg.points[0][0], seg.points[0][1]]; }
function segEnd  (seg: Segment): [number, number] { const p = seg.points[seg.points.length - 1]; return [p[0], p[1]]; }

function segArcLen(seg: Segment): number {
	let len = 0;
	for (let i = 0; i < seg.points.length - 1; i++) {
		len += dist(seg.points[i][0], seg.points[i][1], seg.points[i + 1][0], seg.points[i + 1][1]);
	}
	return len;
}

/**
 * Greedy nearest-neighbour ordering.
 * Each segment can be traversed in either direction — always pick the closer endpoint.
 * Stores the end position of the last frame so the first blank travel is continuous.
 */
export function orderSegments(
	segments: Segment[],
	startPos: { x: number; y: number },
): OrderedPath {
	if (segments.length === 0) {
		return { segments, traversal: [], reversed: [], blankDists: [], totalGeomLen: 0, totalBlankLen: 0 };
	}

	const unvisited  = new Set<number>(segments.map((_, i) => i));
	const traversal:  number[]  = [];
	const reversed:   boolean[] = [];
	const blankDists: number[]  = [];
	let totalGeomLen  = 0;
	let totalBlankLen = 0;
	let curX = startPos.x;
	let curY = startPos.y;

	while (unvisited.size > 0) {
		let bestIdx  = -1;
		let bestDist = Infinity;
		let bestRev  = false;

		for (const idx of unvisited) {
			const seg = segments[idx];
			const [sx, sy] = segStart(seg);
			const [ex, ey] = segEnd(seg);
			const dS = dist(curX, curY, sx, sy);
			const dE = dist(curX, curY, ex, ey);
			if (dS < bestDist) { bestDist = dS; bestIdx = idx; bestRev = false; }
			if (dE < bestDist) { bestDist = dE; bestIdx = idx; bestRev = true;  }
		}

		unvisited.delete(bestIdx);
		traversal.push(bestIdx);
		reversed.push(bestRev);
		blankDists.push(bestDist);
		totalBlankLen += bestDist;
		totalGeomLen  += segArcLen(segments[bestIdx]);

		const seg = segments[bestIdx];
		if (bestRev) { [curX, curY] = segStart(seg); }
		else         { [curX, curY] = segEnd(seg);   }
	}

	return { segments, traversal, reversed, blankDists, totalGeomLen, totalBlankLen };
}

// ─── Stage 3: buildCoordBuffer ────────────────────────────────────────────────

/**
 * Interleaved layout per point (COORD_STRIDE floats):
 *   [x, y, r, g, b, a, blank]
 * blank: 0.0 = visible, 1.0 = blanked beam travel
 * r/g/b/a are in [-1, +1] audio range.
 * x/y are NDC in [-1, +1].
 */
export const COORD_STRIDE = 7;

/**
 * Convert an ordered path into a fixed-resolution coordinate buffer for
 * real-time cycling in the AudioWorklet. Resamples the path to exactly
 * `nPoints` evenly-spaced geometric points; the worklet cycles through them
 * at a configurable scan frequency, completely decoupling draw rate from
 * geometry density.
 *
 * Blanking is encoded as a per-point flag rather than a dedicated sample
 * range, so the worklet can output silent color channels while still moving
 * the beam.
 */
export function buildCoordBuffer(
	path:     OrderedPath,
	nPoints:  number,
	prevEnd:  { x: number; y: number },
): { data: Float32Array; nPoints: number; endPos: { x: number; y: number } } {
	const data = new Float32Array(nPoints * COORD_STRIDE);
	let   wp   = 0;
	let lastX  = prevEnd.x;
	let lastY  = prevEnd.y;
	let endX   = lastX;
	let endY   = lastY;

	function emit(x: number, y: number, r: number, g: number, b: number, a: number, blank: number): void {
		if (wp >= nPoints) return;
		const o   = wp * COORD_STRIDE;
		data[o]   = x;  data[o + 1] = y;
		data[o + 2] = r; data[o + 3] = g; data[o + 4] = b; data[o + 5] = a;
		data[o + 6] = blank;
		wp++;
	}

	if (path.traversal.length === 0) {
		while (wp < nPoints) emit(lastX, lastY, -1, -1, -1, -1, 1);
		return { data, nPoints, endPos: prevEnd };
	}

	const { segments, traversal, reversed, blankDists, totalGeomLen, totalBlankLen } = path;
	const geomPoints  = Math.floor(nPoints * VISIBLE_FRACTION);
	const blankPoints = nPoints - geomPoints;

	for (let t = 0; t < traversal.length; t++) {
		const segIdx = traversal[t];
		const seg    = segments[segIdx];
		const rev    = reversed[t];
		const bDist  = blankDists[t];
		const sLen   = segArcLen(seg);
		const nPts   = seg.points.length;
		// Access points/colors in traversal direction without copying the array.
		const ptAt   = rev ? (i: number) => seg.points[nPts - 1 - i] : (i: number) => seg.points[i];
		const clrAt  = rev ? (i: number) => seg.colors[nPts - 1 - i] : (i: number) => seg.colors[i];

		// Points allocated proportional to arc length
		const segPts = totalGeomLen > 0
			? Math.max(2, Math.round(sLen / totalGeomLen * geomPoints))
			: Math.max(2, Math.floor(geomPoints / traversal.length));
		const blkPts = totalBlankLen > 0
			? Math.max(1, Math.round(bDist / totalBlankLen * blankPoints))
			: Math.max(1, Math.floor(blankPoints / traversal.length));

		// ── Blank travel ─────────────────────────────────────────────────────────
		const targetX = ptAt(0)[0];
		const targetY = ptAt(0)[1];
		for (let i = 0; i < blkPts; i++) {
			const f = blkPts > 1 ? i / (blkPts - 1) : 0;
			emit(lastX + (targetX - lastX) * f, lastY + (targetY - lastY) * f, -1, -1, -1, -1, 1);
		}
		lastX = targetX; lastY = targetY;

		const p0 = ptAt(0);
		const c0 = clrAt(0);

		// ── Visible segment (arc-length parameterised) ────────────────────────────
		// Reuse module-level _cumLen array to avoid per-segment allocation.
		_cumLen.length = 1; _cumLen[0] = 0;
		for (let i = 0; i < nPts - 1; i++) {
			const pa = ptAt(i); const pb = ptAt(i + 1);
			_cumLen.push(_cumLen[i] + dist(pa[0], pa[1], pb[0], pb[1]));
		}
		const totalLen = _cumLen[_cumLen.length - 1];

		for (let i = 0; i < segPts; i++) {
			const tArc = totalLen > 0 ? (i / Math.max(1, segPts - 1)) * totalLen : 0;

			let lo = 0, hi = _cumLen.length - 2;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (_cumLen[mid + 1] < tArc) lo = mid + 1; else hi = mid;
			}

			let px: number, py: number, pr: number, pg: number, pb: number, pz: number;

			if (totalLen === 0) {
				px = p0[0]; py = p0[1];
				pr = c0[0]; pg = c0[1]; pb = c0[2]; pz = p0[2];
			} else {
				const span = _cumLen[lo + 1] - _cumLen[lo];
				const frac = span > 0 ? (tArc - _cumLen[lo]) / span : 0;
				const pa   = ptAt(lo); const pb2 = ptAt(lo + 1);
				const ca   = clrAt(lo); const cb2 = clrAt(lo + 1);
				px = pa[0] + (pb2[0] - pa[0]) * frac;
				py = pa[1] + (pb2[1] - pa[1]) * frac;
				pr = ca[0] + (cb2[0] - ca[0]) * frac;
				pg = ca[1] + (cb2[1] - ca[1]) * frac;
				pb = ca[2] + (cb2[2] - ca[2]) * frac;
				pz = pa[2] + (pb2[2] - pa[2]) * frac;
			}

			emit(px, py, 2 * pr - 1, 2 * pg - 1, 2 * pb - 1, 2 * pz - 1, 0);
			endX = px; endY = py;
		}

		lastX = ptAt(nPts - 1)[0];
		lastY = ptAt(nPts - 1)[1];
	}

	// Pad remainder at last position as blank
	while (wp < nPoints) emit(lastX, lastY, -1, -1, -1, -1, 1);

	return { data, nPoints, endPos: { x: endX, y: endY } };
}
