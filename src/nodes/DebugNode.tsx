import { Position, type NodeProps } from '@xyflow/react';

import { type DebugNode } from './types';
import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';

/**
 * Debug Node - Displays node position and connection information
 * Updated with consistent design standards and larger text
 */

export function DebugNode({
	id,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected = false,
}: NodeProps<DebugNode>) {
	// Format position values
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	return (
		<BaseNode
			variant='unit'
			nodeId={id as string}
			selected={selected}
			title={data.label || 'Debug Info'}
			className="w-grid-4 h-grid-3" // 4×3 grid units (256px × 192px)
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Position Display */}
				<GridBlock
					className="p-3 w-full h-full"
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

			{/* Input handle - left side */}
			<GridNodeHandle
				id={`${id}-debug-in`}
				type='target'
				position={Position.Left}
				size='md'
			/>
			{/* Output handle - right side */}
			<GridNodeHandle
				id={`${id}-debug-out`}
				type='source'
				position={Position.Right}
				size='md'
			/>
		</BaseNode>
	);
}
