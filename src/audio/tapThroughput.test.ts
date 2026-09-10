import { describe, expect, it } from 'vitest';
import { createTapThroughputMeter } from './tapThroughput';

/**
 * Feeds `count` contiguous frames of `samplesPerFrame` samples, starting at
 * `startMs` and spaced `intervalMs` apart in wall-clock time (frame 0 lands
 * exactly on `startMs`, frame `count-1` on `startMs + (count-1)*intervalMs`).
 */
function feedContiguous(
	meter: ReturnType<typeof createTapThroughputMeter>,
	count: number,
	samplesPerFrame: number,
	intervalMs: number,
	startMs = 0,
): void {
	for (let i = 0; i < count; i++) {
		meter.recordFrame(samplesPerFrame, 'contiguous', startMs + i * intervalMs);
	}
}

describe('createTapThroughputMeter', () => {
	it('reports null until the first window closes', () => {
		const meter = createTapThroughputMeter(0.25);
		meter.recordFrame(480, 'contiguous', 0);
		meter.recordFrame(480, 'contiguous', 10);
		expect(meter.kpps).toBeNull();
	});

	it('converges on the nominal rate for steady contiguous frames', () => {
		// 480 samples every 10ms = 48,000 samples/sec = 48 kpps. A wide window
		// (2.5s, 250 intervals) keeps the windowed estimator's inherent +1-frame
		// edge bias (N frames span only N-1 intervals) under 1%.
		const meter = createTapThroughputMeter(2.5);
		feedContiguous(meter, 251, 480, 10);
		expect(meter.kpps).not.toBeNull();
		expect(Math.abs(meter.kpps! - 48)).toBeLessThan(1);
	});

	it('reports a lower rate when wall-clock delivery stalls (a real stutter)', () => {
		// Same 480-sample frames, but each takes 20ms of wall-clock time to
		// arrive instead of 10ms — half the true throughput, even though every
		// individual frame is still 'contiguous'. A meter that just read
		// getSampleRate() could never show this dip; measuring the actual tap
		// is the whole point of this module.
		const meter = createTapThroughputMeter(2.5);
		feedContiguous(meter, 126, 480, 20);
		expect(Math.abs(meter.kpps! - 24)).toBeLessThan(1);
	});

	it('counts a gap frame using the caller-supplied dropped-sample total, not just the latest frame', () => {
		// 24 contiguous frames of 480 samples @ 10ms (0..230ms), then one 'gap'
		// frame at 250ms whose samplesThisFrame already includes 4 frames worth
		// (4 * 480 = 1920 — the 4 that arrived while nothing was read). Total:
		// 24*480 + 1920 = 13440 samples over the 250ms window = 53.76 kpps.
		const meter = createTapThroughputMeter(0.25);
		feedContiguous(meter, 24, 480, 10);
		meter.recordFrame(4 * 480, 'gap', 250);
		expect(meter.kpps).not.toBeNull();
		expect(meter.kpps!).toBeCloseTo(53.76, 2);
	});

	it('discards the in-progress window on sourceChanged instead of letting stale timing skew the next reading', () => {
		const meter = createTapThroughputMeter(0.25);
		// A slow, never-closed partial window.
		meter.recordFrame(480, 'contiguous', 0);
		meter.recordFrame(480, 'contiguous', 50);
		expect(meter.kpps).toBeNull();

		meter.recordFrame(0, 'sourceChanged', 1000);
		// A clean nominal-rate window anchored at the reset point (1000ms).
		// If the reset didn't discard the stale anchor, this window would
		// close immediately against ~1s of elapsed time instead of 250ms,
		// reporting a rate nowhere near 48 kpps.
		feedContiguous(meter, 26, 480, 10, 1000);
		expect(meter.kpps!).toBeCloseTo(49.92, 2);
	});

	it('discards the window on first, treating it as a fresh start rather than a stall', () => {
		const meter = createTapThroughputMeter(0.25);
		meter.recordFrame(480, 'first', 0);
		feedContiguous(meter, 26, 480, 10, 0);
		expect(meter.kpps!).toBeCloseTo(49.92, 2);
	});
});
