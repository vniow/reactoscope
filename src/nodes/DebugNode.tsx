import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { DebugInfoBlock } from '../components/DebugComponents';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { extractNodeDebugInfo } from '../utils/debugUtils';

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

			{/* SIMPLE GRID-BASED HANDLE POSITIONING */}

			{/* Handle 1: Top-left position */}
			<GridNodeHandle
				id={`${id}-handle-1`}
				type='target'
				position={Position.Top}
				gridX={0}
				gridY={0}
				color='primary'
				size='md'
			/>

			{/* Handle 2: Right-center position */}
			<GridNodeHandle
				id={`${id}-handle-2`}
				type='source'
				position={Position.Right}
				gridX={0}
				gridY={2}
				color='success'
				size='lg'
			/>

			{/* Handle 3: Bottom-center position */}
			<GridNodeHandle
				id={`${id}-handle-3`}
				type='source'
				position={Position.Bottom}
				gridX={3.5}
				gridY={0}
				color='error'
				size='lg'
			/>
		</BaseNode>
	);
}
