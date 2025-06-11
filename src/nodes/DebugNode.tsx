import { Position, type NodeProps } from '@xyflow/react';

import { type DebugNode } from './types';
import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { useNodeOperations } from '../hooks/useNodeOperations';

/**
 * Debug Node - Displays node position and connection information
 * Updated with consistent design standards and larger text
 */

// Grid configuration for debug node
const DEBUG_NODE_CONFIG = {
	gridWidth: 6,
	gridHeight: 5,
} as const;

export function DebugNode({
	id,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected = false,
}: NodeProps<DebugNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Format position values
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	return (
		<BaseNode
			variant='unit'
			gridWidth={DEBUG_NODE_CONFIG.gridWidth}
			gridHeight={DEBUG_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Debug Info'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Position Display */}
				<GridBlock
					gridWidth={5}
					gridHeight={3.5}
					gridX={0.5}
					gridY={1}
					showDimensions={false}
					transparentBackground={true}
				>
					<div className='w-full h-full p-3 flex flex-col justify-center items-center'>
						<div className='text-center space-y-2'>
							<h3 className='text-xl font-bold text-red-600 dark:text-red-400 mb-2'>
								🐛 Debug Info
							</h3>
							<div className='space-y-2'>
								<div className='text-lg text-gray-700 dark:text-gray-300'>
									<span className='font-semibold'>X:</span>{' '}
									<span className='font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-lg'>
										{x}px
									</span>
								</div>
								<div className='text-lg text-gray-700 dark:text-gray-300'>
									<span className='font-semibold'>Y:</span>{' '}
									<span className='font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-lg'>
										{y}px
									</span>
								</div>
							</div>
							<div className='text-sm text-red-500 dark:text-red-400 mt-2 font-semibold'>
								Position Tracking
							</div>
						</div>
					</div>
				</GridBlock>
			</div>

			{/* Input handle - grid aligned */}
			<GridNodeHandle
				id={`${id}-debug-in`}
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={DEBUG_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
			{/* Output handle - grid aligned */}
			<GridNodeHandle
				id={`${id}-debug-out`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={DEBUG_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
		</BaseNode>
	);
}
