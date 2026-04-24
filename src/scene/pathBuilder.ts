/**
 * Scene-to-audio path builder.
 *
 * Three pipeline stages:
 *   1. collectSegments — traverse the Three.js scene, project geometry to NDC
 *   2. orderSegments   — nearest-neighbour ordering to minimise blank travel
 *   3. buildSamples    — arc-length parameterisation + blanking + Z→intensity
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
/** Maximum dwell samples emitted at a segment start after a direction change. */
const CORNER_DWELL_MAX  = 4;

// ─── Reusable scratch objects (avoids GC pressure in useFrame) ────────────────

const _vpMatrix = new THREE.Matrix4();
const _mvpCache = new WeakMap<THREE.Object3D, THREE.Matrix4>();
const _v4       = new THREE.Vector4();

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

	scene.traverse((obj) => {
		if (!obj.visible) return;

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
	});

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

// ─── Corner dwell helper ──────────────────────────────────────────────────────

/**
 * Number of duplicate samples to emit at a segment start.
 * Proportional to the direction-change angle so straight-through travel costs
 * 0 samples while a 180° reversal costs CORNER_DWELL_MAX.
 *
 * @param arrX/Y  Where the beam arrived from (before the blank hop or prior segment end)
 * @param pivX/Y  The pivot point — start of the new segment
 * @param depX/Y  The departure point — next vertex in the segment
 */
function cornerDwellCount(
	arrX: number, arrY: number,
	pivX: number, pivY: number,
	depX: number, depY: number,
): number {
	const inLen  = Math.hypot(pivX - arrX, pivY - arrY);
	const outLen = Math.hypot(depX - pivX, depY - pivY);
	if (inLen < 1e-6 || outLen < 1e-6) return CORNER_DWELL_MAX; // degenerate → max dwell
	const inX = (pivX - arrX) / inLen, inY = (pivY - arrY) / inLen;
	const outX = (depX - pivX) / outLen, outY = (depY - pivY) / outLen;
	const cosA = Math.max(-1, Math.min(1, inX * outX + inY * outY));
	// cosA = 1 → straight (0 dwell); cosA = -1 → 180° (max dwell)
	return Math.round(CORNER_DWELL_MAX * (1 - cosA) / 2);
}

// ─── Stage 3: buildSamples ────────────────────────────────────────────────────

/**
 * Convert an ordered path into 6-channel audio samples [x,y,r,g,b,z] × budget.
 * Each channel is stored in a separate Float32Array (non-interleaved for ring buffer).
 * Color and intensity are interpolated per-sample from per-vertex data.
 *
 * Pass pre-allocated `out` buffers (each of length >= budget) to avoid per-frame
 * GC pressure — the caller is responsible for keeping them sized correctly.
 */
