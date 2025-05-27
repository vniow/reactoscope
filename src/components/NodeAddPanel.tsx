import React, { useState } from 'react';
import { Panel, type Edge } from '@xyflow/react';
import { useFlowActions } from '../hooks/useFlow';
import type { AppNode } from '../nodes/types';

// Define available node types with their display names and descriptions
const nodeTypeOptions = [
	{
		type: 'position-logger' as const,
		name: 'Position Logger',
		description: 'Node that displays position coordinates',
		defaultData: {
			label: 'New Position Node',
			gridWidth: 3,
			gridHeight: 2,
		},
	},
	{
		type: 'theme-debug' as const,
		name: 'Theme Debug',
		description: 'Node that shows theme debugging info',
		defaultData: {
			label: 'Theme Debug Info',
			gridWidth: 4,
			gridHeight: 4,
		},
	},
];

export const NodeAddPanel: React.FC = () => {
	const { addNode, addEdge } = useFlowActions();
	const [isExpanded, setIsExpanded] = useState(false);

	const handleAddNode = (nodeTypeOption: (typeof nodeTypeOptions)[number]) => {
		// Generate a unique ID for the new node
		const nodeId = `node-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2, 8)}`;

		// Create position with some randomness to avoid overlap
		const randomOffset = {
			x: Math.random() * 200,
			y: Math.random() * 200,
		};

		const newNode: AppNode = {
			id: nodeId,
			type: nodeTypeOption.type,
			position: {
				x: 100 + randomOffset.x,
				y: 100 + randomOffset.y,
			},
			data: { ...nodeTypeOption.defaultData },
		};

		addNode(newNode);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);

		// Collapse the panel after adding a node
		setIsExpanded(false);
	};

	const handleAddTestFlow = () => {
		console.log('🧪 Creating test flow with connected nodes');

		// Create two connected nodes
		const node1: AppNode = {
			id: 'test-node-1',
			type: 'position-logger',
			position: { x: 100, y: 100 },
			data: { label: 'Source Node', gridWidth: 3, gridHeight: 2 },
		};

		const node2: AppNode = {
			id: 'test-node-2',
			type: 'position-logger',
			position: { x: 400, y: 200 },
			data: { label: 'Target Node', gridWidth: 3, gridHeight: 2 },
		};

		const edge: Edge = {
			id: 'test-edge-1',
			source: 'test-node-1',
			target: 'test-node-2',
			type: 'floating',
			sourceHandle: 'source',
			targetHandle: 'target',
			animated: true,
		};

		// Add nodes first, then edge
		addNode(node1);
		addNode(node2);
		setTimeout(() => {
			addEdge(edge);
			console.log('✅ Test flow created');
		}, 100);
	};

	return (
		<Panel
			position='top-left'
			className='m-4'
		>
			<div className='bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg'>
				{/* Header */}
				<div className='flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700'>
					<h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
						<span className='text-lg'>➕</span>
						Add Node
					</h3>
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
						title={isExpanded ? 'Collapse' : 'Expand'}
					>
						<svg
							className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
								isExpanded ? 'rotate-180' : ''
							}`}
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M19 9l-7 7-7-7'
							/>
						</svg>
					</button>
				</div>

				{/* Expandable Content */}
				{isExpanded && (
					<div className='p-3'>
						<p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
							Select a node type to add to the flow:
						</p>
						<div className='space-y-2'>
							{nodeTypeOptions.map((option) => (
								<button
									key={option.type}
									onClick={() => handleAddNode(option)}
									className='w-full text-left p-3 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group'
								>
									<div className='font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'>
										{option.name}
									</div>
									<div className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
										{option.description}
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Collapsed Quick Add Buttons */}
				{!isExpanded && (
					<div className='p-3'>
						<div className='flex gap-2'>
							{nodeTypeOptions.map((option) => (
								<button
									key={option.type}
									onClick={() => handleAddNode(option)}
									className='px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
									title={`Add ${option.name}`}
								>
									{option.name.split(' ')[0]}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Test Flow Button */}
				<div className='p-3 border-t border-gray-200 dark:border-gray-700'>
					<button
						onClick={handleAddTestFlow}
						className='w-full px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors flex items-center justify-center gap-2'
						title='Create Test Flow'
					>
						<span className='text-lg'>🧪</span>
						Create Test Flow
					</button>
				</div>
			</div>
		</Panel>
	);
};
