import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
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
