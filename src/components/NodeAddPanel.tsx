import { useState } from 'react';
import { Panel } from '@xyflow/react';
import { useFlowActions } from '../hooks/useFlow';
import { TransportControls } from './TransportControls';
import type { AppNode } from '../nodes/types';

// Define available node types with their display names and descriptions
const nodeTypeOptions = [
	{
		type: 'position-logger' as const,
		name: 'Position Logger',
		description: 'Node that displays position coordinates',
		defaultData: {
			label: 'New Position Node',
		},
	},
	{
		type: 'theme-debug' as const,
		name: 'Theme Debug',
		description: 'Node that shows theme debugging info',
		defaultData: {
			label: 'Theme Debug Info',
		},
	},
	{
		type: 'r3f-debug' as const,
		name: 'R3F Debug',
		description: 'React Three Fiber debug node with rotating box',
		defaultData: {
			label: 'R3F Debug',
		},
	},
	{
		type: 'oscillator' as const,
		name: 'Oscillator',
		description: 'Audio oscillator with frequency and waveform controls',
		defaultData: {
			id: '',
			type: 'oscillator' as const,
			params: {
				frequency: 440,
				detune: 0,
				waveType: 'sine' as const,
				isPlaying: false,
				volume: 0.5,
			},
			label: 'Oscillator',
		},
	},
	{
		type: 'gain' as const,
		name: 'Gain',
		description: 'Volume control with mute functionality',
		defaultData: {
			id: '',
			type: 'gain' as const,
			params: {
				gain: 1.0,
				mute: false,
			},
			label: 'Gain',
		},
	},
	{
		type: 'visualizer' as const,
		name: 'Audio Visualizer',
		description: 'Real-time waveform visualization',
		defaultData: {
			id: '',
			type: 'visualizer' as const,
			params: {
				size: 1024,
				smoothing: 0.8,
				isConnected: false,
			},
			label: 'Visualizer',
		},
	},
	{
		type: 'destination' as const,
		name: 'Audio Destination',
		description: 'Master audio output endpoint',
		defaultData: {
			label: 'Master Out',
		},
	},
];

export function NodeAddPanel() {
	const { addNode } = useFlowActions();
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

		let newNode: AppNode;

		if (
			nodeTypeOption.type === 'oscillator' ||
			nodeTypeOption.type === 'gain' ||
			nodeTypeOption.type === 'visualizer'
		) {
			// Special handling for audio nodes (oscillator, gain, and visualizer)
			newNode = {
				id: nodeId,
				type: nodeTypeOption.type,
				position: {
					x: 100 + randomOffset.x,
					y: 100 + randomOffset.y,
				},
				data: {
					...nodeTypeOption.defaultData,
					id: nodeId, // Set the audio node ID
				},
			} as AppNode;
		} else {
			// Standard handling for other node types
			newNode = {
				id: nodeId,
				type: nodeTypeOption.type,
				position: {
					x: 100 + randomOffset.x,
					y: 100 + randomOffset.y,
				},
				data: { ...nodeTypeOption.defaultData },
			} as AppNode;
		}

		addNode(newNode);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);

		// Collapse the panel after adding a node
		setIsExpanded(false);
	};

	const handleAddTestFlow = () => {
		console.log(
			'🧪 Creating test flow with oscillators connected to visualizer'
		);

		// Create two oscillator nodes
		const osc1: AppNode = {
			id: 'test-osc-1',
			type: 'oscillator',
			position: { x: 0, y: 0 },
			data: {
				id: 'test-osc-1',
				type: 'oscillator' as const,
				params: {
					frequency: 220,
					detune: 0,
					waveType: 'sine' as const,
					isPlaying: false,
					volume: 0.5,
				},
				label: 'Oscillator 1',
			},
		};

		const osc2: AppNode = {
			id: 'test-osc-2',
			type: 'oscillator',
			position: { x: 600, y: 0 },
			data: {
				id: 'test-osc-2',
				type: 'oscillator' as const,
				params: {
					frequency: 220,
					detune: -1,
					waveType: 'square' as const,
					isPlaying: false,
					volume: 0.5,
				},
				label: 'Oscillator 2',
			},
		};

		// Create visualizer node
		const visualizer: AppNode = {
			id: 'test-visualizer',
			type: 'visualizer',
			position: { x: 200, y: 0 },
			data: {
				id: 'test-visualizer',
				type: 'visualizer' as const,
				params: {
					size: 1024,
					smoothing: 0.8,
					isConnected: false,
				},
				label: 'Audio Visualizer',
			},
		};

		// Add nodes first, then edges
		addNode(osc1);
		addNode(osc2);
		addNode(visualizer);

		setTimeout(() => {
			console.log(
				'✅ Test flow created with oscillators connected to visualizer'
			);
		}, 100);
	};

	return (
		<Panel
			position='top-left'
			className='p-4 w-80 max-w-full'
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

				{/* Transport Controls Section */}
				<div className='p-3 border-t border-gray-200 dark:border-gray-700'>
					<TransportControls />
				</div>
			</div>
		</Panel>
	);
}
