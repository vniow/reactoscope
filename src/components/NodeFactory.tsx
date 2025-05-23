import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNodeStore } from '../store/nodeStore';
import { getNodeCategories } from '../types/nodes';

export default function NodeFactory() {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const reactFlowInstance = useReactFlow();
	const { addNode } = useNodeStore();

	const nodeCategories = getNodeCategories();
	const categoryKeys = Object.keys(nodeCategories);

	const handleAddNode = (nodeKey: string) => {
		// Get viewport center or default to a position
		const center = reactFlowInstance?.screenToFlowPosition({
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		}) || { x: 100, y: 100 };

		// Add some randomness to prevent overlapping
		const randomOffset = {
			x: center.x + (Math.random() - 0.5) * 100,
			y: center.y + (Math.random() - 0.5) * 100,
		};

		addNode(nodeKey, randomOffset);
		setIsOpen(false);
	};

	const toggleFactory = () => {
		setIsOpen(!isOpen);
		setSelectedCategory(null);
	};

	if (!isOpen) {
		return (
			<div className='fixed top-4 left-4 z-50'>
				<button
					onClick={toggleFactory}
					className='px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl'
				>
					+ Add Node
				</button>
			</div>
		);
	}

	return (
		<div className='fixed top-4 left-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[300px] max-w-[400px]'>
			{/* Header */}
			<div className='flex justify-between items-center mb-4'>
				<h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200'>
					Add Node
				</h3>
				<button
					onClick={toggleFactory}
					className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl'
				>
					×
				</button>
			</div>

			{/* Category Selection */}
			{!selectedCategory && (
				<div className='space-y-2'>
					<p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
						Choose a category:
					</p>
					{categoryKeys.map((category) => (
						<button
							key={category}
							onClick={() => setSelectedCategory(category)}
							className='w-full px-3 py-2 text-left rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-800 dark:text-gray-200 capitalize'
						>
							{category} ({nodeCategories[category].length})
						</button>
					))}
				</div>
			)}

			{/* Node Selection */}
			{selectedCategory && (
				<div className='space-y-2'>
					<div className='flex items-center gap-2 mb-3'>
						<button
							onClick={() => setSelectedCategory(null)}
							className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
						>
							← Back
						</button>
						<p className='text-sm text-gray-600 dark:text-gray-400 capitalize'>
							{selectedCategory} nodes:
						</p>
					</div>
					{nodeCategories[selectedCategory].map(({ key, registration }) => (
						<button
							key={key}
							onClick={() => handleAddNode(key)}
							className='w-full px-3 py-2 text-left rounded-md bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-800/30 dark:hover:to-purple-800/30 transition-all border border-blue-200 dark:border-blue-700 text-gray-800 dark:text-gray-200'
						>
							<div className='font-medium'>{registration.displayName}</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
