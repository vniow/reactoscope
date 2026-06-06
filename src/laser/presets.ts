/**
 * Galvo + modulator presets keyed by industry PPS rating at the ILDA test pattern.
 *
 * Values are deliberately approximate — the goal is recognisable A/B behaviour
 * between classes of projector, not datasheet replication. Bandwidth values
 * track real published small-signal step responses; damping sits in the
 * 0.6–0.7 band typical of well-tuned closed-loop servo galvos.
 */

import type { GalvoParams } from './galvoModel';

export type GalvoPresetId = 'galvo20k' | 'galvo30k' | 'galvo40k' | 'galvo60k' | 'custom';

export interface GalvoPreset {
	id:          GalvoPresetId;
	label:       string;
	description: string;
	/** Recommended PPS at ILDA test pattern. */
	pps:         number;
	/** Anchor-point dwell aggressiveness (0 = none, 1 = ILDA-conservative). */
	anchorAggressiveness: number;
	params:      GalvoParams;
}

export const GALVO_PRESETS: Record<Exclude<GalvoPresetId, 'custom'>, GalvoPreset> = {
	galvo20k: {
		id:          'galvo20k',
		label:       '20K (entry / club)',
		description: 'Soft corners, visibly laggy on fast curves. Common in budget projectors.',
		pps:                  20_000,
		anchorAggressiveness: 1.0,
		params: { bandwidthHz: 12_000, dampingRatio: 0.60, modulatorTauUs: 15 },
	},
	galvo30k: {
		id:          'galvo30k',
		label:       '30K (ILDA standard)',
		description: 'Industry baseline. Most content is authored against this rating.',
		pps:                  30_000,
		anchorAggressiveness: 0.7,
		params: { bandwidthHz: 18_000, dampingRatio: 0.65, modulatorTauUs: 8 },
	},
	galvo40k: {
		id:          'galvo40k',
		label:       '40K (prosumer)',
		description: 'Tighter corners, near-critical damping. Mid-tier touring rigs.',
		pps:                  40_000,
		anchorAggressiveness: 0.5,
		params: { bandwidthHz: 22_000, dampingRatio: 0.70, modulatorTauUs: 5 },
	},
	galvo60k: {
		id:          'galvo60k',
		label:       '60K (ScannerMAX-class)',
		description: 'Nearly sharp corners with subtle ring. High-end / scientific.',
		pps:                  60_000,
		anchorAggressiveness: 0.3,
		params: { bandwidthHz: 28_000, dampingRatio: 0.70, modulatorTauUs: 3 },
	},
};

export const DEFAULT_PRESET_ID: GalvoPresetId = 'galvo30k';
