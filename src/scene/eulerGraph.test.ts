import { describe, expect, it } from 'vitest';
import { buildPointGraph } from './pointGraph';
import { buildEulerGraph } from './eulerGraph';
import type { Segment } from './pathBuilder';

function seg(ax: number, ay: number, bx: number, by: number): Segment {
	return { points: [[ax, ay, 1], [bx, by, 1]], colors: [[1, 1, 1], [1, 1, 1]] };
}

function degreeOf(edges: { a: number; b: number }[], n: number): number {
	return edges.reduce((d, e) => d + (e.a === n ? 1 : 0) + (e.b === n ? 1 : 0), 0);
}

function isConnected(nNodes: number, edges: { a: number; b: number }[]): boolean {
	if (nNodes === 0) return true;
	const adj: number[][] = Array.from({ length: nNodes }, () => []);
	for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
	const seen = new Set([0]);
	const stack = [0];
	while (stack.length) {
		const n = stack.pop()!;
		for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); stack.push(m); }
	}
	return seen.size === nNodes;
}

describe('buildEulerGraph', () => {
	it('adds no blanks to an already-closed loop — ported from lasy test_point_graph_to_euler_graph_no_blanks', () => {
		const segments = [seg(-1, -1, -1, 1), seg(-1, 1, 1, 1), seg(1, 1, 1, -1), seg(1, -1, -1, -1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		expect(eg.edges.filter((e) => e.kind === 'blank')).toHaveLength(0);
		expect(eg.edges.filter((e) => e.kind === 'lit')).toHaveLength(4);
	});

	it('adds exactly 2 blanks to connect two disjoint segments — ported from lasy test_point_graph_to_euler_graph_with_blanks', () => {
		const segments = [seg(-1, -1, -1, 1), seg(1, -1, 1, 1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		expect(eg.edges.filter((e) => e.kind === 'blank')).toHaveLength(2);
		expect(eg.edges.filter((e) => e.kind === 'lit')).toHaveLength(2);
		for (let n = 0; n < eg.points.length; n++) expect(degreeOf(eg.edges, n) % 2).toBe(0);
		expect(isConnected(eg.points.length, eg.edges)).toBe(true);
	});

	it('chains three disjoint segments into one connected Eulerian graph', () => {
		const segments = [seg(-1, -1, -1, 1), seg(0, -1, 0, 1), seg(1, -1, 1, 1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: -1, y: -1 });
		expect(eg.edges.filter((e) => e.kind === 'blank')).toHaveLength(3);
		for (let n = 0; n < eg.points.length; n++) expect(degreeOf(eg.edges, n) % 2).toBe(0);
		expect(isConnected(eg.points.length, eg.edges)).toBe(true);
	});

	it('pairs a branching (4-odd-node) component internally without needing a connector', () => {
		// A plus sign: 4 arms meeting at the origin. Center has degree 4 (even);
		// the 4 leaf tips are odd (degree 1) — a single component, no other
		// components to chain to, so all pairs must resolve as internal blanks.
		const segments = [
			seg(0, 0, 1, 0), seg(0, 0, -1, 0), seg(0, 0, 0, 1), seg(0, 0, 0, -1),
		];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		expect(eg.edges.filter((e) => e.kind === 'blank')).toHaveLength(2);
		for (let n = 0; n < eg.points.length; n++) expect(degreeOf(eg.edges, n) % 2).toBe(0);
		expect(isConnected(eg.points.length, eg.edges)).toBe(true);
	});

	it('gives an isolated dwell point a self-connector when other components exist', () => {
		const segments: Segment[] = [
			seg(-1, -1, -1, 1),
			{ points: [[5, 5, 1], [5, 5, 1]], colors: [[1, 1, 1], [1, 1, 1]] }, // lone dwell point, far away
		];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		const dwellNode = pg.points.findIndex((p) => p.x === 5 && p.y === 5);
		expect(degreeOf(eg.edges, dwellNode) % 2).toBe(0);
		expect(degreeOf(eg.edges, dwellNode)).toBeGreaterThan(0);
		expect(isConnected(eg.points.length, eg.edges)).toBe(true);
	});
});
