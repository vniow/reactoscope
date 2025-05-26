import { Position, type NodeProps } from '@xyflow/react';

import { type PositionLoggerNode } from './types';
import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';

export function PositionLoggerNode({
	positionAbsoluteX,
	positionAbsoluteY,
	data,
}: NodeProps<PositionLoggerNode>) {
	const x = `${Math.round(positionAbsoluteX)}px`;
	const y = `${Math.round(positionAbsoluteY)}px`;

	// Get handle positions from data, fallback to default positions
	const targetPosition = data.handlePositions?.['target'] || Position.Top;
	const sourcePosition = data.handlePositions?.['source'] || Position.Bottom;

	return (
		<BaseNode
			variant='primary'
			gridWidth={data.gridWidth ?? 3}
			gridHeight={data.gridHeight ?? 3}
		>
			<div className='font-semibold font-mono text-gray-900 dark:text-gray-100 mb-2'>
				{data.label}
			</div>

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
