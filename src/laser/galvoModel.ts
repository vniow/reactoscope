/**
 * Galvanometer + laser-modulator transducer model.
 *
 * Models the analog response of a closed-loop servo galvanometer pair driving
 * an X/Y mirror, plus the rise/fall of an analog-modulated RGB laser source.
 *
 *   X/Y axes — 2nd-order low-pass biquad (mass-spring-damper):
 *
 *       H(s) = ωn² / (s² + 2ζωn s + ωn²)
 *
 *     Discretised by bilinear transform (RBJ LPF cookbook, Q = 1/(2ζ)).
 *     Underdamped values (ζ < 1) produce overshoot + ringing on step inputs,
 *     which is the visible "corner rounding + post-corner squiggle" signature
 *     of real galvos pushed past their bandwidth.
 *
 *   R/G/B channels — 1-pole low-pass per channel:
 *
 *       y[n] = y[n-1] + (x[n] - y[n-1]) · (1 - exp(-T/τ))
 *
 *     τ is the modulator time constant (analog driver ~5 µs, slower TTL paths
 *     tens of µs). Causes faint "blanking trails" where the laser hasn't fully
 *     turned off during fast travel.
 *
 * Pure TypeScript, no Web Audio dependency, so the worklet, main thread, and
 * unit tests all consume the same code. Operates on Float32Array channels
 * (matching the COORD_STRIDE convention in scene/pathBuilder.ts — separate
 * arrays per channel, no interleaving).
 */

export interface GalvoParams {
	/** Servo natural frequency (Hz). 30K-rated galvos: ~18 kHz; 60K-rated: ~28 kHz. */
	bandwidthHz:     number;
	/** Damping ratio ζ. Real galvos sit near 0.6–0.7 (light overshoot). */
	dampingRatio:    number;
	/** Laser modulator 1-pole time constant (µs). Decent analog driver: ~5; TTL: ~30. */
	modulatorTauUs:  number;
}

export const DEFAULT_GALVO_PARAMS: GalvoParams = {
	bandwidthHz:    18_000,
	dampingRatio:   0.65,
	modulatorTauUs: 5,
};

interface BiquadCoeffs {
	b0: number; b1: number; b2: number;
	a1: number; a2: number;
}

/** RBJ cookbook 2-pole LPF with cutoff fc and Q = 1/(2ζ), normalised by a0. */
function biquadLpf(fc: number, zeta: number, sampleRate: number): BiquadCoeffs {
	// Clamp cutoff well below Nyquist so the bilinear pre-warp stays stable.
	const fcMax = sampleRate * 0.45;
	const fcSafe = Math.min(Math.max(fc, 1), fcMax);
	const Q  = 1 / (2 * Math.max(zeta, 1e-3));
	const w0 = 2 * Math.PI * fcSafe / sampleRate;
	const cosW0 = Math.cos(w0);
	const sinW0 = Math.sin(w0);
	const alpha = sinW0 / (2 * Q);

	const b0 = (1 - cosW0) / 2;
	const b1 =  1 - cosW0;
	const b2 = (1 - cosW0) / 2;
	const a0 =  1 + alpha;
	const a1 = -2 * cosW0;
	const a2 =  1 - alpha;

	return {
		b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
		a1: a1 / a0, a2: a2 / a0,
	};
}

/** Per-channel direct-form-II transposed biquad state (one filter instance). */
class BiquadDF2T {
	private z1 = 0;
	private z2 = 0;

	process(x: number, c: BiquadCoeffs): number {
		const y = c.b0 * x + this.z1;
		this.z1 = c.b1 * x - c.a1 * y + this.z2;
		this.z2 = c.b2 * x - c.a2 * y;
		return y;
	}

	reset(): void { this.z1 = 0; this.z2 = 0; }
}

/** Single-pole low-pass; state is just last output. */
class OnePoleLpf {
	private y = 0;

	process(x: number, alpha: number): number {
		this.y += (x - this.y) * alpha;
		return this.y;
	}

	reset(value = 0): void { this.y = value; }
}