export function buildSamples(
	path:       OrderedPath,
	budget:     number,
	_prevEnd:   { x: number; y: number },
	out?:       Float32Array[],
): { data: Float32Array[]; endPos: { x: number; y: number } } {
	const data: Float32Array[] = out ?? Array.from({ length: 6 }, () => new Float32Array(budget));
	if (out) { for (const ch of out) ch.fill(0); }
	let wp    = 0;                 // write pointer
	let lastX = _prevEnd.x;
	let lastY = _prevEnd.y;
	let endX  = lastX;
	let endY  = lastY;

	if (path.traversal.length === 0) {
		for (let i = 0; i < budget; i++) emit(lastX, lastY, -1, -1, -1, -1);
		return { data, endPos: _prevEnd };
	}

	const { segments, traversal, reversed, blankDists, totalGeomLen, totalBlankLen } = path;
	const geomBudget  = Math.floor(budget * VISIBLE_FRACTION);
	const blankBudget = budget - geomBudget;

	function emit(x: number, y: number, r: number, g: number, b: number, a: number): void {
		if (wp >= budget) return;
		data[0][wp] = x; data[1][wp] = y;
		data[2][wp] = r; data[3][wp] = g;
		data[4][wp] = b; data[5][wp] = a;
		wp++;
	}

	for (let t = 0; t < traversal.length; t++) {
		const segIdx  = traversal[t];
		const seg     = segments[segIdx];
		const rev     = reversed[t];
		const bDist   = blankDists[t];
		const sLen    = segArcLen(seg);
		// Respect traversal direction for both position and per-vertex attributes.
		const pts  = rev ? [...seg.points].reverse() : seg.points;
		const clrs = rev ? [...seg.colors].reverse() : seg.colors;

		// Sample allocation proportional to arc length
		const segSamples = totalGeomLen > 0
			? Math.max(2, Math.round(sLen / totalGeomLen * geomBudget))
			: Math.max(2, Math.floor(geomBudget / traversal.length));
		const blkSamples = totalBlankLen > 0
			? Math.max(1, Math.round(bDist / totalBlankLen * blankBudget))
			: Math.max(1, Math.floor(blankBudget / traversal.length));

		// ── Blank travel ────────────────────────────────────────────
		// Emit -1 for R/G/B/Z so the visualizer maps them to 0 (invisible).
		// XY still moves linearly to avoid beam discontinuity.
		const arrX    = lastX, arrY = lastY; // capture pre-blank arrival position for dwell
		const targetX = pts[0][0];
		const targetY = pts[0][1];
		for (let i = 0; i < blkSamples; i++) {
			const f = blkSamples > 1 ? i / (blkSamples - 1) : 0;
			emit(lastX + (targetX - lastX) * f, lastY + (targetY - lastY) * f, -1, -1, -1, -1);
		}
		lastX = targetX; lastY = targetY;

		// ── Corner dwell ─────────────────────────────────────────────
		// Duplicate samples at the segment start so galvo mirrors can settle.
		// Count is proportional to direction change — 0 for straight travel, max for 180°.
		const depX  = pts.length > 1 ? pts[1][0] : pts[0][0];
		const depY  = pts.length > 1 ? pts[1][1] : pts[0][1];
		const dwell = cornerDwellCount(arrX, arrY, pts[0][0], pts[0][1], depX, depY);
		for (let d = 0; d < dwell; d++) {
			emit(pts[0][0], pts[0][1], 2 * clrs[0][0] - 1, 2 * clrs[0][1] - 1, 2 * clrs[0][2] - 1, 2 * pts[0][2] - 1);
		}

		// ── Visible segment (arc-length parameterised) ───────────────
		// Build cumulative arc-length table
		const cumLen: number[] = [0];
		for (let i = 0; i < pts.length - 1; i++) {
			cumLen.push(cumLen[i] + dist(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
		}
		const totalLen = cumLen[cumLen.length - 1];

		for (let i = 0; i < segSamples; i++) {
			const tArc = totalLen > 0 ? (i / Math.max(1, segSamples - 1)) * totalLen : 0;

			// Binary-search into cumLen for the spanning sub-segment
			let lo = 0, hi = cumLen.length - 2;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (cumLen[mid + 1] < tArc) lo = mid + 1; else hi = mid;
			}

			let px: number, py: number;
			let pr: number, pg: number, pb: number, pz: number;

			if (totalLen === 0) {
				// Zero-length segment (dwell point) — use first vertex values.
				px = pts[0][0];   py = pts[0][1];
				pr = clrs[0][0];  pg = clrs[0][1];  pb = clrs[0][2];
				pz = pts[0][2];
			} else {
				const span = cumLen[lo + 1] - cumLen[lo];
				const frac = span > 0 ? (tArc - cumLen[lo]) / span : 0;
				px = pts[lo][0] + (pts[lo + 1][0] - pts[lo][0]) * frac;
				py = pts[lo][1] + (pts[lo + 1][1] - pts[lo][1]) * frac;
				// Interpolate per-vertex color and intensity along the sub-segment.
				pr = clrs[lo][0] + (clrs[lo + 1][0] - clrs[lo][0]) * frac;
				pg = clrs[lo][1] + (clrs[lo + 1][1] - clrs[lo][1]) * frac;
				pb = clrs[lo][2] + (clrs[lo + 1][2] - clrs[lo][2]) * frac;
				pz = pts[lo][2]  + (pts[lo + 1][2]  - pts[lo][2])  * frac;
			}

			// Remap [0, 1] → [−1, +1] for audio range.
			// Blank travel emits −1 (invisible). Visible samples emit remapped values.
			emit(px, py, 2 * pr - 1, 2 * pg - 1, 2 * pb - 1, 2 * pz - 1);
			endX = px; endY = py;
		}

		lastX = pts[pts.length - 1][0];
		lastY = pts[pts.length - 1][1];
	}

	// Pad any remaining budget at last position with blank
	while (wp < budget) emit(lastX, lastY, -1, -1, -1, -1);

	return { data, endPos: { x: endX, y: endY } };
}

// ─── Stage 3b: buildCoordBuffer ───────────────────────────────────────────────

/**
 * Interleaved layout per point (COORD_STRIDE floats):
 *   [x, y, r, g, b, a, blank]
 * blank: 0.0 = visible, 1.0 = blanked beam travel
 * r/g/b/a are in [-1, +1] audio range (same convention as buildSamples).
 * x/y are NDC in [-1, +1].
 */
export const COORD_STRIDE = 7;

/**
 * Convert an ordered path into a fixed-resolution coordinate buffer for
 * real-time cycling in the AudioWorklet.
 *
 * Unlike buildSamples (which generates time-domain samples sized to a frame
 * budget), this function resamples the path to exactly `nPoints` evenly-spaced
 * geometric points. The worklet cycles through them at a configurable scan
 * frequency, completely decoupling draw rate from geometry density.
 *
 * Blanking is encoded as a per-point flag rather than a dedicated sample range,
 * so the worklet can output silent color channels while still moving the beam.
 * Corner dwell is encoded as repeated identical points.
 */
export function buildCoordBuffer(
	path:    OrderedPath,
	nPoints: number,
	prevEnd: { x: number; y: number },
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
		const pts    = rev ? [...seg.points].reverse() : seg.points;
		const clrs   = rev ? [...seg.colors].reverse() : seg.colors;

		// Points allocated proportional to arc length
		const segPts = totalGeomLen > 0
			? Math.max(2, Math.round(sLen / totalGeomLen * geomPoints))
			: Math.max(2, Math.floor(geomPoints / traversal.length));
		const blkPts = totalBlankLen > 0
			? Math.max(1, Math.round(bDist / totalBlankLen * blankPoints))
			: Math.max(1, Math.floor(blankPoints / traversal.length));

		// ── Blank travel ─────────────────────────────────────────────────────────
		const arrX    = lastX, arrY = lastY;
		const targetX = pts[0][0];
		const targetY = pts[0][1];
		for (let i = 0; i < blkPts; i++) {
			const f = blkPts > 1 ? i / (blkPts - 1) : 0;
			emit(lastX + (targetX - lastX) * f, lastY + (targetY - lastY) * f, -1, -1, -1, -1, 1);
		}
		lastX = targetX; lastY = targetY;

		// ── Corner dwell ──────────────────────────────────────────────────────────
		const depX = pts.length > 1 ? pts[1][0] : pts[0][0];
		const depY = pts.length > 1 ? pts[1][1] : pts[0][1];
		const dwell = cornerDwellCount(arrX, arrY, pts[0][0], pts[0][1], depX, depY);
		for (let d = 0; d < dwell; d++) {
			emit(pts[0][0], pts[0][1],
				2 * clrs[0][0] - 1, 2 * clrs[0][1] - 1, 2 * clrs[0][2] - 1, 2 * pts[0][2] - 1, 0);
		}

		// ── Visible segment (arc-length parameterised) ────────────────────────────
		const cumLen: number[] = [0];
		for (let i = 0; i < pts.length - 1; i++) {
			cumLen.push(cumLen[i] + dist(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
		}
		const totalLen = cumLen[cumLen.length - 1];

		for (let i = 0; i < segPts; i++) {
			const tArc = totalLen > 0 ? (i / Math.max(1, segPts - 1)) * totalLen : 0;

			let lo = 0, hi = cumLen.length - 2;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (cumLen[mid + 1] < tArc) lo = mid + 1; else hi = mid;
			}

			let px: number, py: number, pr: number, pg: number, pb: number, pz: number;

			if (totalLen === 0) {
				px = pts[0][0]; py = pts[0][1];
				pr = clrs[0][0]; pg = clrs[0][1]; pb = clrs[0][2]; pz = pts[0][2];
			} else {
				const span = cumLen[lo + 1] - cumLen[lo];
				const frac = span > 0 ? (tArc - cumLen[lo]) / span : 0;
				px = pts[lo][0] + (pts[lo + 1][0] - pts[lo][0]) * frac;
				py = pts[lo][1] + (pts[lo + 1][1] - pts[lo][1]) * frac;
				pr = clrs[lo][0] + (clrs[lo + 1][0] - clrs[lo][0]) * frac;
				pg = clrs[lo][1] + (clrs[lo + 1][1] - clrs[lo][1]) * frac;
				pb = clrs[lo][2] + (clrs[lo + 1][2] - clrs[lo][2]) * frac;
				pz = pts[lo][2]  + (pts[lo + 1][2]  - pts[lo][2])  * frac;
			}

			emit(px, py, 2 * pr - 1, 2 * pg - 1, 2 * pb - 1, 2 * pz - 1, 0);
			endX = px; endY = py;
		}

		lastX = pts[pts.length - 1][0];
		lastY = pts[pts.length - 1][1];
	}

	// Pad remainder at last position as blank
	while (wp < nPoints) emit(lastX, lastY, -1, -1, -1, -1, 1);

	return { data, nPoints, endPos: { x: endX, y: endY } };
}
