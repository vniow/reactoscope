import { describe, expect, it } from 'vitest';
import { buildPointGraph } from './pointGraph';
import { buildEulerGraph } from './eulerGraph';
import { buildEulerCircuit } from './eulerCircuit';
import type { Segment } from './pathBuilder';

function seg(ax: number, ay: number, bx: number, by: number): Segment {
	return { points: [[ax, ay, 1], [bx, by, 1]], colors: [[1, 1, 1], [1, 1, 1]] };
}

describe('buildEulerCircuit', () => {
	it('traverses a closed loop\'s 4 edges exactly once and returns to the start — ported from lasy test_euler_graph_to_euler_circuit_no_blanks', () => {
		const segments = [seg(-1, -1, -1, 1), seg(-1, 1, 1, 1), seg(1, 1, 1, -1), seg(1, -1, -1, -1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		const circuit = buildEulerCircuit(eg);

		expect(circuit).toHaveLength(eg.edges.length);
		const visitedEdges = new Set(circuit.map((s) => s.edgeIndex));
		expect(visitedEdges.size).toBe(eg.edges.length);
		expect(circuit[circuit.length - 1].to).toBe(circuit[0].from);
	});

	it('traverses every lit and blank edge exactly once for two chained segments — ported from lasy test_euler_graph_to_euler_circuit_with_blanks', () => {
		const segments = [seg(-1, -1, -1, 1), seg(1, -1, 1, 1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		const circuit = buildEulerCircuit(eg);

		expect(circuit).toHaveLength(eg.edges.length);
		const visitedEdges = new Set(circuit.map((s) => s.edgeIndex));
		expect(visitedEdges.size).toBe(eg.edges.length);
		// A true circuit: each step's `to` is the next step's `from`, and it closes.
		for (let i = 0; i < circuit.length; i++) {
			const next = circuit[(i + 1) % circuit.length];
			expect(circuit[i].to).toBe(next.from);
		}
	});

	it('returns an empty circuit for a graph with fewer than two nodes', () => {
		const pg = buildPointGraph([], -0.9);
		const eg = buildEulerGraph(pg, { x: 0, y: 0 });
		expect(buildEulerCircuit(eg)).toEqual([]);
	});

	it('prefers the straightest continuation at a branch point', () => {
		// A horizontal line through the origin plus a perpendicular tick at the
		// origin: at the origin, continuing straight along the horizontal should
		// be chosen over turning onto the vertical tick.
		const segments = [seg(-1, 0, 0, 0), seg(0, 0, 1, 0), seg(0, 0, 0, 1)];
		const pg = buildPointGraph(segments, -0.9);
		const eg = buildEulerGraph(pg, { x: -1, y: 0 });
		const circuit = buildEulerCircuit(eg);

		const originIdx = pg.points.findIndex((p) => p.x === 0 && p.y === 0);
		const rightIdx  = pg.points.findIndex((p) => p.x === 1 && p.y === 0);
		const stepIntoOrigin = circuit.find((s) => s.to === originIdx && s.from !== originIdx);
		expect(stepIntoOrigin).toBeDefined();
		const idx = circuit.indexOf(stepIntoOrigin!);
		// Immediately after arriving from the left, the next hop should continue
		// straight to the right tip, not divert onto the vertical tick.
		expect(circuit[idx + 1]?.to).toBe(rightIdx);
	});
});
