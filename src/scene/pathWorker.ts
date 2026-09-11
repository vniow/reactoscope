/**
 * Web Worker for the scene-to-audio path pipeline.
 *
 * Receives packed segment geometry from the main thread, runs orderSegments
 * and buildCoordBuffer, then posts the resulting coordinate buffer back to
 * the main thread as a transferable ArrayBuffer. The main thread forwards it
 * directly to the AudioWorklet via workletNode.port.postMessage.
 *
 * The worklet cycles through the coordinate buffer at a configurable scan
 * frequency, generating audio in real-time with no ring buffer latency.
 *
 * Protocol:
 *   Geometry (sent each frame):
 *     { type: 'geometry', segmentData: ArrayBuffer, prevEnd: {x,y} }
 *     → Processes geometry, replies with:
 *     { type: 'path', data: ArrayBuffer, nPoints: number, endPos: {x,y},
 *       computeMs: number, nSeg: number }
 *
 * Segment wire format (Float32, 12 values per segment — 2 vertices):
 *   [x0, y0, intensity0, r0, g0, b0,  x1, y1, intensity1, r1, g1, b1]
 *
 * Coord buffer layout (Float32, COORD_STRIDE=6 values per point):
 *   [x, y, r, g, b, z]  — z: analog intensity/blanking, -1=blanked, +1=full
 */

import { orderSegments, buildCoordBuffer } from './pathBuilder';
import { buildGraphCoordBuffer, type GraphPathConfig } from './graphPath';
import type { Segment } from './pathBuilder';

const FLOATS_PER_VERTEX  = 6;   // x, y, intensity, r, g, b
const VERTICES_PER_SEG   = 2;
const FLOATS_PER_SEGMENT = FLOATS_PER_VERTEX * VERTICES_PER_SEG;

// Coord buffer resolution — adjustable at runtime via 'setCoordBufferSize' message.
let _coordBufferSize = 1024;

// Corner-safety (ADR-0011): off by default, matching the fixed-size behaviour
// above exactly until toggled on. See docs/galvo-corner-safety.md.
let _cornerSafety: { enabled: boolean; config: GraphPathConfig; maxPoints: number } = {
	enabled: false,
	config: { distancePerPoint: 5, radiansPerPoint: 0.6, blankDelayPoints: 10, blankFloor: -0.9 },
	maxPoints: 4096,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).onmessage = (event: MessageEvent) => {
	const msg = event.data as
		| { type: 'geometry'; segmentData: ArrayBuffer; prevEnd: { x: number; y: number } }
		| { type: 'setCoordBufferSize'; size: number }
		| { type: 'setCornerSafety'; enabled: boolean; config: GraphPathConfig; maxPoints: number };

	if (msg.type === 'setCoordBufferSize') {
		_coordBufferSize = msg.size;
		return;
	}
	if (msg.type === 'setCornerSafety') {
		_cornerSafety = { enabled: msg.enabled, config: msg.config, maxPoints: msg.maxPoints };
		return;
	}
	if (msg.type !== 'geometry') return;

	const { segmentData, prevEnd } = msg;
	const raw  = new Float32Array(segmentData);
	const nSeg = raw.length / FLOATS_PER_SEGMENT;

	const segments: Segment[] = [];
	for (let s = 0; s < nSeg; s++) {
		const o = s * FLOATS_PER_SEGMENT;
		segments.push({
			points: [
				[raw[o],     raw[o + 1], raw[o + 2]],
				[raw[o + 6], raw[o + 7], raw[o + 8]],
			],
			colors: [
				[raw[o + 3], raw[o + 4], raw[o + 5]],
				[raw[o + 9], raw[o + 10], raw[o + 11]],
			],
		});
	}

	const t0 = performance.now();
	const result = _cornerSafety.enabled
		? buildGraphCoordBuffer(segments, prevEnd, _cornerSafety.config, _coordBufferSize, _cornerSafety.maxPoints)
		: { ...buildCoordBuffer(orderSegments(segments, prevEnd), _coordBufferSize, prevEnd), minPointsNeeded: 0, overflowed: false };
	const computeMs = performance.now() - t0;

	// Transfer coord buffer — zero-copy on this hop
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(self as any).postMessage(
		{
			type:      'path',
			data:      result.data.buffer,
			nPoints:   result.nPoints,
			endPos:    result.endPos,
			computeMs,
			nSeg,
			minPointsNeeded: result.minPointsNeeded,
			overflowed:      result.overflowed,
		},
		[result.data.buffer],
	);
};
