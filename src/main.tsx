import { StrictMode } from 'react';
import '@xyflow/react/dist/style.css';
import './style.css';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { initToneContext } from './scene/audioSetup';

// Configure Tone.js with the user's stored sample rate BEFORE any module that
// instantiates Tone objects is imported.  daw.ts calls Tone's getContext()
// synchronously on module load, so App must be dynamically imported AFTER
// initToneContext() runs here.
initToneContext();

// Dynamic import ensures daw.ts is loaded (and getContext() is called) only
// after the Tone context above is in place.
import('./App').then(({ App }) => {
	const root = ReactDOM.createRoot(
		document.getElementById('root') as HTMLElement,
	);
	root.render(
		<StrictMode>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<App />
			</ThemeProvider>
		</StrictMode>,
	);
}).catch(console.error);
