import type { StateCreator } from 'zustand';
import type { AppStore, Theme, ActualTheme } from '../types';

export const createThemeSlice: StateCreator<
	AppStore,
	[],
	[],
	Pick<AppStore, 'theme' | 'setTheme' | 'initializeTheme'>
> = (set, get) => ({
	// Initial state
	theme: {
		current: 'system',
		actualTheme: 'light',
	},

	// Actions
	setTheme: (theme: Theme) => {
		console.log(`🎨 Theme change requested: ${theme}`);

		set((state) => ({
			theme: {
				...state.theme,
				current: theme,
			},
		}));

		// Update actual theme based on selection
		if (theme === 'system') {
			const systemIsDark = window.matchMedia(
				'(prefers-color-scheme: dark)'
			).matches;
			console.log(
				`🖥️ System theme detected: ${systemIsDark ? 'dark' : 'light'}`
			);

			set((state) => ({
				theme: {
					...state.theme,
					actualTheme: systemIsDark ? 'dark' : 'light',
				},
			}));
		} else {
			console.log(`🎯 Setting direct theme: ${theme}`);
			set((state) => ({
				theme: {
					...state.theme,
					actualTheme: theme,
				},
			}));
		}

		// Persist to localStorage
		localStorage.setItem('theme', theme);
		console.log(`💾 Theme persisted to localStorage: ${theme}`);

		// Update DOM
		const { theme: themeState } = get();
		updateDOMTheme(themeState.actualTheme);
		console.log(`✅ Theme applied to DOM: ${themeState.actualTheme}`);
	},

	initializeTheme: () => {
		// Load from localStorage or default to system
		const savedTheme = localStorage.getItem('theme') as Theme;
		const initialTheme = savedTheme || 'system';

		let actualTheme: ActualTheme;
		if (initialTheme === 'system') {
			const systemIsDark = window.matchMedia(
				'(prefers-color-scheme: dark)'
			).matches;
			actualTheme = systemIsDark ? 'dark' : 'light';
		} else {
			actualTheme = initialTheme;
		}

		set({
			theme: {
				current: initialTheme,
				actualTheme,
			},
		});

		updateDOMTheme(actualTheme);

		// Listen for system theme changes
		if (initialTheme === 'system') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleChange = () => {
				const { theme: currentTheme } = get();
				if (currentTheme.current === 'system') {
					const newActualTheme = mediaQuery.matches ? 'dark' : 'light';
					set((state) => ({
						theme: {
							...state.theme,
							actualTheme: newActualTheme,
						},
					}));
					updateDOMTheme(newActualTheme);
				}
			};

			mediaQuery.addEventListener('change', handleChange);
			// Store cleanup function for potential future use
			return () => mediaQuery.removeEventListener('change', handleChange);
		}
	},
});

// Helper function to update DOM theme
function updateDOMTheme(theme: ActualTheme) {
	const body = document.body;
	body.classList.remove('light', 'dark');
	// Remove any existing Tailwind background classes to ensure override
	const existingBgClass = Array.from(body.classList).find((cls) =>
		cls.startsWith('bg-')
	);
	if (existingBgClass) {
		body.classList.remove(existingBgClass);
	}
	body.classList.add(theme);

	if (theme === 'light') {
		body.classList.add('bg-gray-300');
	} else {
		body.classList.add('bg-gray-700');
	}

	// Update meta tag for system components
	document
		.querySelector('meta[name="color-scheme"]')
		?.setAttribute('content', theme);
}
