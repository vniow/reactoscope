import { createTheme } from '@mui/material/styles';

const DAW_FONT = 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace';

export const FONT_OPTIONS = [
	{ key: 'mono',   label: 'mono',   css: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace' },
	{ key: 'sans',   label: 'sans',   css: 'system-ui, -apple-system, sans-serif' },
	{ key: 'narrow', label: 'narrow', css: '"Barlow Condensed", "Roboto Condensed", sans-serif' },
	{ key: 'inter',  label: 'inter',  css: '"Inter", system-ui, sans-serif' },
] as const;

export type FontKey = typeof FONT_OPTIONS[number]['key'];

/** Updates the font globally — works on MUI and all other elements. */
export function applyFont(key: FontKey) {
	const opt = FONT_OPTIONS.find(o => o.key === key);
	if (!opt) return;
	let el = document.getElementById('daw-font-override') as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.id = 'daw-font-override';
		document.head.appendChild(el);
	}
	el.textContent = `*, *::before, *::after { font-family: ${opt.css} !important; }`;
}

export const theme = createTheme({
	typography: {
		fontFamily: DAW_FONT,
	},
	palette: {
		mode: 'dark',
		primary: {
			main: '#22dd22',
		},
		background: {
			default: '#000000',
			paper: '#111111',
		},
		text: {
			primary: '#dddddd',
			secondary: '#aaaaaa',
		},
	},
	components: {

		MuiButtonBase: {
			styleOverrides: {
				root: {
					'&.Mui-focusVisible': {
						outline: '2px solid #22dd22',
						outlineOffset: 2,
					},
				},
			},
		},
		MuiSlider: {
			styleOverrides: {
				thumb: {
					'&.Mui-focusVisible, &:focus-visible': {
						boxShadow: '0 0 0 4px rgba(34, 221, 34, 0.4)',
					},
				},
			},
		},
	},
});
