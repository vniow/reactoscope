/**
 * Persistence-of-vision rendering math for the laser visualiser.
 *
 * The galvo capture worklet writes its post-transducer signal into a continuous
 * ring buffer and publishes a monotonic `writeCount` (total samples ever
 * written). Each render frame the visualiser deposits only the beam samples
 * that were actually scanned during that frame's wall-clock slice, then decays
 * the accumulation buffer by elapsed real time. Low scan rates (low PPS) leave
 * the beam mid-shape between frames → visible crawl + flicker + dimming; high
 * rates stamp the whole shape every frame → steady and bright.
 *
 * This module is the pure, GL-free part of that model so it can be unit-tested.
 */

/** One contiguous run of ring indices to read (handles wrap as ≤2 runs). */
export interface RingRun {
	start:  number; // inclusive ring index
	length: number;
}

export interface RingSpan {
	/** Number of fresh samples since the last read, capped at ring length. */
	count: number;
	/** Contiguous runs to read, in chronological order (1 run, or 2 if wrapped). */
	runs:  RingRun[];
}

/**
 * Resolve which ring indices to deposit this frame.
 *
 * @param lastCount  writeCount observed on the previous frame
 * @param writeCount writeCount now
 * @param ringLen    ring capacity in samples
 *
 * If more than `ringLen` samples elapsed (a long stall), only the most recent
 * `ringLen` are recoverable — older ones have already been overwritten.
 */
export function resolveRingSpan(lastCount: number, writeCount: number, ringLen: number): RingSpan {
	if (ringLen <= 0) return { count: 0, runs: [] };
	let fresh = writeCount - lastCount;
	if (fresh <= 0) return { count: 0, runs: [] };
	if (fresh > ringLen) fresh = ringLen;

	// The freshest sample sits just behind writeCount; the span ends there.
	const startCount = writeCount - fresh;
	const startIdx   = ((startCount % ringLen) + ringLen) % ringLen;

	if (startIdx + fresh <= ringLen) {
		return { count: fresh, runs: [{ start: startIdx, length: fresh }] };
	}
	// Wrapped: split into tail run + head run.
	const tail = ringLen - startIdx;
	return {
		count: fresh,
		runs: [
			{ start: startIdx, length: tail },
			{ start: 0,        length: fresh - tail },
		],
	};
}

/**
 * Per-frame phosphor/eye decay factor for elapsed wall-clock `dt` (s) and
 * time constant `tau` (s). The accumulation buffer is multiplied by this each
 * frame, so brightness and flicker are emergent: a fixed amount of beam energy
 * is deposited per second (sampleRate × per-sample energy, independent of PPS),
 * but at low scan rates only a small arc is freshly lit at any instant while the
 * rest has decayed — which reads as a dim, crawling, flickering trace. No
 * explicit per-fps brightness law is needed or wanted.
 */
export function decayFactor(dt: number, tau: number): number {
	if (tau <= 0) return 0;       // no persistence → fully cleared each frame
	if (dt <= 0)  return 1;       // no time passed → no decay
	return Math.exp(-dt / tau);
}

/** Effective refresh rate (Hz) of the beam: full shape traversals per second. */
export function refreshRate(pps: number, pointsPerFrame: number): number {
	if (pointsPerFrame <= 0) return 0;
	return pps / pointsPerFrame;
}
