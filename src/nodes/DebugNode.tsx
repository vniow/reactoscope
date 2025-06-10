import { Position, type NodeProps } from '@xyflow/react';

import { type DebugNode } from './types';
import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { useNodeOperations } from '../hooks/useNodeOperations';

/**
 * Debug Node with Grid-Based Handle Positions
 * Demonstrates static grid-aligned handle positioning for comparison with floating handles
 * Uses unified GridNodeHandle component in static mode
 */

// Grid configuration for static node
const STATIC_NODE_CONFIG = {
	gridWidth: 7,
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
			variant='core'
			gridWidth={STATIC_NODE_CONFIG.gridWidth}
			gridHeight={STATIC_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Static Position Logger'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Position Display */}
				<GridBlock
					gridWidth={5}
					gridHeight={3}
					gridX={1}
					gridY={1}
					/* variant removed */
					showDimensions={false}
				>
					<div className='w-full h-full p-3 flex flex-col justify-center items-center'>
						<div className='text-center space-y-2'>
							<h3 className='text-sm font-bold text-blue-600 dark:text-blue-400'>
								⚓ Static Position
							</h3>
							<div className='space-y-1'>
								<div className='text-xs text-gray-600 dark:text-gray-400'>
									<span className='font-semibold'>X:</span>{' '}
									<span className='font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
										{x}px
									</span>
								</div>
								<div className='text-xs text-gray-600 dark:text-gray-400'>
									<span className='font-semibold'>Y:</span>{' '}
									<span className='font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
										{y}px
									</span>
								</div>
							</div>
							<div className='text-xs text-blue-500 dark:text-blue-400 mt-2 font-semibold'>
								Grid-aligned handle positions
							</div>
						</div>
					</div>
				</GridBlock>
			</div>

			{/* Static Handles - Fixed grid positions (using static mode) */}
			<GridNodeHandle
				id={`${id}-source`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={STATIC_NODE_CONFIG.gridHeight / 2} // Center vertically (5/2 = 2.5)
				/* color removed */
				size='md'
			/>
			<GridNodeHandle
				id={`${id}-target`}
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={STATIC_NODE_CONFIG.gridHeight / 2} // Center vertically (5/2 = 2.5)
				/* color removed */
				size='md'
			/>
		</BaseNode>
	);
}