export class GalvoModel {
	readonly sampleRate: number;
	private params:    GalvoParams;
	private xyCoeffs:  BiquadCoeffs;
	private modAlpha:  number;

	// One biquad per axis; one 1-pole per colour channel.
	private readonly bqX = new BiquadDF2T();
	private readonly bqY = new BiquadDF2T();
	private readonly lpR = new OnePoleLpf();
	private readonly lpG = new OnePoleLpf();
	private readonly lpB = new OnePoleLpf();

	constructor(sampleRate: number, params: GalvoParams = DEFAULT_GALVO_PARAMS) {
		this.sampleRate = sampleRate;
		this.params     = { ...params };
		this.xyCoeffs   = biquadLpf(params.bandwidthHz, params.dampingRatio, sampleRate);
		this.modAlpha   = onePoleAlpha(params.modulatorTauUs, sampleRate);
	}

	getParams(): GalvoParams { return { ...this.params }; }

	setParams(patch: Partial<GalvoParams>): void {
		this.params = { ...this.params, ...patch };
		this.xyCoeffs = biquadLpf(this.params.bandwidthHz, this.params.dampingRatio, this.sampleRate);
		this.modAlpha = onePoleAlpha(this.params.modulatorTauUs, this.sampleRate);
	}

	reset(initialX = 0, initialY = 0, initialR = 0, initialG = 0, initialB = 0): void {
		this.bqX.reset(); this.bqY.reset();
		// Pre-seed biquad state so a non-zero starting position doesn't kick the filter.
		// Direct-form-II transposed: when input == output == v in steady state,
		// z1 = (b1 - a1) v, z2 = (b2 - a2) v.
		seedBiquad(this.bqX, this.xyCoeffs, initialX);
		seedBiquad(this.bqY, this.xyCoeffs, initialY);
		this.lpR.reset(initialR);
		this.lpG.reset(initialG);
		this.lpB.reset(initialB);
	}

	/** Process one block in place. Channels: x, y in NDC; r, g, b in [-1, +1] audio range. */
	process(
		x: Float32Array, y: Float32Array,
		r: Float32Array, g: Float32Array, b: Float32Array,
		n: number = x.length,
	): void {
		const { xyCoeffs, modAlpha, bqX, bqY, lpR, lpG, lpB } = this;
		for (let i = 0; i < n; i++) {
			x[i] = bqX.process(x[i], xyCoeffs);
			y[i] = bqY.process(y[i], xyCoeffs);
			r[i] = lpR.process(r[i], modAlpha);
			g[i] = lpG.process(g[i], modAlpha);
			b[i] = lpB.process(b[i], modAlpha);
		}
	}
}

/** Map 1-pole RC time constant (µs) to per-sample blend coefficient. */
function onePoleAlpha(tauUs: number, sampleRate: number): number {
	if (tauUs <= 0) return 1;
	const T = 1 / sampleRate;
	return 1 - Math.exp(-T / (tauUs * 1e-6));
}

function seedBiquad(bq: BiquadDF2T, c: BiquadCoeffs, v: number): void {
	// Steady-state DF2T state vars at constant input = output = v.
	// From y = b0·x + z1 and z2 = b2·x - a2·y with x = y = v:
	//   z1 = v · (1 - b0)
	//   z2 = v · (b2 - a2)
	const s = bq as unknown as { z1: number; z2: number };
	s.z1 = v * (1 - c.b0);
	s.z2 = v * (c.b2 - c.a2);
}

// ─── Closed-form references (exported for tests) ──────────────────────────────

/** Theoretical 2nd-order overshoot fraction for a unit step. ζ in (0, 1). */
export function theoreticalOvershoot(zeta: number): number {
	if (zeta <= 0) return 1;
	if (zeta >= 1) return 0;
	return Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta));
}

/** Theoretical 2% settling time (seconds) for a 2nd-order underdamped system. */
export function theoreticalSettlingTime(bandwidthHz: number, zeta: number): number {
	const omegaN = 2 * Math.PI * bandwidthHz;
	return 4 / (zeta * omegaN);
}
