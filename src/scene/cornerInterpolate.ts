/**
 * Corner/blank interpolation — stage 5 of the graph-based path-ordering
 * pipeline (see docs/adr/0011-galvo-corner-safety.md).
 *
 * Ported from lasy's `EdgeProfile`/`interpolate_profiled_path`
 * (nannou-org/lasy, src/lib.rs:176-351, 961-1062), with per-point `Weight`
 * omitted — reactoscope has no "accent point" concept feeding this today
 * (see ADR-0011) — and with a graceful-degradation path lasy's own
 * `target_points`-as-floor design doesn't need: when the minimum points
 * corner-dwell and blank-transitions require exceeds `maxPoints`, lit-edge
 * budgets are scaled down proportionally rather than emitting past the cap.
 * Blank-transition points are never scaled down — see the "why" note below.
 */

import type { CircuitStep } from './eulerCircuit';
import type { GraphPoint } from './pointGraph';
import { COORD_STRIDE } from './pathBuilder';

export type CornerSafetyConfig = {
	/** Points per unit NDC distance floor for a lit edge (lasy: distance_per_point). */
	distancePerPoint: number;
	/** Radians of turn consumed per corner-dwell point (lasy: radians_per_point). Must be > 0. */
	radiansPerPoint: number;
	/** Extra points held at the end of every blank transition (lasy: blank_delay_points). */
	blankDelayPoints: number;
};

/** For a blank ab: [a (still lit), a.blanked(), b.blanked()] — see lasy's BLANK_MIN_POINTS. */
const BLANK_MIN_POINTS = 3;

type EdgeProfile =
	| { kind: 'blank' }
	| { kind: 'lit'; distance: number; endCorner: number };

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

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function profileCircuit(points: GraphPoint[], circuit: CircuitStep[]): EdgeProfile[] {
	return circuit.map((step, i) => {
		if (step.kind === 'blank') return { kind: 'blank' as const };
		const a = points[step.from], b = points[step.to];
		const next = circuit[(i + 1) % circuit.length];
		const c = points[next.to];
		return { kind: 'lit' as const, distance: dist(a, b), endCorner: straightAngleVariance(a, b, c) };
	});
}

function distanceMinPointCount(distance: number, distancePerPoint: number): number {
	return 1 + Math.floor(distance * distancePerPoint);
}

function cornerPointCount(endCorner: number, radiansPerPoint: number): number {
	return Math.floor(endCorner / Math.max(radiansPerPoint, 1e-6));
}

function minPointsFor(profile: EdgeProfile, config: CornerSafetyConfig): number {
	if (profile.kind === 'blank') return BLANK_MIN_POINTS + config.blankDelayPoints;
	return distanceMinPointCount(profile.distance, config.distancePerPoint)
		+ cornerPointCount(profile.endCorner, config.radiansPerPoint);
}

export type InterpolationResult = {
	data: Float32Array;
	nPoints: number;
	/** True minimum needed this frame before any budget scaling — for a future kpps readout. */
	minPointsNeeded: number;
	/** True when minPointsNeeded exceeded maxPoints and lit-edge fidelity was scaled down. */
	overflowed: boolean;
};

/**
 * Interpolates a full Euler circuit into a fixed COORD_STRIDE buffer.
 *
 * `targetPoints` is a density preference (today's `coordBufferSize`), not a
 * hard cap — the output grows past it when corner-dwell needs more room, up
 * to `maxPoints` (the kpps ceiling). Below that cap, excess points beyond the
 * true minimum are distributed across lit edges weighted by distance, same
 * as lasy. Above it, lit-edge budgets are scaled down proportionally; blank
 * transitions always keep their full minimum — a blank transition shorter
 * than its two-marker minimum isn't a smaller version of the same thing, it's
 * the leaking-diagonal artifact buildCoordBuffer's own two-marker trick
 * exists to prevent (see pathBuilder.ts:316-326) — so it is never the budget
 * lit-edge fidelity gets to spend.
 */
