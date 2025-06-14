/**
 * NoiseWorkletNode - React Flow node component for noise generator worklet
 *
 * This component provides a user interface for controlling a noise generator AudioWorklet
 * within the React Flow canvas.
 */

import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { GridSlider } from '../components/ui/GridSlider';
import { GridButton } from '../components/ui/GridButton';
import { useToneConnections } from '../hooks/useToneConnections';
import { useNoiseWorklet } from '../hooks/useNoiseWorklet';
import type { NoiseWorkletNode } from './types';

// Grid configuration for noise worklet node
const NOISE_WORKLET_NODE_CONFIG = {
	gridWidth: 4,
	gridHeight: 6,
} as const;

export function NoiseWorkletNode({
	id,
	data,
	selected = false,
}: NodeProps<NoiseWorkletNode>) {
	// Noise worklet hook
	const { start, stop, setVolume, isPlaying, isReady, params } =
		useNoiseWorklet(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

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

	// Toggle playback
	const handlePlayToggle = () => {
		if (isPlaying) {
			stop();
		} else {
			start();
		}
	};

	// Format volume value as percentage
	const formatVolume = (value: number) => `${Math.round(value * 100)}%`;

	return (
		<BaseNode
			variant={data.variant || 'source'} // Use variant from data, default to source
			gridWidth={NOISE_WORKLET_NODE_CONFIG.gridWidth}
			gridHeight={NOISE_WORKLET_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Noise Generator'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Play/Stop Button */}
				<GridButton
					gridWidth={3}
					gridHeight={1.2}
					gridX={0.5}
					gridY={1.2}
					buttonLabel={isPlaying ? '⏹️ Stop' : '▶️ Start'}
					variant={isPlaying ? 'secondary' : 'node-variant'}
					size='sm'
					layout='fill'
					onClick={handlePlayToggle}
					disabled={!isReady}
					aria-label={
						isPlaying ? 'Stop noise generation' : 'Start noise generation'
					}
				/>

				{/* Readiness Status Indicator */}
				<div
					className={`absolute text-xs font-mono ${
						isReady ? 'text-green-500' : 'text-yellow-500'
					}`}
					style={{
						left: '0.25rem',
						top: '0.25rem',
					}}
				>
					{isReady ? '●' : '○'}
				</div>

				{/* Volume Control */}
				<GridSlider
					gridWidth={3}
					gridHeight={0.8}
					gridX={0.5}
					gridY={3.0}
					label='Volume'
					sliderProps={{
						value: params.volume,
						min: 0,
						max: 1,
						step: 0.01,
						onChange: (e) => setVolume(parseFloat(e.target.value)),
						formatValue: formatVolume,
						disabled: !isReady,
						'aria-label': 'Volume control',
					}}
					layout='compact'
					showValue={true}
				/>

				{/* Output Handle */}
				<GridNodeHandle
					id='output'
					type='source'
					mode='static'
					position={Position.Right}
					gridX={4}
					gridY={2.5}
					label='Out'
				/>
			</div>
		</BaseNode>
	);
}
