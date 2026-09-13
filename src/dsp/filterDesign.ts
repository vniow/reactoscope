// Analog lowpass prototypes for the MEMS Quasistatic Model, realised as
// cascaded digital biquads.
//
// Grounded in the PlayzerX repository's MTIDataGenerator, whose content filter
// is configured as
//
//     SetupSoftwareFilter(type, order, cutoffFreq, sampleFreq)
//
// with `type` drawn from a FilterType enum that begins FilterBessel = 1,
// FilterButterworth = 2. Family and order are both free parameters there, so
// they are free parameters here too — the previous fixed Bessel-2-or-5 came
// from a different product (the Mirrorcle PicoAmp driver's MAX7413) and did not
// describe PlayzerX.
//
// Both families are normalised so that |H| is -3dB at the requested cutoff.
// DSPFilters, which PlayzerX vendors, does not necessarily normalise Bessel
// that way internally, but a UI where switching family silently moves the
// corner is a worse instrument than one where "cutoff" means one thing.

import { bilinearOnePole, rbjLowpass, type BiquadCoeffs } from './biquad';

export type FilterFamily = 'bessel' | 'butterworth';

export const MIN_FILTER_ORDER = 1;
export const MAX_FILTER_ORDER = 8;

interface Complex { re: number; im: number }

const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: Complex, b: Complex): Complex => ({
	re: a.re * b.re - a.im * b.im,
	im: a.re * b.im + a.im * b.re,
});
const cAbs = (a: Complex): number => Math.hypot(a.re, a.im);

function cDiv(a: Complex, b: Complex): Complex {
	const d = b.re * b.re + b.im * b.im;
	return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

/**
 * Coefficients of the reverse Bessel polynomial θ_n(s), in increasing power.
 *
 *     a_k = (2n-k)! / (2^(n-k) · k! · (n-k)!)
 *
 * Exact integers, and the definition of the polynomial — so the poles below are
 * *derived* rather than transcribed from a table. θ_2 = s²+3s+3 and
 * θ_5 = s⁵+15s⁴+105s³+420s²+945s+945 fall out of this, and filterDesign.test.ts
 * checks the recovered roots back against these coefficients.
 */
export function reverseBesselCoefficients(order: number): number[] {
	const fact = (n: number): number => {
		let r = 1;
		for (let i = 2; i <= n; i++) r *= i;
		return r;
	};
	const out: number[] = [];
	for (let k = 0; k <= order; k++) {
		out.push(fact(2 * order - k) / (2 ** (order - k) * fact(k) * fact(order - k)));
	}
	return out;
}

/** Durand-Kerner: all roots of a polynomial given in increasing-power order. */
function polynomialRoots(coeffs: number[]): Complex[] {
	const n    = coeffs.length - 1;
	const lead = coeffs[n];
	const c    = coeffs.map((v) => v / lead);

	const evaluate = (z: Complex): Complex => {
		let r: Complex = { re: 0, im: 0 };
		for (let k = n; k >= 0; k--) r = { re: r.re * z.re - r.im * z.im + c[k], im: r.re * z.im + r.im * z.re };
		return r;
	};

	// Spread the initial guesses around a spiral so no two start equal.
	let roots: Complex[] = [];
	for (let k = 0; k < n; k++) {
		const th = (2 * Math.PI * k) / n + 0.5;
		roots.push({ re: 0.9 * Math.cos(th), im: 0.9 * Math.sin(th) });
	}

	for (let iter = 0; iter < 500; iter++) {
		const next: Complex[] = [];
		let moved = 0;
		for (let i = 0; i < n; i++) {
			let denom: Complex = { re: 1, im: 0 };
			for (let j = 0; j < n; j++) if (i !== j) denom = cMul(denom, cSub(roots[i], roots[j]));
			const step = cDiv(evaluate(roots[i]), denom);
			next.push(cSub(roots[i], step));
			moved = Math.max(moved, cAbs(step));
		}
		roots = next;
		if (moved < 1e-14) break;
	}
	return roots;
}

/** |H(jω)| for a pole-only lowpass normalised so H(0) = 1. */
function poleGain(poles: Complex[], w: number): number {
	let num = 1, den = 1;
	for (const p of poles) {
		num *= cAbs(p);
		den *= cAbs({ re: -p.re, im: w - p.im });
	}
	return num / den;
}

/** Rescales poles so the cascade is -3dB at ω = 1. */
function normaliseTo3dB(poles: Complex[]): Complex[] {
	let lo = 1e-6, hi = 100;
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		if (poleGain(poles, mid) > Math.SQRT1_2) lo = mid; else hi = mid;
	}
	const scale = (lo + hi) / 2;
	return poles.map((p) => ({ re: p.re / scale, im: p.im / scale }));
}

