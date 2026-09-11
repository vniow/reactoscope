/**
 * Point graph construction — stage 2 of the graph-based path-ordering pipeline
 * (see docs/adr/0011-galvo-corner-safety.md).
 *
 * Ported from lasy's `segments_to_point_graph` (nannou-org/lasy, src/lib.rs)
 * and adapted to reactoscope's already-segmented input: `collectSegments`
 * never produces an authored "blank" point (see ADR-0009/ADR-0011 decision 6),
 * so every incoming Segment is lit unless both its endpoints are at or below
 * `blankFloor` — reusing GalvoContext's existing threshold rather than a
 * second one.
 */

import type { Segment } from './pathBuilder';

export type GraphPoint = {
	x: number; y: number; intensity: number;
	r: number; g: number; b: number;
};

export type PointGraph = {
	points: GraphPoint[];
	/** Deduplicated, undirected, self-loop-free edges — pairs of node indices into `points`. */
	edges: [number, number][];
};

/** z is the analog Z channel, derived the same way buildCoordBuffer derives it: 2*intensity-1. */
function toZ(intensity: number): number {
	return 2 * intensity - 1;
}

/** A segment is "effectively blank" when neither endpoint would register as lit output. */
function segmentIsBlank(seg: Segment, blankFloor: number): boolean {
	const [, , i0] = seg.points[0];
	const [, , i1] = seg.points[seg.points.length - 1];
	return toZ(i0) <= blankFloor && toZ(i1) <= blankFloor;
}

/** Quantized so near-identical floats from the same deterministic projection hash identically. */
function pointKey(x: number, y: number, r: number, g: number, b: number): string {
	const q = (v: number) => Math.round(v * 1e5);
	return `${q(x)},${q(y)},${q(r)},${q(g)},${q(b)}`;
}

/**
 * Build a deduplicated point graph from a frame's segments.
 *
 * Only the two endpoints of each segment participate in the graph — a
 * multi-point `Segment` (e.g. an unsplit polyline) contributes just its start
 * and end as nodes, edged directly; reactoscope's own `collectSegments`
 * always emits 2-point segments today, so this is not a current lossy case,
 * only a documented assumption.
 */
export function buildPointGraph(segments: Segment[], blankFloor: number): PointGraph {
	const points: GraphPoint[] = [];
	const keyToIndex = new Map<string, number>();
	const edgeKeys = new Set<string>();
	const edges: [number, number][] = [];

	function nodeFor(x: number, y: number, intensity: number, r: number, g: number, b: number): number {
		const key = pointKey(x, y, r, g, b);
		const existing = keyToIndex.get(key);
		if (existing !== undefined) return existing;
		const idx = points.length;
		points.push({ x, y, intensity, r, g, b });
		keyToIndex.set(key, idx);
		return idx;
	}

	for (const seg of segments) {
		if (segmentIsBlank(seg, blankFloor)) continue;

		const [ax, ay, ai] = seg.points[0];
		const [bx, by, bi] = seg.points[seg.points.length - 1];
		const [ar, ag, ab] = seg.colors[0];
		const [br, bg, bb] = seg.colors[seg.colors.length - 1];

		const na = nodeFor(ax, ay, ai, ar, ag, ab);
		const nb = nodeFor(bx, by, bi, br, bg, bb);

		// A zero-length segment (THREE.Points dwell point, or a degenerate line vertex) collapses
		// to one node with no edge — it still exists in `points[]` via nodeFor above, so it
		// surfaces as its own isolated (degree-0) component in eulerGraph.ts and gets visited via
		// a self-connecting blank, same outcome as lasy's lone-point case. If the same position is
		// also touched by real lit geometry, nodeFor already merged them into one node with
		// nonzero degree, so no redundant visit is added — dedup by position subsumes lasy's
		// "skip if adjacent to a lit edge" special case without needing point-stream adjacency.
		if (na === nb) continue;

		const ek = na < nb ? `${na}-${nb}` : `${nb}-${na}`;
		if (edgeKeys.has(ek)) continue; // duplicate/overlapping geometry — traced once, not twice
		edgeKeys.add(ek);
		edges.push([na, nb]);
	}

	return { points, edges };
}
