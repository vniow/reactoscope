import { StrictMode } from 'react';
import '@xyflow/react/dist/style.css';
import './style.css';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { App } from './App';
import { theme } from './theme';



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
