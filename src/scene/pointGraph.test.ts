import { describe, expect, it } from 'vitest';
import { buildPointGraph } from './pointGraph';
import type { Segment } from './pathBuilder';

function seg(ax: number, ay: number, ai: number, bx: number, by: number, bi: number): Segment {
	return {
		points: [[ax, ay, ai], [bx, by, bi]],
		colors: [[1, 1, 1], [1, 1, 1]],
	};
}

describe('buildPointGraph', () => {
	it('dedupes a shared endpoint into one node — ported from lasy square_pts', () => {
		// a-b, b-c, c-d, d-a: a closed loop of 4 unique nodes.
		const segments = [
			seg(-1, -1, 1, -1, 1, 1),
			seg(-1, 1, 1, 1, 1, 1),
			seg(1, 1, 1, 1, -1, 1),
			seg(1, -1, 1, -1, -1, 1),
		];
		const g = buildPointGraph(segments, -0.9);
		expect(g.points).toHaveLength(4);
		expect(g.edges).toHaveLength(4);
	});

	it('skips a segment whose endpoints are both at or below blankFloor', () => {
		// intensity 0 -> z = -1, at the floor.
		const segments = [seg(-1, -1, 0, 1, 1, 0)];
		const g = buildPointGraph(segments, -0.9);
		expect(g.points).toHaveLength(0);
		expect(g.edges).toHaveLength(0);
	});

	it('keeps a segment lit at even one endpoint', () => {
		const segments = [seg(-1, -1, 0, 1, 1, 1)];
		const g = buildPointGraph(segments, -0.9);
		expect(g.edges).toHaveLength(1);
	});

	it('dedupes overlapping/duplicate geometry to a single edge', () => {
		const segments = [seg(0, 0, 1, 1, 1, 1), seg(0, 0, 1, 1, 1, 1)];
		const g = buildPointGraph(segments, -0.9);
		expect(g.points).toHaveLength(2);
		expect(g.edges).toHaveLength(1);
	});

	it('registers a zero-length (dwell point) segment as an isolated node with no edge', () => {
		const segments = [seg(0.5, 0.5, 1, 0.5, 0.5, 1)];
		const g = buildPointGraph(segments, -0.9);
		expect(g.points).toHaveLength(1);
		expect(g.edges).toHaveLength(0);
	});

	it('merges a dwell point that coincides with real lit geometry into that node, not a separate isolated one', () => {
		const segments = [seg(0, 0, 1, 1, 1, 1), seg(1, 1, 1, 1, 1, 1)];
		const g = buildPointGraph(segments, -0.9);
		expect(g.points).toHaveLength(2); // not 3
		expect(g.edges).toHaveLength(1);
	});
});
