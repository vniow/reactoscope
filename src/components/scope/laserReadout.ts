import { useEffect, useState } from 'react';

// ─── Laser Beam Emulator telemetry ──────────────────────────────────────────
// Live per-frame diagnostics from whichever laser device is currently
// rendering. Deliberately NOT React Context or component state: these change
// every frame, and pushing that through Context would re-render every consumer
// at frame rate. Follows the repo's existing "tap + readout" convention — a
// mutable record written by the render loop and polled by rAF (ADR-0001).
//
// A module-level singleton is safe because VisualizationCanvasR3F mounts
// exactly one Beam Emulator at a time.
//
// Everything here is display-only. No clamping, no correction, no automatic
// rate limiting (ADR-0010 sub-decision 9, ADR-0012 sub-decision 9).

export interface LaserReadout {
	/** RMS of |commanded - actual| across the last frame, in normalised X/Y units. */
	trackingRms: number;
	/** Worst single-sample |commanded - actual| in the last frame. */
	trackingPeak: number;
	/**
	 * Fraction of samples the Scanner Model clamped against a position limit,
	 * or null for devices that have no such limit.
	 */
	clampedFraction: number | null;
	/** Discontinuity resets since the renderer mounted. */
	resetCount: number;
}

const readout: LaserReadout = {
	trackingRms:     0,
	trackingPeak:    0,
	clampedFraction: null,
	resetCount:      0,
};

export function writeLaserReadout(next: LaserReadout): void {
	readout.trackingRms     = next.trackingRms;
	readout.trackingPeak    = next.trackingPeak;
	readout.clampedFraction = next.clampedFraction;
	readout.resetCount      = next.resetCount;
}

/**
 * Polls the readout at a fixed interval rather than every animation frame:
 * the numbers are for reading, and a value that updates 60 times a second is
 * less legible than one that updates ten times a second, at a tenth the
 * re-render cost.
 */
export function useLaserReadout(intervalMs = 100): LaserReadout {
	const [snapshot, setSnapshot] = useState<LaserReadout>(() => ({ ...readout }));

	useEffect(() => {
		const id = setInterval(() => setSnapshot({ ...readout }), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);

	return snapshot;
}
