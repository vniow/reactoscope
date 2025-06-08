import { type NodeProps } from '@xyflow/react';

import { type PositionLoggerNode } from './types';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { useNodeOperations } from '../hooks/useNodeOperations';

/**
 * Position Logger Node with Floating Handles
 * Demonstrates floating handle positioning that adapts to connected nodes
 * Uses unified GridNodeHandle component in floating mode
 */

// Grid configuration for position logger
const POSITION_LOGGER_CONFIG = {
	gridWidth: 8,
	gridHeight: 6,
} as const;

export function PositionLoggerNode({
	id,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected = false,
}: NodeProps<PositionLoggerNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Format position values
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	return (
		<BaseNode
			variant='debug'
			gridWidth={POSITION_LOGGER_CONFIG.gridWidth}
			gridHeight={POSITION_LOGGER_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Floating Position Logger'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Position Display */}
				<GridBlock
					gridWidth={6}
					gridHeight={4}
					gridX={1}
					gridY={1}
					variant='debug'
					showDimensions={false}
				>
					<div className='w-full h-full p-3 flex flex-col justify-center items-center'>
						<div className='text-center space-y-2'>
							<h3 className='text-sm font-bold text-pink-600 dark:text-pink-400'>
								🎯 Floating Position
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
							<div className='text-xs text-pink-500 dark:text-pink-400 mt-2 font-semibold'>
								Handles adapt to connections
							</div>
						</div>
					</div>
				</GridBlock>
			</div>

			{/* Floating Handles - Dynamic positioning based on connections */}
			<GridNodeHandle
				id={`${id}-source`}
				type='source'
				mode='floating'
				nodeId={id}
				variant='debug'
				minDistanceThreshold={50}
			/>
			<GridNodeHandle
				id={`${id}-target`}
				type='target'
				mode='floating'
				nodeId={id}
				variant='debug'
				minDistanceThreshold={50}
			/>
		</BaseNode>
	);
}
