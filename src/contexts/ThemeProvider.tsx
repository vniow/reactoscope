import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../stores/appStore';

interface ThemeProviderProps {
	children: ReactNode;
}

/**
 * ThemeProvider that uses Zustand store instead of React Context
 * This initializes the theme when the app starts
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
	const initializeTheme = useAppStore((state) => state.initializeTheme);

	useEffect(() => {
		// Initialize theme when the provider mounts
		initializeTheme();
	}, [initializeTheme]);

	return <>{children}</>;
}
