export interface MetalParams {
	lineOpacity:   number;  // 0–0.2   brightness of 1px brush strokes
	shadowOpacity: number;  // 0–0.2   depth of dark inter-stroke bands
	linePeriod:    number;  // 1–8px   stroke pitch (integer)
	specular:      number;  // 0–0.3   top-edge catch-light strength
	sheen:         number;  // 0–0.15  lateral brightness variation
}

export const DEFAULT_METAL_PARAMS: MetalParams = {
	lineOpacity:   0.090,
	shadowOpacity: 0.060,
	linePeriod:    1,
	specular:      0.216,
	sheen:         0.054,
};

export function metalBg(p: MetalParams = DEFAULT_METAL_PARAMS): string {
	const lp  = Math.round(p.linePeriod);
	const dim = (p.specular * 0.33).toFixed(3);
	const shdim = (p.sheen * 0.67).toFixed(3);
	return [
		// Top-edge specular catch-light
		`linear-gradient(to bottom, rgba(255,255,255,${p.specular}) 0%, rgba(255,255,255,${dim}) 25%, transparent 55%)`,
		// Fine brush lines — 1px bright / (period-1)px gap
		`repeating-linear-gradient(
			to bottom,
			rgba(255,255,255,${p.lineOpacity}) 0px,
			rgba(255,255,255,${p.lineOpacity}) 1px,
			transparent 1px,
			transparent ${lp}px
		)`,
		// Shadow bands — offset period creates organic beat pattern
		`repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent ${lp + 1}px,
			rgba(0,0,0,${p.shadowOpacity}) ${lp + 1}px,
			rgba(0,0,0,${p.shadowOpacity}) ${lp * 2 + 1}px
		)`,
		// Lateral sheen
		`linear-gradient(to right, rgba(0,0,0,${p.sheen}) 0%, rgba(255,255,255,${p.sheen}) 35%, rgba(0,0,0,${shdim}) 100%)`,
		// Base steel
		`linear-gradient(to bottom, #2c2c30 0%, #1a1a1e 100%)`,
	].join(', ');
}

export const METAL_BG = metalBg();
