import { Position, type NodeProps } from '@xyflow/react';

import { type DebugNode } from './types';
import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { NodeHandle } from '../components/NodeHandle';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useFlowActions } from '../hooks/useFlow';

export function DebugNode({
	id,
	type,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected,
	dragging,
	dragHandle,
	width,
	height,
	zIndex,
	isConnectable,
	selectable,
	deletable,
	parentId,
	draggable,
	sourcePosition,
	targetPosition,
	...otherProps
}: NodeProps<DebugNode>) {
	// Get handle positions from the Zustand store, with proper defaults for new nodes
	const targetHandlePosition = useHandlePosition(id, 'target', Position.Top);
	const sourceHandlePosition = useHandlePosition(id, 'source', Position.Bottom);

	// Get the removeNode function from the store
	const { removeNode } = useFlowActions();

	// Format values for display
	const formatValue = (value: unknown): string => {
		if (value === undefined) return 'undefined';
		if (value === null) return 'null';
		if (typeof value === 'boolean') return value.toString();
		if (typeof value === 'number') return `${Math.round(value * 100) / 100}`;
		if (typeof value === 'object') return JSON.stringify(value, null, 1);
		return String(value);
	};

	// Group debug information into logical categories
	const identityInfo = {
		ID: id,
		Type: type,
	};

	const positionInfo = {
		'Absolute Position': `x: ${Math.round(positionAbsoluteX)}, y: ${Math.round(positionAbsoluteY)}`,
		Dimensions: `${width ? Math.round(width) : 'auto'} × ${height ? Math.round(height) : 'auto'}`,
	};

	const stateInfo = {
		Selected: selected,
		Dragging: dragging,
		Draggable: draggable,
		Selectable: selectable,
		Deletable: deletable,
		Connectable: isConnectable,
	};

	const relationshipInfo = {
		'Parent ID': parentId || 'none',
		'Drag Handle': dragHandle || 'none',
		'Z-Index': zIndex,
	};

	const handleInfo = {
		'Source Position': sourcePosition || 'none',
		'Target Position': targetPosition || 'none',
		'Handle Positions': `target: ${targetHandlePosition}, source: ${sourceHandlePosition}`,
	};

	// Helper function to render key-value pairs in a block
	const renderInfoBlock = (info: Record<string, unknown>) => (
		<div className='space-y-1 text-xs'>
			{Object.entries(info).map(([label, value]) => (
				<div
					key={label}
					className='flex flex-col gap-1'
				>
					<span className='font-semibold opacity-70'>{label}:</span>
					<span className='break-all'>{formatValue(value)}</span>
				</div>
			))}
		</div>
	);

	return (
		<BaseNode
			variant='debug'
			gridWidth={9}
			gridHeight={12}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={`Debug Node - ${data.label || id}`}
		>
			{/* Main GridBlock Layout Container */}
			<div className='relative w-full h-full overflow-visible'>
				{/* Identity Block */}
				<GridBlock
					gridWidth={4.25}
					gridHeight={2}
					gridX={0}
					gridY={0.25}
					variant='debug'
					showDimensions
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Identity</div>
						{renderInfoBlock(identityInfo)}
					</div>
				</GridBlock>

				{/* Position Block */}
				<GridBlock
					gridWidth={4.25}
					gridHeight={2}
					gridX={4.25}
					gridY={-1.75}
					variant='primary'
					showDimensions
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Position</div>
						{renderInfoBlock(positionInfo)}
					</div>
				</GridBlock>

				{/* State Block */}
				<GridBlock
					gridWidth={3}
					gridHeight={3}
					gridX={0}
					gridY={-1}
					variant='secondary'
					showDimensions
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>State</div>
						{renderInfoBlock(stateInfo)}
					</div>
				</GridBlock>

				{/* Relationship Block */}
				<GridBlock
					gridWidth={2}
					gridHeight={2}
					gridX={3.5}
					gridY={-2.5}
					variant='audio'
					showDimensions
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Relations</div>
						{renderInfoBlock(relationshipInfo)}
					</div>
				</GridBlock>

				{/* Handle Info Block */}
				<GridBlock
					gridWidth={4}
					gridHeight={2}
					gridX={0}
					gridY={6}
					variant='default'
					showDimensions
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Handles</div>
						{renderInfoBlock(handleInfo)}
					</div>
				</GridBlock>

				{/* Data Object Block */}
				<GridBlock
					gridWidth={5}
					gridHeight={3}
					gridX={0}
					gridY={-4}
					variant='default'
					showDimensions
				>
					<div className='w-full h-full flex flex-col p-2'>
						<div className='font-semibold text-center mb-2'>Data Object</div>
						<div className='flex-1 overflow-auto'>
							<pre className='text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all'>
								{JSON.stringify(data, null, 2)}
							</pre>
						</div>
					</div>
				</GridBlock>

				{/* Grid Demo Block */}
				{Object.keys(otherProps).length === 0 && (
					<GridBlock
						gridWidth={2}
						gridHeight={1}
						gridX={6}
						gridY={-5.5}
						variant='audio'
						showDimensions
					>
						<div className='w-full h-full flex items-center justify-center p-1'>
							<span className='text-xs font-medium'>Grid Demo</span>
						</div>
					</GridBlock>
				)}

				{/* Other Props Block (if any exist) */}
				{Object.keys(otherProps).length > 0 && (
					<GridBlock
						gridWidth={2}
						gridHeight={3}
						gridX={6}
						gridY={-2.5}
						variant='secondary'
						showDimensions
					>
						<div className='w-full h-full flex flex-col p-2'>
							<div className='font-semibold text-center mb-1'>Other Props</div>
							<div className='flex-1 overflow-auto'>
								<pre className='text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all'>
									{JSON.stringify(otherProps, null, 2)}
								</pre>
							</div>
						</div>
					</GridBlock>
				)}
			</div>

			{/* Handles */}
			<NodeHandle
				type='target'
				position={targetHandlePosition}
				id='target'
				variant='debug'
			/>
			<NodeHandle
				type='source'
				position={sourceHandlePosition}
				id='source'
				variant='debug'
			/>
		</BaseNode>
	);
}
