import { Controls, ControlButton, useReactFlow } from '@xyflow/react';
import { useState, useEffect, useCallback } from 'react';
import { useNodeStore } from '../store/nodeStore';

type Theme = 'light' | 'dark' | 'system';

export default function FlowControls() {
	const [theme, setTheme] = useState<Theme>('system');

	// Initialize theme from localStorage on component mount and observe system theme changes
	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') as Theme;
		if (savedTheme) {
			setTheme(savedTheme);
			applyTheme(savedTheme);
		}

		// Create media query for dark mode preference
		const darkModeMediaQuery = window.matchMedia(
			'(prefers-color-scheme: dark)'
		);

		// Define handler for system theme change
		const handleSystemThemeChange = (e: MediaQueryListEvent) => {
			if (theme === 'system') {
				document.documentElement.classList.remove('light', 'dark');
				document.documentElement.classList.add(e.matches ? 'dark' : 'light');
			}
		};

		// Add listener for system theme changes
		darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);

		// Cleanup listener when component unmounts
		return () => {
			darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
		};
	}, [theme]);

	const applyTheme = (newTheme: Theme) => {
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
	};

	const cycleTheme = () => {
		const nextTheme =
			theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
		setTheme(nextTheme);
		applyTheme(nextTheme);
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

	// Get the ReactFlow instance to access viewport information
	const reactFlowInstance = useReactFlow();
	const { addNode } = useNodeStore();
	
	// Add a node to the center of the current viewport
	const addDebugNode = useCallback(() => {
		// Get viewport center or default to a position
		const center = reactFlowInstance?.screenToFlowPosition({
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		}) || { x: 100, y: 100 };
		
		// Add the new debug node via our store
		addNode('debugNode', center);
	}, [reactFlowInstance, addNode]);
	
	// Render the control buttons
	return (
		<div className='shadow-lg'>
			<Controls
				className='flex gap-2 p-3 bg-white/80 dark:bg-gray-900/80 rounded-md'
				showFitView={true}
				showZoom={true}
				showInteractive={true}
			>
				{/* Theme toggle button */}
				<ControlButton
					className='w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-teal-500 text-white text-xl hover:from-blue-500 hover:to-teal-600 transition-all'
					title={`Theme: ${theme}`}
					onClick={cycleTheme}
				>
					{getThemeIcon()}
				</ControlButton>
				
				{/* Add Debug Node button */}
				<ControlButton
					className='w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-red-500 text-white text-xl hover:from-pink-500 hover:to-red-600 transition-all'
					title="Add Debug Node"
					onClick={addDebugNode}
				>
					🔍
				</ControlButton>
				
				{/* We can add more node type buttons later */}
			</Controls>
		</div>
	);
}
