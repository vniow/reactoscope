/**
 * SimpleNoiseWorkletNode - React Flow node component for simple noise generator
 *
 * This component provides a user interface for controlling a simple noise generator
 * within the React Flow canvas, using the direct AudioWorklet approach.
 */

import { useCallback } from 'react';
import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridButton } from '../shared/components/ui/GridButton';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import { useSimpleNoiseWorkletStore } from '../audio/hooks/useSimpleNoiseWorkletStore';
import type { SimpleNoiseWorkletNode } from './types';

// Grid configuration for simple noise worklet node
const SIMPLE_NOISE_WORKLET_NODE_CONFIG = {
	gridWidth: 4,
	gridHeight: 4,
} as const;

/**
 * SimpleNoiseWorkletNode - React Flow node component for simple noise generator
 *
 * @param props - React Flow node properties
 * @returns JSX element representing the simple noise worklet node
 */
export function SimpleNoiseWorkletNode({
	id,
	data,
	selected = false,
}: NodeProps<SimpleNoiseWorkletNode>) {
	// Get simple noise worklet controls
	const { start, stop, setVolume, isPlaying, isReady, params, workletNode } =
		useSimpleNoiseWorkletStore(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Get the React Flow instance for node management
	const reactFlowInstance = useReactFlow();

	const removeNode = useCallback((): void => {
		reactFlowInstance.setNodes((nodes) =>
			nodes.filter((node) => node.id !== id)
		);
		reactFlowInstance.setEdges((edges) =>
			edges.filter((edge) => edge.source !== id && edge.target !== id)
		);
	}, [reactFlowInstance, id]);

	// Toggle playback
	const handlePlayToggle = useCallback(async (): Promise<void> => {
		if (isPlaying) {
			stop();
		} else {
			await start();
		}
	}, [isPlaying, stop, start]);

	// Handle volume changes
	const handleVolumeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newVolume = parseFloat(e.target.value);
			setVolume(newVolume);
		},
		[setVolume]
	);

	// Format volume value as percentage
	const formatVolume = useCallback(
		(value: number): string => `${Math.round(value * 100)}%`,
		[]
	);

	// Auto-connect to destination when ready
	const handleConnectToDestination = useCallback((): void => {
		if (workletNode && isReady) {
			workletNode.toDestination();
			console.log('🔌 Simple noise connected to destination');
		}
	}, [workletNode, isReady]);

	// Input validation after hooks
	if (!id || typeof id !== 'string') {
		console.error('🚨 SimpleNoiseWorkletNode: Invalid id provided', { id });
		return <div>Error: Invalid node ID</div>;
	}

	return (
		<BaseNode
			variant={data.variant || 'source'}
			gridWidth={SIMPLE_NOISE_WORKLET_NODE_CONFIG.gridWidth}
			gridHeight={SIMPLE_NOISE_WORKLET_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Simple Noise'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Play/Stop Button */}
				<GridButton
					gridWidth={2.5}
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
						isPlaying
							? 'Stop simple noise generation'
							: 'Start simple noise generation'
					}
				/>

				{/* Quick Connect Button */}
				<GridButton
					gridWidth={1}
					gridHeight={1.2}
					gridX={3}
					gridY={1.2}
					buttonLabel='🔌'
					variant='secondary'
					size='sm'
					layout='fill'
					onClick={handleConnectToDestination}
					disabled={!isReady}
					aria-label='Connect to speakers'
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
						onChange: handleVolumeChange,
						formatValue: formatVolume,
						disabled: !isReady,
						'aria-label': 'Volume control',
					}}
					layout='compact'
					showValue={true}
				/>
			</div>

			{/* Output Handle */}
			<GridNodeHandle
				id='output'
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={2.5}
				label='Out'
			/>
		</BaseNode>
	);
}
