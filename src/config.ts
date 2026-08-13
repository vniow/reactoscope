export const DEFAULT_COLORS = {
	primary: [1 / 32, 1, 1 / 32, 1] as const,
	secondary: [1, 1 / 32, 1 / 32, 1] as const,
	background: [0, 0, 0, 1] as const,
} as const;

export const DEFAULT_AUDIO_SETTINGS = {
	lineSize: 0.012,
	nSamples: 2048,
} as const;

export const BUILT_IN_TRACKS = [
	{
		label: 'khrang.ogg',
		file: new URL('./woahscope-music/khrang.ogg', import.meta.url).href,
		credit: { title: 'Khrậng', artist: 'Jerobeam Fenderson', url: 'https://www.youtube.com/watch?v=vAyCl4IHIz8' },
	},
	{
		label: 'alpha_molecule.ogg',
		file: new URL('./woahscope-music/alpha_molecule.ogg', import.meta.url).href,
		credit: { title: 'The Alpha Molecule', artist: 'Alexander Taylor', url: 'https://www.youtube.com/watch?v=XM8kYRS-cNk' },
	},
	{
		label: 'oscillofun.ogg',
		file: new URL('./woahscope-music/oscillofun.ogg', import.meta.url).href,
		credit: { title: 'Oscillofun', artist: 'ATOM DELTA', url: 'https://www.youtube.com/watch?v=o4YyI6_y6kw' },
	},
] as const;

export const ERROR_MESSAGES = {
	elementNotFound: (id: string): string =>
		`Required DOM element not found: #${id}`,
	audioNotSupported: 'Web Audio API is not supported in this browser',
	audioDecodeFailed:
		'Unable to decode audio file. Please verify the file is valid.',
	audioLoadFailed: (status: number, statusText: string): string =>
		`Error loading audio file - ${status} ${statusText}`,
	renderInitFailed: 'Failed to initialize Three.js renderer',
	unknownError: 'An unexpected error occurred',
	webgl2NotSupported: 'WebGL 2 is not supported in this browser. Please try a modern browser such as Chrome, Firefox, or Safari 15+.',
	audioNotAvailable: 'Web Audio API is not supported in this browser. Please try a modern browser such as Chrome, Firefox, or Safari.',
} as const;
