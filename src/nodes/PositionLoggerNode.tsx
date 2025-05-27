import { Position, type NodeProps } from '@xyflow/react';

import { type PositionLoggerNode } from './types';
import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useNodes } from '../hooks/useAppStore';

export function PositionLoggerNode({
	id,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected,
}: NodeProps<PositionLoggerNode>) {
	const x = `${Math.round(positionAbsoluteX)}px`;
	const y = `${Math.round(positionAbsoluteY)}px`;

	// Get handle positions from the Zustand store, with proper defaults for new nodes
	const targetPosition = useHandlePosition(id, 'target', Position.Top);
	const sourcePosition = useHandlePosition(id, 'source', Position.Bottom);

	// Get the removeNode function from the store
	const { removeNode } = useNodes();

	return (
		<BaseNode
			variant='primary'
			gridWidth={data.gridWidth ?? 3}
			gridHeight={data.gridHeight ?? 3}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label}
		>
			<div className='text-sm text-gray-600 dark:text-gray-400 font-mono'>
				{x}, {y}
			</div>

			<NodeHandle
				id='target'
				type='target'
				position={targetPosition}
				variant='primary'
			/>
			<NodeHandle
				id='source'
				type='source'
				position={sourcePosition}
				variant='primary'
			/>
		</BaseNode>
	);
}
