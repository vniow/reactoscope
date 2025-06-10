import type { StateCreator } from 'zustand';
import type { AppStore, Theme, ActualTheme, MetallicTheme } from '../types';

export const createThemeSlice: StateCreator<
	AppStore,
	[],
	[],
	Pick<
		AppStore,
		'theme' | 'setTheme' | 'setMetallicBackground' | 'initializeTheme'
	>
> = (set, get) => ({
	// Initial state
	theme: {
		current: 'system',
		actualTheme: 'light',
		metallicBackground: 'titanium',
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
		updateDOMTheme(themeState.actualTheme, themeState.metallicBackground);
		console.log(`✅ Theme applied to DOM: ${themeState.actualTheme}`);
	},

	setMetallicBackground: (metallicBackground: MetallicTheme) => {
		console.log(
			`🎨 Metallic background change requested: ${metallicBackground}`
		);

		set((state) => ({
			theme: {
				...state.theme,
				metallicBackground,
			},
		}));

		// Persist to localStorage
		localStorage.setItem('metallicBackground', metallicBackground);
		console.log(
			`💾 Metallic background persisted to localStorage: ${metallicBackground}`
		);

		// Update DOM with new metallic background
		const { theme: themeState } = get();
		updateDOMTheme(themeState.actualTheme, metallicBackground);
		console.log(`✅ Metallic background applied to DOM: ${metallicBackground}`);
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

		const metallicBackground =
			(localStorage.getItem('metallicBackground') as MetallicTheme) || 'titanium';

		set({
			theme: {
				current: initialTheme,
				actualTheme,
				metallicBackground,
			},
		});

		updateDOMTheme(actualTheme, metallicBackground);

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
					updateDOMTheme(newActualTheme, currentTheme.metallicBackground);
				}
			};

			mediaQuery.addEventListener('change', handleChange);
			// Store cleanup function for potential future use
			return () => mediaQuery.removeEventListener('change', handleChange);
		}
	},
});

// Helper function to update DOM theme
function updateDOMTheme(
	theme: ActualTheme,
	metallicBackground?: MetallicTheme
) {
	const body = document.body;
	body.classList.remove('light', 'dark');
	// Remove any existing background classes to ensure override
	const bgClassesToRemove = Array.from(body.classList).filter(
		(cls) =>
			cls.startsWith('bg-') ||
			cls.startsWith('from-') ||
			cls.startsWith('via-') ||
			cls.startsWith('to-')
	);
	bgClassesToRemove.forEach((cls) => body.classList.remove(cls));
	body.classList.add(theme);

	// Apply metallic background based on selection
	const metallicType = metallicBackground || 'titanium';

	if (theme === 'light') {
		applyLightMetallicBackground(body, metallicType);
	} else {
		applyDarkMetallicBackground(body, metallicType);
	}

	// Update meta tag for system components
	document
		.querySelector('meta[name="color-scheme"]')
		?.setAttribute('content', theme);
}

function applyLightMetallicBackground(
	body: HTMLElement,
	metallicType: MetallicTheme
) {
	const gradientClasses = getMetallicGradient(metallicType, 'light');
	body.classList.add(...gradientClasses);
}

function applyDarkMetallicBackground(
	body: HTMLElement,
	metallicType: MetallicTheme
) {
	const gradientClasses = getMetallicGradient(metallicType, 'dark');
	body.classList.add(...gradientClasses);
}

function getMetallicGradient(
	metallicType: MetallicTheme,
	theme: ActualTheme
): string[] {
	const baseClasses = ['bg-gradient-to-br'];

	switch (metallicType) {
		case 'titanium':
			return theme === 'light'
				? [
						...baseClasses,
						'from-gray-200',
						'via-slate-100',
						'via-gray-50',
						'via-blue-50',
						'to-slate-300',
					]
				: [
						...baseClasses,
						'from-gray-800',
						'via-slate-700',
						'via-blue-900',
						'via-gray-800',
						'to-slate-900',
					];

		case 'rainbow':
			// Use custom rainbow metallic utility class instead of Tailwind classes
			return ['bg-rainbow-metallic'];

		default:
			return getMetallicGradient('titanium', theme);
	}
}
