/**
 * Orchestrator for the graph-based path-ordering pipeline (see
 * docs/adr/0011-galvo-corner-safety.md) — the toggleable replacement for
 * `orderSegments` + `buildCoordBuffer` when corner-safety is enabled.
 *
 * point graph → euler graph (distance-aware blank pairing) → euler circuit
 * (Hierholzer's, straightest-continuation tiebreak) → corner/blank-aware
 * interpolation into a variable-length COORD_STRIDE buffer.
 *
 * Inter-frame continuity (the beam's actual current position vs. wherever
 * this frame's buffer happens to start) is deliberately left to the
 * worklet's existing phase-matched buffer swap (`sceneInputProcessor.worklet.js`
 * — finds the nearest point in the new buffer to the current beam position
 * on every swap) rather than re-implemented here. That mechanism is
 * generic over *which* pipeline produced the buffer; duplicating
 * `buildCoordBuffer`'s own prevEnd-anchored lead-in on top of it would only
 * add a second, redundant continuity mechanism.
 */

import { buildPointGraph } from './pointGraph';
import { buildEulerGraph } from './eulerGraph';
import { buildEulerCircuit } from './eulerCircuit';
import { interpolateEulerCircuit, type CornerSafetyConfig } from './cornerInterpolate';
import { orderSegments, buildCoordBuffer } from './pathBuilder';
import type { Segment } from './pathBuilder';

export type { CornerSafetyConfig } from './cornerInterpolate';

export type GraphPathConfig = CornerSafetyConfig & { blankFloor: number };

export type GraphPathResult = {
	data: Float32Array;
	nPoints: number;
	endPos: { x: number; y: number };
	minPointsNeeded: number;
	overflowed: boolean;
};

/** Falls back to the existing greedy-nearest-neighbour pipeline for a fixed `nPoints`. */
function fallback(segments: Segment[], startPos: { x: number; y: number }, nPoints: number): GraphPathResult {
	const path = orderSegments(segments, startPos);
	const res  = buildCoordBuffer(path, Math.max(1, nPoints), startPos);
	return { ...res, minPointsNeeded: res.nPoints, overflowed: false };
}

export function buildGraphCoordBuffer(
	segments: Segment[],
	startPos: { x: number; y: number },
	config: GraphPathConfig,
	targetPoints: number,
	maxPoints: number,
): GraphPathResult {
	if (segments.length === 0) return fallback(segments, startPos, targetPoints);

	const pointGraph = buildPointGraph(segments, config.blankFloor);

	// No lit edges to optimise draw order for at all (e.g. an isolated
	// Points-only scene) — the existing pipeline already handles "visit N
	// disconnected points" correctly; there's nothing for Hierholzer's
	// algorithm to do with zero edges.
	if (pointGraph.edges.length === 0) return fallback(segments, startPos, targetPoints);

	const eulerGraph = buildEulerGraph(pointGraph, startPos);
	const circuit = buildEulerCircuit(eulerGraph);
	if (circuit.length === 0) return fallback(segments, startPos, targetPoints);

	const result = interpolateEulerCircuit(eulerGraph.points, circuit, config, targetPoints, maxPoints);
	if (result.nPoints === 0) return fallback(segments, startPos, targetPoints);

	const lastNode = eulerGraph.points[circuit[circuit.length - 1].to];
	return {
		data: result.data,
		nPoints: result.nPoints,
		endPos: { x: lastNode.x, y: lastNode.y },
		minPointsNeeded: result.minPointsNeeded,
		overflowed: result.overflowed,
	};
}
