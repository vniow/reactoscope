import { Controls, ControlButton } from '@xyflow/react';
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function FlowControls() {
	const [theme, setTheme] = useState<Theme>('system');

	// Apply theme function - moved outside useEffect to avoid recreation
	const applyTheme = useCallback((newTheme: Theme) => {
		// Remove any existing theme classes
		document.documentElement.classList.remove('light', 'dark');

		if (newTheme === 'system') {
			// Check system preference
			const systemPrefersDark = window.matchMedia(
				'(prefers-color-scheme: dark)'
			).matches;
			document.documentElement.classList.add(
				systemPrefersDark ? 'dark' : 'light'
			);
		} else {
			// Apply the selected theme
			document.documentElement.classList.add(newTheme);
		}

		// Save to localStorage
		localStorage.setItem('theme', newTheme);

		// Log for debugging
		console.log(
			`Theme applied: ${newTheme}, HTML classes: ${document.documentElement.className}`
		);
	}, []);

	// Initialize theme from localStorage on component mount
	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') as Theme;
		if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
			console.log(`Loading saved theme: ${savedTheme}`);
			setTheme(savedTheme);
			applyTheme(savedTheme);
		} else {
			console.log('No saved theme, defaulting to system');
			applyTheme('system');
		}
	}, [applyTheme]); // Empty dependency - run once on mount

	// Handle theme changes and system theme changes
	useEffect(() => {
		const darkModeMediaQuery = window.matchMedia(
			'(prefers-color-scheme: dark)'
		);

		// Handle system theme change
		const handleSystemThemeChange = (e: MediaQueryListEvent) => {
			console.log(`System theme changed: ${e.matches ? 'dark' : 'light'}`);
			// Only update if we're in system mode
			if (theme === 'system') {
				document.documentElement.classList.remove('light', 'dark');
				document.documentElement.classList.add(e.matches ? 'dark' : 'light');
				console.log(`Applied system theme: ${e.matches ? 'dark' : 'light'}`);
			}
		};

		// Add listener for system changes
		darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);

		return () => {
			darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
		};
	}, [theme]); // Re-run when theme changes

	// Apply theme whenever theme state changes
	useEffect(() => {
		console.log(`Theme state changed to: ${theme}`);
		applyTheme(theme);
	}, [theme, applyTheme]);

	const cycleTheme = () => {
		const nextTheme =
			theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
		console.log(`Cycling theme from ${theme} to ${nextTheme}`);
		setTheme(nextTheme);
	};

	// Get the icon based on current theme
	const getThemeIcon = () => {
		switch (theme) {
			case 'light':
				return '☀️';
			case 'dark':
				return '🌙';
			case 'system':
				return '⚙️';
		}
	};

	// Render the control buttons
	return (
		<div className='shadow-lg'>
			<Controls
				className='flex gap-2 p-3 bg-white/90 dark:bg-gray-900/90 rounded-md backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200'
				showFitView={true}
				showZoom={true}
				showInteractive={true}
			>
				{/* Theme toggle button */}
				<ControlButton
					className='w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-teal-500 dark:from-blue-600 dark:to-teal-700 text-white text-xl hover:from-blue-500 hover:to-teal-600 dark:hover:from-blue-700 dark:hover:to-teal-800 transition-all duration-200 shadow-md'
					title={`Theme: ${theme} (Click to cycle: Light → Dark → System)`}
					onClick={cycleTheme}
				>
					{getThemeIcon()}
				</ControlButton>
			</Controls>
		</div>
	);
}
