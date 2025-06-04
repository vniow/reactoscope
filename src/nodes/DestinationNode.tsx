import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { useToneDestination } from '../hooks/useToneDestination';
import type { DestinationNode } from './types';

export function DestinationNode({
	id,
	data,
	selected,
}: NodeProps<DestinationNode>) {
	// Get the React Flow instance for node management
	const reactFlowInstance = useReactFlow();

	const removeNode = () => {
		reactFlowInstance.setNodes((nodes) =>
			nodes.filter((node) => node.id !== id)
		);
		reactFlowInstance.setEdges((edges) =>
			edges.filter((edge) => edge.source !== id && edge.target !== id)
		);
	};

	// Initialize destination connection management
	const { getConnectedSources } = useToneDestination(id);
	const connectedSources = getConnectedSources();

	return (
		<BaseNode
			variant='audio'
			gridWidth={3}
			gridHeight={2}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Audio Destination'}
		>
			<div className='flex flex-col items-center justify-center h-full'>
				{/* Audio Destination Icon */}
				<div className='text-3xl mb-2'>🔊</div>

				{/* Description */}
				<div className='text-center'>
					<div className='text-sm font-medium text-orange-800 dark:text-orange-200'>
						Master Output
					</div>
					<div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
						Audio destination endpoint
					</div>

					{/* Connection Status */}
					{connectedSources.length > 0 && (
						<div className='text-xs text-green-600 dark:text-green-400 mt-1'>
							{connectedSources.length} source
							{connectedSources.length !== 1 ? 's' : ''} connected
						</div>
					)}
				</div>
			</div>
			{/* Audio input handle centered at top using grid system */}
			<GridNodeHandle
				id={`${id}-audio-in`}
				type='target'
				position={Position.Top}
				gridX={1.5} // Center of 3-unit width (3/2 = 1.5)
				gridY={0} // Top edge
			/>
		</BaseNode>
	);
}
