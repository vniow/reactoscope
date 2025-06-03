import {
	Position,
	type NodeProps,
	useReactFlow,
	// useNodes,
	// useEdges,
	// useUpdateNodeInternals,
	Handle,
} from '@xyflow/react';
import { useState } from 'react';

import { type DebugNodeData } from './types';
import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock'; // Keep for other info blocks
// import { NodeHandle } from '../components/NodeHandle';
import { GridButton } from '../components/ui/GridButton'; // Added
import { GridSlider } from '../components/ui/GridSlider'; // Added

export function DebugNode(props: NodeProps<DebugNodeData>) {
	const {
		id,
		type,
		positionAbsoluteX, // Available for the current node
		positionAbsoluteY, // Available for the current node
		data,
		selected,
		dragging,
		dragHandle,
		width = 0,
		height = 0,
		zIndex,
		isConnectable,
		selectable,
		deletable,
		parentId,
		draggable,
		// sourcePosition and targetPosition props are from the node itself,
		// not what we'll use for dynamic calculation based on connections.
		// We'll manage dynamic positions internally.
		// sourcePosition,
		// targetPosition,
		...otherProps
	} = props;
	// const [targetHandlePosition, setTargetHandlePosition] = useState(
	// 	Position.Top
	// );
	// const [sourceHandlePosition, setSourceHandlePosition] = useState(
	// 	Position.Bottom
	// );

	// const nodes = useNodes();
	// const edges = useEdges();
	// const updateNodeInternals = useUpdateNodeInternals();
	// Get the React Flow instance for node operations
	const reactFlowInstance = useReactFlow();

	// State for interactive UI elements
	const [sliderValue, setSliderValue] = useState(50);
	const [buttonClickCount, setButtonClickCount] = useState(0);

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
		'Absolute Position': `x: ${Math.round(positionAbsoluteX)}, y: ${Math.round(
			positionAbsoluteY
		)}`,
		Dimensions: `${width ? Math.round(width) : 'auto'} × ${
			height ? Math.round(height) : 'auto'
		}`,
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
			gridWidth={9} // Adjusted to ensure all content fits
			gridHeight={12} // Adjusted to ensure all content fits (increased by 0.5)
			nodeId={id}
			selected={selected}
			onDelete={() => {
				reactFlowInstance.setNodes((nodes) =>
					nodes.filter((node) => node.id !== id)
				);
				reactFlowInstance.setEdges((edges) =>
					edges.filter((edge) => edge.source !== id && edge.target !== id)
				);
			}}
			title={`Debug Node - ${data.label || id}`}
		>
			{/* Main GridBlock Layout Container */}
			<div className='relative w-full h-full overflow-visible'>
				{/* State Block - Top left, starts after header */}
				<GridBlock
					gridWidth={3}
					gridHeight={4}
					gridX={0}
					gridY={1}
					variant='secondary'
					showDimensions={false}
					dashSize='lg'
					borderStyle='dotted'
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>State</div>
						{renderInfoBlock(stateInfo)}
					</div>
				</GridBlock>

				{/* Relations Block - Top center */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={3}
					gridY={1}
					variant='audio'
					// dashSize='lg'
					// borderStyle='dotted'
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Relations</div>
						{renderInfoBlock(relationshipInfo)}
					</div>
				</GridBlock>

				{/* Data Object Block - Middle, spans full width */}
				<GridBlock
					gridWidth={9}
					gridHeight={3}
					gridX={0}
					gridY={5}
					variant='default'
					showDimensions={false}
					dashSize='xl'
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

				{/* Interactive Button - Below data block */}
				<GridButton
					gridWidth={3}
					gridHeight={1}
					gridX={0}
					gridY={8}
					variant='primary'
					showDimensions={false}
					showBorder={true}
					transparentBackground={false}
					buttonLabel={`Clicks: ${buttonClickCount}`}
					onClick={() => setButtonClickCount((prev) => prev + 1)}
				/>

				{/* Grid Demo Block - Next to button */}
				{Object.keys(otherProps).length === 0 && (
					<GridBlock
						gridWidth={3}
						gridHeight={1}
						gridX={3}
						gridY={8}
						variant='audio'
						showDimensions={false}
					>
						<div className='w-full h-full flex items-center justify-center p-1'>
							<span className='text-xs font-medium'>Grid Demo</span>
						</div>
					</GridBlock>
				)}

				{/* Identity Info Block - Right of demo block */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={6}
					gridY={8}
					variant='primary'
					showDimensions={false}
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Identity</div>
						{renderInfoBlock(identityInfo)}
					</div>
				</GridBlock>

				{/* Position Info Block - Below identity */}
				<GridBlock
					gridWidth={3}
					gridHeight={2}
					gridX={6}
					gridY={3}
					variant='secondary'
					showDimensions={false}
				>
					<div className='w-full h-full flex flex-col justify-center p-2'>
						<div className='font-semibold text-center mb-1'>Position</div>
						{renderInfoBlock(positionInfo)}
					</div>
				</GridBlock>

				{/* Interactive Slider - Bottom, spans most of width */}
				<GridSlider
					gridWidth={9}
					gridHeight={2}
					gridX={0}
					gridY={10}
					variant='audio'
					showDimensions={false}
					showBorder={true}
					transparentBackground={false}
					label='Value Slider'
					sliderProps={{
						value: sliderValue,
						min: 0,
						max: 100,
						step: 1,
						onChange: (e) => setSliderValue(Number(e.target.value)),
						size: 'lg',
						color: 'orange',
						formatValue: (val) => `${val}%`,
						showMinMax: false,
					}}
				/>
			</div>

			{/* Handles */}
			<Handle
				type='target'
				position={Position.Bottom}
				id='target'
				// variant='debug'
			/>
			<Handle
				type='source'
				position={Position.Top}
				id='source'
				// variant='debug'
			/>
		</BaseNode>
	);
}
