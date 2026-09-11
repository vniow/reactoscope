import { describe, expect, it } from 'vitest';
import { buildPointGraph } from './pointGraph';
import { buildEulerGraph } from './eulerGraph';
import { buildEulerCircuit } from './eulerCircuit';
import { interpolateEulerCircuit, type CornerSafetyConfig } from './cornerInterpolate';
import { COORD_STRIDE } from './pathBuilder';
import type { Segment } from './pathBuilder';

const CONFIG: CornerSafetyConfig = { distancePerPoint: 5, radiansPerPoint: 0.6, blankDelayPoints: 2 };

function seg(ax: number, ay: number, bx: number, by: number): Segment {
	return { points: [[ax, ay, 1], [bx, by, 1]], colors: [[1, 1, 1], [1, 1, 1]] };
}

function circuitFor(segments: Segment[]) {
	const pg = buildPointGraph(segments, -0.9);
	const eg = buildEulerGraph(pg, { x: 0, y: 0 });
	return { eg, circuit: buildEulerCircuit(eg) };
}

describe('interpolateEulerCircuit', () => {
	it('emits a well-formed buffer sized COORD_STRIDE * nPoints', () => {
		const { eg, circuit } = circuitFor([seg(-1, -1, -1, 1), seg(1, -1, 1, 1)]);
		const result = interpolateEulerCircuit(eg.points, circuit, CONFIG, 200, 2000);
		expect(result.data.length).toBe(result.nPoints * COORD_STRIDE);
		expect(result.nPoints).toBeGreaterThan(0);
		expect(result.overflowed).toBe(false);
	});

	it('keeps every value in [-1, 1]', () => {
		const { eg, circuit } = circuitFor([seg(-1, -1, -1, 1), seg(1, -1, 1, 1)]);
		const result = interpolateEulerCircuit(eg.points, circuit, CONFIG, 200, 2000);
		for (let i = 0; i < result.data.length; i++) {
			expect(result.data[i]).toBeGreaterThanOrEqual(-1.0001);
			expect(result.data[i]).toBeLessThanOrEqual(1.0001);
		}
	});

	it('never drops blank-transition points below their minimum, even under a tight cap', () => {
		const { eg, circuit } = circuitFor([seg(-1, -1, -1, 1), seg(1, -1, 1, 1)]);
		const tiny = interpolateEulerCircuit(eg.points, circuit, CONFIG, 20, 12);
		expect(tiny.overflowed).toBe(true);
		// Two blank transitions in this graph, each needs BLANK_MIN_POINTS(3) + blankDelayPoints(2) = 5.
		const blankEdgeCount = circuit.filter((s) => s.kind === 'blank').length;
		expect(tiny.nPoints).toBeGreaterThanOrEqual(blankEdgeCount * 5);
	});

	it('reports minPointsNeeded independent of the requested target', () => {
		const { eg, circuit } = circuitFor([seg(-1, -1, -1, 1), seg(1, -1, 1, 1)]);
		const a = interpolateEulerCircuit(eg.points, circuit, CONFIG, 50, 5000);
		const b = interpolateEulerCircuit(eg.points, circuit, CONFIG, 4000, 5000);
		expect(a.minPointsNeeded).toBe(b.minPointsNeeded);
		expect(b.nPoints).toBeGreaterThan(a.nPoints);
	});

	it('returns an empty result for an empty circuit', () => {
		const result = interpolateEulerCircuit([], [], CONFIG, 100, 1000);
		expect(result.nPoints).toBe(0);
		expect(result.data.length).toBe(0);
	});
});