export function interpolateEulerCircuit(
	points: GraphPoint[],
	circuit: CircuitStep[],
	config: CornerSafetyConfig,
	targetPoints: number,
	maxPoints: number,
): InterpolationResult {
	if (circuit.length === 0) {
		return { data: new Float32Array(0), nPoints: 0, minPointsNeeded: 0, overflowed: false };
	}

	const profiles = profileCircuit(points, circuit);
	const minCounts = profiles.map((p) => minPointsFor(p, config));
	const minPointsNeeded = minCounts.reduce((a, b) => a + b, 0) + 1; // +1 for the final closing point

	const litIdx: number[] = [];
	let blankTotal = 0;
	profiles.forEach((p, i) => { if (p.kind === 'lit') litIdx.push(i); else blankTotal += minCounts[i]; });

	let allocations: number[];
	let overflowed = false;

	const budgetForLit = maxPoints - blankTotal - 1;
	const litMinTotal = litIdx.reduce((a, i) => a + minCounts[i], 0);

	if (litMinTotal <= 0 || budgetForLit >= litMinTotal) {
		// Room to spare (or nothing to distribute) — allocate minimums, then spread
		// any remaining room up to `targetPoints` across lit edges by distance.
		allocations = minCounts.slice();
		const roomForExcess = Math.max(0, Math.min(targetPoints, maxPoints) - minPointsNeeded);
		if (roomForExcess > 0 && litIdx.length > 0) {
			const totalLitDist = litIdx.reduce((a, i) => a + (profiles[i] as { distance: number }).distance, 0);
			let distributed = 0;
			for (const i of litIdx) {
				const p = profiles[i] as { distance: number };
				const share = totalLitDist > 0 ? p.distance / totalLitDist : 1 / litIdx.length;
				const extra = Math.floor(share * roomForExcess);
				allocations[i] += extra;
				distributed += extra;
			}
			// Rounding remainder goes to the first lit edge, same fixup lasy applies.
			if (distributed < roomForExcess) allocations[litIdx[0]] += roomForExcess - distributed;
		}
	} else {
		// Not enough room even for lit minimums — scale lit edges down, never blanks.
		overflowed = true;
		const scale = Math.max(0, budgetForLit) / litMinTotal;
		allocations = minCounts.slice();
		for (const i of litIdx) allocations[i] = Math.max(1, Math.floor(minCounts[i] * scale));
	}

	const total = allocations.reduce((a, b) => a + b, 0) + 1;
	const data = new Float32Array(total * COORD_STRIDE);
	let wp = 0;
	const emit = (x: number, y: number, r: number, g: number, b: number, z: number) => {
		const o = wp * COORD_STRIDE;
		data[o] = x; data[o + 1] = y; data[o + 2] = r; data[o + 3] = g; data[o + 4] = b; data[o + 5] = z;
		wp++;
	};

	for (let i = 0; i < circuit.length; i++) {
		const step = circuit[i];
		const a = points[step.from], b = points[step.to];
		const profile = profiles[i];
		const k = allocations[i];

		if (profile.kind === 'blank') {
			emit(a.x, a.y, 2 * a.r - 1, 2 * a.g - 1, 2 * a.b - 1, 2 * a.intensity - 1); // a, still lit
			emit(a.x, a.y, -1, -1, -1, -1);                                            // a, blanked
			for (let d = 0; d < k - BLANK_MIN_POINTS + 1; d++) emit(b.x, b.y, -1, -1, -1, -1); // b, blanked ×(1+delay)
			continue;
		}

		const distPointCount = Math.max(1, k - cornerPointCount(profile.endCorner, config.radiansPerPoint));
		for (let s = 0; s < distPointCount; s++) {
			const frac = s / distPointCount;
			const x = a.x + (b.x - a.x) * frac, y = a.y + (b.y - a.y) * frac;
			const r = a.r + (b.r - a.r) * frac, g = a.g + (b.g - a.g) * frac, bl = a.b + (b.b - a.b) * frac;
			const inten = a.intensity + (b.intensity - a.intensity) * frac;
			emit(x, y, 2 * r - 1, 2 * g - 1, 2 * bl - 1, 2 * inten - 1);
		}
		for (let d = 0; d < k - distPointCount; d++) {
			emit(b.x, b.y, 2 * b.r - 1, 2 * b.g - 1, 2 * b.b - 1, 2 * b.intensity - 1); // corner dwell at b
		}
	}

	const last = points[circuit[circuit.length - 1].to];
	emit(last.x, last.y, 2 * last.r - 1, 2 * last.g - 1, 2 * last.b - 1, 2 * last.intensity - 1);

	return { data, nPoints: total, minPointsNeeded, overflowed };
}
