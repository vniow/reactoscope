import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

interface ThemeProviderProps {
	children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(() => {
		const savedTheme = localStorage.getItem('theme') as Theme;
		return savedTheme || 'system';
	});

	const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const updateActualTheme = () => {
			if (theme === 'system') {
				setActualTheme(mediaQuery.matches ? 'dark' : 'light');
			} else {
				setActualTheme(theme);
			}
		};

		updateActualTheme();

		// Listen for system theme changes
		const handleChange = () => {
			if (theme === 'system') {
				setActualTheme(mediaQuery.matches ? 'dark' : 'light');
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [theme]);

	useEffect(() => {
		const body = document.body;
		// Remove both classes first to ensure a clean state
		body.classList.remove('light', 'dark');

		if (actualTheme === 'dark') {
			body.classList.add('dark');
			// Also update the meta tag for system components
			document
				.querySelector('meta[name="color-scheme"]')
				?.setAttribute('content', 'dark');
		} else {
			body.classList.add('light'); // Explicitly add 'light' for light theme
			// Also update the meta tag for system components
			document
				.querySelector('meta[name="color-scheme"]')
				?.setAttribute('content', 'light');
		}
		localStorage.setItem('theme', theme);
	}, [theme, actualTheme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}
