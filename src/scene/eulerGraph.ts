/**
 * Euler-graph construction — stage 3 of the graph-based path-ordering pipeline
 * (see docs/adr/0011-galvo-corner-safety.md, decision 4).
 *
 * Adds the minimum number of blank edges needed to make `PointGraph` a single
 * connected Eulerian graph (every node even degree, one component), the same
 * goal as lasy's `point_graph_to_euler_graph` — but where lasy pairs
 * odd-degree nodes in whatever order the graph handed them (arbitrary, not
 * distance-optimal), this pairs them by greedy nearest-neighbour, both within
 * a component and when chaining separate components together. Two
 * independently-guaranteed-correct constructions, one of them shorter.
 */

import type { GraphPoint, PointGraph } from './pointGraph';

export type EulerEdge = { a: number; b: number; kind: 'lit' | 'blank' };
export type EulerGraph = { points: GraphPoint[]; edges: EulerEdge[] };

function dist2(a: GraphPoint | { x: number; y: number }, b: GraphPoint | { x: number; y: number }): number {
	const dx = a.x - b.x, dy = a.y - b.y;
	return dx * dx + dy * dy;
}

// ─── Union-find over all node indices (including isolated, edge-free nodes) ──

class UnionFind {
	private parent: number[];
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i);
	}
	find(x: number): number {
		while (this.parent[x] !== x) { this.parent[x] = this.parent[this.parent[x]]; x = this.parent[x]; }
		return x;
	}
	union(a: number, b: number): void {
		const ra = this.find(a), rb = this.find(b);
		if (ra !== rb) this.parent[ra] = rb;
	}
}

/** Greedy nearest-neighbour pairing of an even-length node list. Not optimal, just better than arbitrary. */
function greedyPairByDistance(nodes: number[], points: GraphPoint[]): [number, number][] {
	const remaining = new Set(nodes);
	const pairs: [number, number][] = [];
	while (remaining.size > 0) {
		const a = remaining.values().next().value as number;
		remaining.delete(a);
		let best = -1, bestD = Infinity;
		for (const cand of remaining) {
			const d = dist2(points[a], points[cand]);
			if (d < bestD) { bestD = d; best = cand; }
		}
		if (best === -1) break; // even-length invariant broken — defensive only
		remaining.delete(best);
		pairs.push([a, best]);
	}
	return pairs;
}

type Connector = { prev: number; next: number };

export function buildEulerGraph(graph: PointGraph, startPos: { x: number; y: number }): EulerGraph {
	const n = graph.points.length;
	const edges: EulerEdge[] = graph.edges.map(([a, b]) => ({ a, b, kind: 'lit' as const }));
	if (n === 0) return { points: graph.points, edges };

	const uf = new UnionFind(n);
	for (const [a, b] of graph.edges) uf.union(a, b);

	const degree = new Array<number>(n).fill(0);
	for (const [a, b] of graph.edges) { degree[a]++; degree[b]++; }

	const componentOf = new Array<number>(n);
	const rootToComponent = new Map<number, number>();
	for (let i = 0; i < n; i++) {
		const root = uf.find(i);
		let comp = rootToComponent.get(root);
		if (comp === undefined) { comp = rootToComponent.size; rootToComponent.set(root, comp); }
		componentOf[i] = comp;
	}
	const nComponents = rootToComponent.size;

	const nodesByComponent: number[][] = Array.from({ length: nComponents }, () => []);
	for (let i = 0; i < n; i++) nodesByComponent[componentOf[i]].push(i);

	const connectors: Connector[] = [];

	for (let c = 0; c < nComponents; c++) {
		const nodes = nodesByComponent[c];
		const oddNodes = nodes.filter((i) => degree[i] % 2 === 1);

		if (oddNodes.length === 0) {
			// Already Eulerian within this component (including a lone isolated point,
			// degree 0 — a THREE.Points dwell point with no coincident lit geometry).
			if (nComponents > 1) connectors.push({ prev: nodes[0], next: nodes[0] });
			continue;
		}

		const pairs = greedyPairByDistance(oddNodes, graph.points);

		if (nComponents === 1) {
			// Nothing else to connect to — every pair becomes a real blank edge.
			for (const [a, b] of pairs) edges.push({ a, b, kind: 'blank' });
			continue;
		}

		// Reserve one pair as this component's two connection ports; the rest
		// are resolved immediately as internal blanks.
		for (let i = 0; i < pairs.length - 1; i++) {
			edges.push({ a: pairs[i][0], b: pairs[i][1], kind: 'blank' });
		}
		const [prev, next] = pairs[pairs.length - 1];
		connectors.push({ prev, next });
	}

	if (connectors.length > 1) {
		edges.push(...chainConnectors(connectors, graph.points, startPos));
	}

	return { points: graph.points, edges };
}

/**
 * Greedy nearest-neighbour chain across component connectors, closed into a
 * cycle so every reserved port gets exactly one edge (flipping its parity to
 * even) — same shape as `orderSegments`' walk, just over "component with two
 * ports" instead of "segment with two endpoints."
 */
function chainConnectors(
	connectors: Connector[],
	points: GraphPoint[],
	startPos: { x: number; y: number },
): EulerEdge[] {
	const remaining = connectors.map((_, i) => i);
	const entryExit: { entry: number; exit: number }[] = [];
	let cur: { x: number; y: number } = startPos;

	while (remaining.length > 0) {
		let bestIdx = -1, bestPort: 'prev' | 'next' = 'prev', bestD = Infinity;
		for (const i of remaining) {
			const { prev, next } = connectors[i];
			const dp = dist2(cur, points[prev]);
			const dn = dist2(cur, points[next]);
			if (dp < bestD) { bestD = dp; bestIdx = i; bestPort = 'prev'; }
			if (dn < bestD) { bestD = dn; bestIdx = i; bestPort = 'next'; }
		}
		remaining.splice(remaining.indexOf(bestIdx), 1);
		const chosen = connectors[bestIdx];
		const entry = bestPort === 'prev' ? chosen.prev : chosen.next;
		const exit  = bestPort === 'prev' ? chosen.next : chosen.prev;
		entryExit.push({ entry, exit });
		cur = points[exit];
	}

	const edges: EulerEdge[] = [];
	for (let k = 0; k < entryExit.length; k++) {
		const a = entryExit[k].exit;
		const b = entryExit[(k + 1) % entryExit.length].entry;
		edges.push({ a, b, kind: 'blank' });
	}
	return edges;
}
