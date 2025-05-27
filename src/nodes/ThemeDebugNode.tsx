import { Position, type NodeProps } from '@xyflow/react';
import { useState, useEffect } from 'react';

import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { nodeStyles } from '../utils/nodeStyles';
import { type ThemeDebugNode } from './types';
import { useHandlePosition } from '../hooks/useHandlePositions';

export function ThemeDebugNode({ id, data }: NodeProps<ThemeDebugNode>) {
	const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(false);
	const [documentClasses, setDocumentClasses] = useState<string>('');
	const [localStorageTheme, setLocalStorageTheme] = useState<string | null>(
		null
	);

	// Get handle positions from the Zustand store, fallback to default positions
	const sourcePosition =
		useHandlePosition(id, 'theme-debug-source') || Position.Bottom;

	useEffect(() => {
		// Check system preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		setSystemPrefersDark(mediaQuery.matches);

		// Listen for changes
		const handleChange = (e: MediaQueryListEvent) => {
			setSystemPrefersDark(e.matches);
		};
		mediaQuery.addEventListener('change', handleChange);

		// Check document classes
		const updateDocumentClasses = () => {
			setDocumentClasses(document.documentElement.className);
		};

		// Check localStorage
		const updateLocalStorage = () => {
			setLocalStorageTheme(localStorage.getItem('theme'));
		};

		// Initial reads
		updateDocumentClasses();
		updateLocalStorage();

		// Set up observers for document class changes
		const observer = new MutationObserver(() => {
			updateDocumentClasses();
			updateLocalStorage(); // Re-read localStorage when document class changes
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		// Set up storage event listener for changes from other tabs/windows
		const handleStorageChange = () => {
			updateLocalStorage();
		};
		window.addEventListener('storage', handleStorageChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
			observer.disconnect();
			window.removeEventListener('storage', handleStorageChange);
		};
	}, []);

	return (
		<BaseNode
			variant='debug'
			className='font-mono text-xs overflow-hidden'
			gridWidth={data.gridWidth ?? 4}
			gridHeight={data.gridHeight ?? 4}
		>
			<div className={nodeStyles.text.title}>
				{data.label || 'Theme Debug Info'}
			</div>

			<div className='space-y-2'>
				<div>
					<span className={nodeStyles.text.label}>System Preference:</span>
					<div className={`ml-2 ${nodeStyles.text.body}`}>
						prefers-color-scheme: {systemPrefersDark ? 'dark' : 'light'}
					</div>
				</div>

				<div>
					<span className={nodeStyles.text.label}>Document Classes:</span>
					<div className={`ml-2 ${nodeStyles.text.body} break-all`}>
						{documentClasses || '(none)'}
					</div>
				</div>

				<div>
					<span className={nodeStyles.text.label}>localStorage.theme:</span>
					<div className={`ml-2 ${nodeStyles.text.body}`}>
						{localStorageTheme || '(not set)'}
					</div>
				</div>

				<div>
					<span className={nodeStyles.text.label}>Color Scheme:</span>
					<div className={`ml-2 ${nodeStyles.text.body}`}>
						{getComputedStyle(document.documentElement).colorScheme || 'normal'}
					</div>
				</div>

				<div>
					<span className={nodeStyles.text.label}>Browser UA Dark:</span>
					<div className={`ml-2 ${nodeStyles.text.body}`}>
						{window.matchMedia('(prefers-color-scheme: dark)').matches
							? 'Yes'
							: 'No'}
					</div>
				</div>
			</div>

			<NodeHandle
				id='theme-debug-source'
				type='source'
				position={sourcePosition}
				variant='debug'
			/>
		</BaseNode>
	);
}
