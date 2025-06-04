import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { DebugInfoBlock } from '../components/DebugComponents';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { extractNodeDebugInfo } from '../utils/debugUtils';
import {
	centeredOnEdge,
	evenlySpacedHandles,
	cornerPositions,
} from '../utils/gridHandleUtils';

/**
 * DebugNode using simplified GridNodeHandle components
 */

// Grid configuration for debug node
const DEBUG_NODE_CONFIG = {
	gridWidth: 7,
	gridHeight: 4,
} as const;

export function DebugNode(props: NodeProps) {
	const { id, data, selected = false } = props;

	// Extract debug information using utility function (separation of concerns)
	const debugInfo = extractNodeDebugInfo(props);

	// Use custom hook for node operations (Container/Presenter pattern)
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	return (
		<BaseNode
			variant='debug'
			gridWidth={DEBUG_NODE_CONFIG.gridWidth}
			gridHeight={DEBUG_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={`Debug Node - ${(data as { label?: string })?.label || id}`}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Demo Block to show the grid system working */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={0}
					gridY={1.5}
					variant='audio'
					showDimensions={false}
				>
					<div className='w-full h-full flex items-center justify-center p-1'>
						<span className='text-xs font-medium'>Grid Demo</span>
					</div>
				</GridBlock>

				{/* Identity Information Block */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={4}
					gridY={1.5}
					variant='primary'
					showDimensions={false}
				>
					<DebugInfoBlock
						title='Identity'
						info={debugInfo.identity}
					/>
				</GridBlock>
			</div>

			{/* GRID-BASED HANDLE POSITIONING EXAMPLES */}

			{/* Example 1: Centered on right edge using grid utilities */}
			<GridNodeHandle
				id={`${id}-output-right-centered`}
				type='source'
				position={Position.Right}
				{...centeredOnEdge(
					DEBUG_NODE_CONFIG.gridWidth,
					DEBUG_NODE_CONFIG.gridHeight,
					'right'
				)}
				color='success'
			/>

			{/* Example 2: Multiple handles evenly spaced on top edge */}
			{evenlySpacedHandles(
				DEBUG_NODE_CONFIG.gridWidth,
				DEBUG_NODE_CONFIG.gridHeight,
				'top',
				3
			).map((pos, index) => (
				<GridNodeHandle
					key={`top-${index}`}
					id={`${id}-input-top-${index}`}
					type='target'
					position={Position.Top}
					{...pos}
					color='primary'
					size='sm'
				/>
			))}

			{/* Example 3: Corner handle (bottom-left) */}
			<GridNodeHandle
				id={`${id}-corner-bottom-left`}
				type='target'
				position={Position.Left}
				{...cornerPositions(
					DEBUG_NODE_CONFIG.gridWidth,
					DEBUG_NODE_CONFIG.gridHeight
				).bottomLeft}
				color='warning'
			/>

			{/* Example 4: Precise grid positioning with fractional offset */}
			<GridNodeHandle
				id={`${id}-precise-position`}
				type='source'
				position={Position.Bottom}
				gridX={2}
				gridY={3}
				color='error'
				size='lg'
			/>
		</BaseNode>
	);
}
