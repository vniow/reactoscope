import { describe, expect, it } from 'vitest';
import { buildGraphCoordBuffer, type GraphPathConfig } from './graphPath';
import { COORD_STRIDE } from './pathBuilder';
import type { Segment } from './pathBuilder';

const CONFIG: GraphPathConfig = {
	distancePerPoint: 5, radiansPerPoint: 0.6, blankDelayPoints: 2, blankFloor: -0.9,
};

function seg(ax: number, ay: number, bx: number, by: number): Segment {
	return { points: [[ax, ay, 1], [bx, by, 1]], colors: [[1, 1, 1], [1, 1, 1]] };
}

describe('buildGraphCoordBuffer', () => {
	it('falls back to the greedy pipeline for an empty scene, holding position blanked', () => {
		const result = buildGraphCoordBuffer([], { x: 0.2, y: 0.3 }, CONFIG, 64, 1000);
		expect(result.nPoints).toBeGreaterThan(0);
		for (let i = 0; i < result.nPoints; i++) {
			expect(result.data[i * COORD_STRIDE + 5]).toBe(-1); // z: blanked throughout
		}
	});

	it('falls back to the greedy pipeline for an isolated-points-only scene', () => {
		const dwell: Segment = { points: [[0.1, 0.1, 1], [0.1, 0.1, 1]], colors: [[1, 1, 1], [1, 1, 1]] };
		const result = buildGraphCoordBuffer([dwell], { x: 0, y: 0 }, CONFIG, 64, 1000);
		expect(result.nPoints).toBeGreaterThan(0);
	});

	it('produces a buffer for real geometry with a sensible endPos', () => {
		const segments = [seg(-1, -1, -1, 1), seg(1, -1, 1, 1)];
		const result = buildGraphCoordBuffer(segments, { x: 0, y: 0 }, CONFIG, 256, 2000);
		expect(result.nPoints).toBeGreaterThan(0);
		expect(result.data.length).toBe(result.nPoints * COORD_STRIDE);
		expect(Number.isFinite(result.endPos.x)).toBe(true);
		expect(Number.isFinite(result.endPos.y)).toBe(true);
	});

	it('grows past the target when corner-dwell needs more room, up to maxPoints', () => {
		// Many sharp corners packed into a small target should push nPoints
		// above `targetPoints` — the whole point of decision 3.
		const zigzag: Segment[] = [];
		for (let i = 0; i < 20; i++) {
			zigzag.push(seg(i % 2 === 0 ? -0.5 : 0.5, i * 0.05, i % 2 === 0 ? 0.5 : -0.5, i * 0.05 + 0.05));
		}
		const tinyTarget = buildGraphCoordBuffer(zigzag, { x: 0, y: 0 }, CONFIG, 10, 5000);
		expect(tinyTarget.nPoints).toBeGreaterThan(10);
	});
});
