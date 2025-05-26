import React from 'react';
import { useTheme, useFlowState, useNodes } from '../hooks/useAppStore';

/**
 * Debug component to verify Phase 1 & 2 Zustand store functionality
 */
export const StoreDebugPanel: React.FC = () => {
	const { theme, actualTheme, setTheme } = useTheme();
	const { nodes, edges, handlePositions } = useFlowState();
	const { addNode } = useNodes();

	const handleThemeTest = () => {
		const themes = ['light', 'dark', 'system'] as const;
		const currentIndex = themes.indexOf(theme);
		const nextTheme = themes[(currentIndex + 1) % themes.length];
		setTheme(nextTheme);
		console.log(`Theme changed from ${theme} to ${nextTheme}`);
	};

	const handleAddTestNode = () => {
		// Prompt user for node type
		const nodeTypes = ['position-logger', 'theme-debug'] as const;
		const selectedType = prompt(
			`Select node type:\n${nodeTypes
				.map((type, i) => `${i + 1}. ${type}`)
				.join('\n')}\n\nEnter number (1-${nodeTypes.length}):`
		);

		if (!selectedType) {
			console.log('Node creation cancelled');
			return;
		}

		const typeIndex = parseInt(selectedType) - 1;
		if (typeIndex < 0 || typeIndex >= nodeTypes.length) {
			console.log('Invalid node type selection');
			return;
		}

		const nodeType = nodeTypes[typeIndex];
		const testNode = {
			id: `test-${Date.now()}`,
			type: nodeType,
			position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
			data: {
				label: `Test ${nodeType} ${Date.now()}`,
				gridWidth: 3,
				gridHeight: 2,
			},
		};

		addNode(testNode);
		console.log('Added test node:', testNode);
	};

	return (
		<div className='fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg z-50 max-w-sm'>
			<h3 className='font-bold text-lg mb-3 text-gray-900 dark:text-white'>
				🐛 Store Debug Panel
			</h3>

			{/* Phase 1 & 2: Theme State Debug */}
			<div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded'>
				<h4 className='font-semibold text-blue-800 dark:text-blue-200 mb-2'>
					Phase 2: Theme State ✅
				</h4>
				<div className='text-sm space-y-1'>
					<div>
						Current:{' '}
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{theme}
						</code>
					</div>
					<div>
						Actual:{' '}
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{actualTheme}
						</code>
					</div>
					<button
						onClick={handleThemeTest}
						className='mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600'
					>
						Cycle Theme
					</button>
				</div>
			</div>

			{/* Phase 1: Store Structure Debug */}
			<div className='mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded'>
				<h4 className='font-semibold text-green-800 dark:text-green-200 mb-2'>
					Phase 1: Store Structure ✅
				</h4>
				<div className='text-sm space-y-1'>
					<div>
						Nodes:{' '}
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{nodes.length}
						</code>
					</div>
					<div>
						Edges:{' '}
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{edges.length}
						</code>
					</div>
					<div>
						Handle Positions:{' '}
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{Object.keys(handlePositions).length}
						</code>
					</div>
					<div className='flex gap-1 mt-2'>
						<button
							onClick={handleAddTestNode}
							className='px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600'
						>
							Add Node
						</button>
					</div>
				</div>
			</div>

			{/* Phase 3 Preview */}
			<div className='p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded'>
				<h4 className='font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>
					Phase 3: Flow Migration 🚧
				</h4>
				<div className='text-sm text-yellow-700 dark:text-yellow-300'>
					Ready to migrate React Flow hooks to store
				</div>
			</div>

			<div className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
				Check browser console for detailed logs
			</div>
		</div>
	);
};
