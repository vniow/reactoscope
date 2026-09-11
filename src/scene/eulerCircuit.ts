/**
 * Euler-circuit traversal — stage 4 of the graph-based path-ordering pipeline
 * (see docs/adr/0011-galvo-corner-safety.md).
 *
 * Hierholzer's algorithm, ported from lasy's `euler_graph_to_euler_circuit` /
 * `traverse_unvisited` (nannou-org/lasy, src/lib.rs:671-796): at each vertex,
 * among untraversed edges, always continue with whichever is closest to a
 * straight line from the edge just walked.
 */

import type { EulerEdge, EulerGraph } from './eulerGraph';
import type { GraphPoint } from './pointGraph';

export type CircuitStep = { edgeIndex: number; from: number; to: number; kind: 'lit' | 'blank' };

function otherEnd(edge: EulerEdge, from: number): number {
	return from === edge.a ? edge.b : edge.a;
}

function straightAngleVariance(
	a: { x: number; y: number },
	b: { x: number; y: number },
	c: { x: number; y: number },
): number {
	const ux = b.x - a.x, uy = b.y - a.y;
	const vx = c.x - b.x, vy = c.y - b.y;
	const diff = Math.abs(Math.atan2(vy, vx) - Math.atan2(uy, ux));
	return diff > Math.PI ? Math.PI * 2 - diff : diff;
}

function traverseUnvisited(
	points: GraphPoint[],
	start: number,
	edges: EulerEdge[],
	adj: number[][],
	visited: Set<number>,
): CircuitStep[] {
	let n = start;
	const traversal: CircuitStep[] = [];

	for (;;) {
		const candidates = adj[n].filter((ei) => !visited.has(ei));
		if (candidates.length === 0) {
			// Only reachable if the graph isn't actually Eulerian — a construction
			// bug upstream, not a runtime condition this function can recover from.
			throw new Error('eulerCircuit: expected an untraversed edge at a strongly connected node');
		}

		let chosen = candidates[0];
		if (traversal.length > 0) {
			const prevFrom = traversal[traversal.length - 1].from;
			const prevSourcePos = points[prevFrom];
			const sourcePos = points[n];
			let bestVariance = straightAngleVariance(prevSourcePos, sourcePos, points[otherEnd(edges[chosen], n)]);
			for (const ei of candidates.slice(1)) {
				const v = straightAngleVariance(prevSourcePos, sourcePos, points[otherEnd(edges[ei], n)]);
				if (v < bestVariance) { bestVariance = v; chosen = ei; }
			}
		}

		const edge = edges[chosen];
		const to = otherEnd(edge, n);
		visited.add(chosen);
		traversal.push({ edgeIndex: chosen, from: n, to, kind: edge.kind });
		n = to;
		if (n === start) return traversal;
	}
}

/** Returns [] for an empty or edge-free graph — callers should fall back for that case. */
export function buildEulerCircuit(graph: EulerGraph): CircuitStep[] {
	const nNodes = graph.points.length;
	if (nNodes < 2 || graph.edges.length === 0) return [];

	const adj: number[][] = Array.from({ length: nNodes }, () => []);
	graph.edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });

	const visited = new Set<number>();
	let visitOrder: CircuitStep[] = [];
	const startNode = 0;

	for (;;) {
		let mergeIx: number, n: number;
		if (visitOrder.length === 0) {
			mergeIx = 0; n = startNode;
		} else {
			let found = -1, foundNode = -1;
			for (let i = 0; i < visitOrder.length; i++) {
				const candidateNode = visitOrder[i].from;
				if (adj[candidateNode].some((ei) => !visited.has(ei))) { found = i; foundNode = candidateNode; break; }
			}
			if (found === -1) break;
			mergeIx = found; n = foundNode;
		}

		const traversal = traverseUnvisited(graph.points, n, graph.edges, adj, visited);
		visitOrder = [...visitOrder.slice(0, mergeIx), ...traversal, ...visitOrder.slice(mergeIx)];
	}

	return visitOrder;
}
