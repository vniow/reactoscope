import { type NodeProps, Position } from '@xyflow/react';
import { useCallback, type JSX } from 'react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { useToneDestination } from '../audio/hooks/useToneDestination';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import type { DestinationNode as DestinationNodeType } from './types';

// Grid configuration for destination node
const DESTINATION_NODE_CONFIG = {
	gridWidth: 3,
	gridHeight: 3,
} as const;

/**
 * React component for a Destination audio node in the React Flow graph.
 * Represents the final audio output endpoint where all audio signals are routed.
 * Provides visual feedback for connected sources and manages audio routing to the system output.
 *
 * @param id - The unique identifier of the node.
 * @param data - Data associated with the node, including label and variant.
 * @param selected - Boolean indicating if the node is currently selected.
 * @returns A JSX element representing the destination node.
 */
export function DestinationNode({
	id,
	data,
	selected = false,
}: NodeProps<DestinationNodeType>): JSX.Element {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Initialize destination connection management
	const { getConnectedSources } = useToneDestination(id);

	/**
	 * Handles node deletion with proper cleanup.
	 */
	const handleDelete = useCallback((): void => {
		deleteNode(id);
	}, [deleteNode, id]);

	/**
	 * Gets the current connected sources for display.
	 */
	const connectedSources = getConnectedSources();

	return (
		<BaseNode
			variant='core'
			gridWidth={DESTINATION_NODE_CONFIG.gridWidth}
			gridHeight={DESTINATION_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Audio Destination'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Main content area */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={0}
					gridY={1}
					showBorder={false}
					showDimensions={false}
					transparentBackground={true}
					className='flex flex-col items-center justify-center'
				>
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
				</GridBlock>
			</div>

			{/* Audio input handle centered at top */}
			<GridNodeHandle
				id={`${id}-audio-in`}
				type='target'
				position={Position.Top}
				mode='floating'
				nodeId={id}
				gridX={DESTINATION_NODE_CONFIG.gridWidth / 2} // Center horizontally
				gridY={0} // Top edge
				size='md'
			/>
		</BaseNode>
	);
}
