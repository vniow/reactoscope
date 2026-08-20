import { getColourFromHue } from './utils';

export type ChannelId = 'x' | 'y' | 'r' | 'g' | 'b' | 'z';

export const CHANNEL_ORDER: ChannelId[] = ['x', 'y', 'r', 'g', 'b', 'z'];

const CHANNEL_HUES: Record<ChannelId, number> = {
	x: 180, y: 60, r: 0, g: 120, b: 240, z: 300,
};

export const CHANNEL_LABEL: Record<ChannelId, string> = {
	x: 'X', y: 'Y', r: 'R', g: 'G', b: 'B', z: 'Z',
};

export function channelColour(ch: ChannelId): [number, number, number] {
	return getColourFromHue(CHANNEL_HUES[ch]);
}

export function channelHex(ch: ChannelId): string {
	const [r, g, b] = getColourFromHue(CHANNEL_HUES[ch]);
	const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Finds the first upward zero-crossing in channelData that can serve as a
 * stable sweep trigger point.
 *
 * Uses an auto-level (midpoint of the signal's range) so DC-offset signals
 * and channels whose values cluster away from zero (e.g. R/G/B pinned near
 * -1, or Z pinned near -1, during blank travel) still get a consistent anchor.
 *
 * Hysteresis is expressed as a fraction of the signal's peak-to-peak range so
 * it scales correctly regardless of amplitude.
 *
 * @param data            waveform buffer to scan
 * @param displaySamples  number of samples that will be displayed — limits the
 *                        scan range so the display window always fits in the buffer
 * @param hysteresis      fraction of p-p range the signal must dip below the
 *                        trigger level before a rising crossing is accepted (0.05–0.2)
 * @param searchWindow    if provided, confines the scan to the first N samples
 *                        rather than the full available headroom — use the signal
 *                        period here so the trigger always locks to the same
 *                        feature within one cycle rather than any crossing in the buffer
 * @returns sample offset to start the sweep from, or 0 if no crossing found
 */
export function findTriggerOffset(
	data: Float32Array,
	displaySamples: number,
	hysteresis = 0.1,
	searchWindow?: number,
): number {
	const maxScan = Math.min(
		searchWindow ?? (data.length - displaySamples),
		data.length - displaySamples,
	);
	if (maxScan <= 1) return 0;

	// Auto-level: trigger at the midpoint of the amplitude range
	let min = data[0], max = data[0];
	for (let i = 1; i < maxScan; i++) {
		if (data[i] < min) min = data[i];
		if (data[i] > max) max = data[i];
	}
	const level = (min + max) * 0.5;
	const hyst  = (max - min) * hysteresis;

	// Find first rising crossing that was preceded by a negative excursion
	let primed = false;
	for (let i = 1; i < maxScan; i++) {
		if (!primed && data[i] < level - hyst) primed = true;
		if (primed && data[i - 1] < level && data[i] >= level) return i;
	}
	return 0; // fallback: no crossing — display from buffer start
}

/**
 * Fills outX/outY with sweep-mode positions for one channel lane.
 * outX: linear time sweep [-1, +1]
 * outY: amplitude offset into the lane's vertical region
 *
 * @param channelData    raw waveform buffer (full analyser snapshot)
 * @param offset         sample index to start reading from (trigger point)
 * @param displaySamples number of samples to display
 * @param laneIndex      0 = top lane
 * @param nLanes         total number of active lanes
 * @param gain           amplitude multiplier (already raised to power-of-two)
 * @param outX           pre-allocated Float32Array of length >= displaySamples
 * @param outY           pre-allocated Float32Array of length >= displaySamples
 */
export function buildSweepPositions(
	channelData: Float32Array,
	offset: number,
	displaySamples: number,
	laneIndex: number,
	nLanes: number,
	gain: number,
	outX: Float32Array,
	outY: Float32Array,
): void {
	const laneScale  = 0.8 / nLanes;
	// laneIndex 0 → top (Y near +1), laneIndex nLanes-1 → bottom (Y near -1)
	const laneCenter = ((nLanes - 1 - laneIndex) + 0.5) / nLanes * 2 - 1;
	for (let i = 0; i < displaySamples; i++) {
		outX[i] = displaySamples > 1 ? (i / (displaySamples - 1)) * 2 - 1 : 0;
		outY[i] = laneCenter + channelData[offset + i] * gain * laneScale;
	}
}
