/**
 * Reactoscope design palette — exact reference values.
 */
export const PALETTE = {
	graphite: '#D2D9E2',
	silver:   '#D0D0D0',
	blue:     '#C1DEFF',
	gold:     '#FCEF86',
	red:      '#FEBF9D',
	orange:   '#FEDA93',
	green:    '#CCF7A2',
	purple:   '#EEC7FF',
} as const;

export type PaletteColor = typeof PALETTE[keyof typeof PALETTE];

/**
 * Node category → accent colour.
 * All nodes must derive their accent from this map — never hardcode a colour.
 */
export const NODE_COLORS = {
	// ── Active ────────────────────────────────────────────────────────────────
	source:    PALETTE.blue,      // signal generators: oscillators, noise, player, DC
	processor: PALETTE.gold,      // signal processors: gain, EQ, filter
	scene:     PALETTE.purple,    // scene geometry → audio bridge
	output:    PALETTE.green,     // final destination / master out
	debug:     PALETTE.graphite,  // design sandbox / monitoring utility

	// ── Reserved for future node categories ───────────────────────────────────
	dynamics:  PALETTE.red,       // compressors, limiters, transient shapers
	effects:   PALETTE.orange,    // reverb, delay, modulation, time-based FX
	utility:   PALETTE.silver,    // meters, spectrum analysers, DC blockers
} as const;

export type NodeCategory = keyof typeof NODE_COLORS;
