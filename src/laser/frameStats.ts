/**
 * Frame-rate / flicker-margin derivation for the laser-mode emulator.
 *
 *   fps           = pps / pointsPerFrame
 *   pointsPerFrame = coordBufferSize (one cycle of the worklet's coord buffer)
 *
 * Real ILDA projection has a well-known flicker threshold around 15–20 Hz —
 * below that the eye sees individual strobes, above ~40 Hz the picture fuses.
 * The colour tag is what the overlay readout uses to draw a green / amber /
 * red badge next to the live fps reading.
 */

export type FlickerTier = 'severe' | 'visible' | 'borderline' | 'fused';

export interface FrameStats {
	pointsPerFrame: number;
	fps:            number;
	flicker:        FlickerTier;
}

const TIER_THRESHOLDS: { tier: FlickerTier; minFps: number }[] = [
	{ tier: 'fused',      minFps: 40 },
	{ tier: 'borderline', minFps: 25 },
	{ tier: 'visible',    minFps: 15 },
	{ tier: 'severe',     minFps: 0  },
];

export function flickerTierForFps(fps: number): FlickerTier {
	for (const t of TIER_THRESHOLDS) if (fps >= t.minFps) return t.tier;
	return 'severe';
}

export function computeFrameStats(pps: number, pointsPerFrame: number): FrameStats {
	const safePoints = Math.max(1, pointsPerFrame);
	const fps        = pps / safePoints;
	return {
		pointsPerFrame: safePoints,
		fps,
		flicker:        flickerTierForFps(fps),
	};
}

/** Hex colour to render next to the fps readout. Matches the four flicker tiers. */
export const FLICKER_COLOR: Record<FlickerTier, string> = {
	severe:     '#ef5350', // red
	visible:    '#ff9800', // orange
	borderline: '#ffd54f', // amber
	fused:      '#81c784', // green
};