function besselPoles(order: number): Complex[] {
	return normaliseTo3dB(polynomialRoots(reverseBesselCoefficients(order)));
}

/**
 * Butterworth poles sit on the unit circle by construction, which is already
 * the -3dB normalisation — no rescaling needed.
 */
function butterworthPoles(order: number): Complex[] {
	const out: Complex[] = [];
	for (let k = 1; k <= order; k++) {
		const th = (Math.PI * (2 * k + order - 1)) / (2 * order);
		out.push({ re: Math.cos(th), im: Math.sin(th) });
	}
	return out;
}

export interface FilterPrototype {
	/** Conjugate pole pairs, as (natural frequency ÷ cutoff, damping ζ). */
	pairs: { f0Ratio: number; zeta: number }[];
	/** The single real pole an odd-order filter carries, ÷ cutoff. */
	realRatio?: number;
}

const cache = new Map<string, FilterPrototype>();

/** Pole layout for one family and order, as section parameters. Memoised. */
export function lowpassPrototype(family: FilterFamily, order: number): FilterPrototype {
	const n   = Math.min(MAX_FILTER_ORDER, Math.max(MIN_FILTER_ORDER, Math.round(order)));
	const key = `${family}:${n}`;
	const hit = cache.get(key);
	if (hit !== undefined) return hit;

	const poles = family === 'bessel' ? besselPoles(n) : butterworthPoles(n);

	const proto: FilterPrototype = { pairs: [] };
	const used = new Array<boolean>(poles.length).fill(false);

	for (let i = 0; i < poles.length; i++) {
		if (used[i]) continue;
		const p = poles[i];
		if (Math.abs(p.im) < 1e-9) {
			used[i] = true;
			proto.realRatio = Math.abs(p.re);
			continue;
		}
		// Find this pole's conjugate and emit one second-order section for both.
		for (let j = i + 1; j < poles.length; j++) {
			if (used[j]) continue;
			if (Math.abs(poles[j].re - p.re) < 1e-9 && Math.abs(poles[j].im + p.im) < 1e-9) {
				used[i] = used[j] = true;
				const mag = cAbs(p);
				proto.pairs.push({ f0Ratio: mag, zeta: -p.re / mag });
				break;
			}
		}
	}

	cache.set(key, proto);
	return proto;
}

/**
 * Biquad sections realising a lowpass of `family` and `order` with its -3dB
 * point at `cutoff`.
 *
 * Section frequencies sit above the cutoff (ratios reach ~1.8 for high-order
 * Bessel), so each is capped at `sampleRate / 4` individually rather than
 * relying on a cap applied to `cutoff` alone — a filter that goes unstable off
 * the end of a slider is not worth the comparisons saved.
 */
export function lowpassSections(
	sampleRate: number,
	cutoff: number,
	family: FilterFamily,
	order: number,
): BiquadCoeffs[] {
	const proto    = lowpassPrototype(family, order);
	const maxF0    = sampleRate / 4;
	const sections = proto.pairs.map((p) =>
		rbjLowpass(sampleRate, Math.min(p.f0Ratio * cutoff, maxF0), p.zeta),
	);

	if (proto.realRatio !== undefined) {
		sections.push(bilinearOnePole(sampleRate, Math.min(proto.realRatio * cutoff, maxF0)));
	}
	return sections;
}
