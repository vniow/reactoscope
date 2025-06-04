import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { Slider } from '../components/ui';
import { useToneGain } from '../hooks/useToneGain';
import { useToneConnections } from '../hooks/useToneConnections';
import { centeredOnEdge } from '../utils/gridHandleUtils';
import type { GainNode } from './types';

// Grid configuration for gain node
const GAIN_NODE_CONFIG = {
	gridWidth: 3,
	gridHeight: 4,
} as const;

export function GainNode({ id, data, selected }: NodeProps<GainNode>) {
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

	// Initialize gain controls
	const { updateGain, updateMute, params } = useToneGain(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	const handleMuteToggle = () => {
		updateMute(!params.mute);
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		e.stopPropagation();
	};

	return (
		<BaseNode
			variant='audio'
			gridWidth={GAIN_NODE_CONFIG.gridWidth}
			gridHeight={GAIN_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Gain'}
		>
			<div className='flex flex-col h-full justify-center p-2 space-y-3'>
				{/* Gain Icon */}
				<div className='text-center'>
					<div className='text-2xl mb-1'>🎚️</div>
					<div className='text-xs text-gray-600 dark:text-gray-400'>
						Volume Control
					</div>
				</div>

				{/* Gain Slider */}
				<Slider
					label='Gain'
					value={params.gain}
					min={0}
					max={2}
					step={0.01}
					formatValue={(val) => val.toFixed(2)}
					onChange={(e) => updateGain(parseFloat(e.target.value))}
					disabled={params.mute}
					showMinMax={true}
				/>

				{/* Mute Button */}
				<button
					onClick={handleMuteToggle}
					onPointerDown={handlePointerDown}
					className={`nodrag px-3 py-1 rounded text-xs font-medium transition-colors ${
						params.mute
							? 'bg-red-500 hover:bg-red-600 text-white'
							: 'bg-gray-500 hover:bg-gray-600 text-white'
					}`}
				>
					{params.mute ? '🔇 Muted' : '🔊 Active'}
				</button>

				{/* Gain Level Indicator */}
				<div className='text-center'>
					<div className='text-xs text-orange-600 dark:text-orange-400'>
						{params.mute ? 'MUTED' : `${Math.round(params.gain * 100)}%`}
					</div>
				</div>
			</div>{' '}
			{/* Input handle - centered at top using grid system */}
			<GridNodeHandle
				id={`${id}-audio-in`}
				type='target'
				position={Position.Top}
				{...centeredOnEdge(
					GAIN_NODE_CONFIG.gridWidth,
					GAIN_NODE_CONFIG.gridHeight,
					'top'
				)}
				color='primary'
			/>
			{/* Output handle - centered at bottom using grid system */}
			<GridNodeHandle
				id={`${id}-audio-out`}
				type='source'
				position={Position.Bottom}
				{...centeredOnEdge(
					GAIN_NODE_CONFIG.gridWidth,
					GAIN_NODE_CONFIG.gridHeight,
					'bottom'
				)}
				color='success'
			/>
		</BaseNode>
	);
}
