// The seam every Beam Emulator's Scanner Model implements. Lives here rather
// than under src/galvo/ so that src/mems/ does not have to import from a
// sibling device's directory — see docs/adr/0012-mems-laser-beam-emulator.md,
// sub-decision 6. src/galvo/scannerModel.ts re-exports it, so existing import
// paths keep working.

export interface ScannerAxis {
	/** Runs the model over a buffer, carrying state from the previous call. */
	process(input: Float32Array): Float32Array;
	/**
	 * Warm-starts all internal history to `value`, as if the axis had been
	 * sitting at rest there. Call this whenever the caller detects a
	 * discontinuity in its input (see ADR-0010, sub-decision 3) — never
	 * zero the state instead, or a gap fabricates a full-scale slew from
	 * the origin that never actually happened.
	 */
	reset(value: number): void;
	/**
	 * How many samples the most recent `process()` call clamped against a
	 * position limit. Optional: only models with an amplitude ceiling implement
	 * it, so the galvo (whose limit is on rate, not position) omits it and the
	 * readout reports nothing rather than zero.
	 */
	clampedCount?(): number;
}
