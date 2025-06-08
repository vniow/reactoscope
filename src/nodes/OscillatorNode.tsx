import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { GridSlider } from '../components/ui/GridSlider';
import { GridButton } from '../components/ui/GridButton';
import { useToneConnections } from '../hooks/useToneConnections';
import { useToneOscillator } from '../hooks/useToneOscillator';
import type { OscillatorNode } from './types';

// Wave type options for the oscillator
const waveTypes = ['sine', 'square', 'triangle', 'sawtooth'] as const;

// Grid configuration for oscillator node
const OSCILLATOR_NODE_CONFIG = {
	gridWidth: 7,
	gridHeight: 6, // Increased height for volume slider
} as const;

export function OscillatorNode({
	id,
	data,
	positionAbsoluteX,
	positionAbsoluteY,
	selected = false,
}: NodeProps<OscillatorNode>) {
	// Tone.js oscillator hook
	const {
		start,
		stop,
		updateFrequency,
		updateDetune,
		updateWaveType,
		updateVolume,
		isPlaying,
		params,
	} = useToneOscillator(id);

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

	// Format position values like the debug node
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	// Create wave type selector buttons
	const handleWaveTypeClick = (type: (typeof waveTypes)[number]) => {
		updateWaveType(type);
	};

	// Format frequency value with Hz
	const formatFrequency = (value: number) => `${value} Hz`;

	// Format detune value with cents
	const formatDetune = (value: number) =>
		`${value > 0 ? '+' : ''}${value} cents`;

	// Format volume value with dB
	const formatVolume = (value: number) => `${value} dB`;

	return (
		<BaseNode
			variant='audio'
			gridWidth={OSCILLATOR_NODE_CONFIG.gridWidth}
			gridHeight={OSCILLATOR_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Oscillator'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Wave Type Buttons - Top Row */}
				<GridBlock
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={0}
					variant='audio'
				>
					<div className='grid grid-cols-4 gap-1 w-full h-full'>
						{waveTypes.map((type) => (
							<GridButton
								key={type}
								gridWidth={1}
								gridHeight={1}
								variant={params.waveType === type ? 'audio' : 'default'}
								buttonLabel={type.substring(0, 4)}
								buttonClassName='text-xs py-0.5 px-1'
								onClick={() => handleWaveTypeClick(type)}
							/>
						))}
					</div>
				</GridBlock>

				{/* Frequency Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={1}
					variant='audio'
					label='Frequency'
					sliderProps={{
						value: params.frequency,
						min: 80,
						max: 2000,
						step: 1,
						formatValue: formatFrequency,
						color: 'blue',
						onChange: (e) => updateFrequency(Number(e.target.value)),
					}}
				/>

				{/* Detune Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={2}
					variant='audio'
					label='Detune'
					sliderProps={{
						value: params.detune,
						min: -1200,
						max: 1200,
						step: 1,
						formatValue: formatDetune,
						color: 'orange',
						onChange: (e) => updateDetune(Number(e.target.value)),
					}}
				/>

				{/* Volume Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={3}
					variant='audio'
					label='Volume'
					sliderProps={{
						value: params.volume,
						min: -60,
						max: 0,
						step: 1,
						formatValue: formatVolume,
						color: 'green',
						onChange: (e) => updateVolume(Number(e.target.value)),
					}}
				/>

				{/* Play/Stop Button */}
				<GridButton
					gridWidth={3}
					gridHeight={1}
					gridX={2}
					gridY={4}
					variant='audio'
					buttonLabel={isPlaying ? '⏹️ Stop' : '▶️ Play'}
					buttonClassName={
						isPlaying
							? 'bg-red-500 hover:bg-red-600'
							: 'bg-green-500 hover:bg-green-600'
					}
					onClick={() => {
						console.log(
							`🎵 Play button clicked for ${id}, isPlaying: ${isPlaying}`
						);
						if (isPlaying) {
							stop();
						} else {
							start();
						}
					}}
				/>

				{/* Position Display */}
				<GridBlock
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={5}
					variant='audio'
					className='flex items-center justify-center'
				>
					<div className='text-xs text-orange-600 dark:text-orange-400'>
						<span className='font-semibold'>Position:</span>{' '}
						<span className='font-mono bg-orange-50 dark:bg-orange-900/30 px-1 rounded'>
							{x},{y}
						</span>
					</div>
				</GridBlock>
			</div>

			{/* Static Handles - Fixed grid positions (using static mode) like the debug node */}
			{/* <GridNodeHandle
				id={`${id}-target`}
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={OSCILLATOR_NODE_CONFIG.gridHeight / 2} // Center vertically
				color='primary'
				size='md'
			/> */}
			<GridNodeHandle
				id={`${id}-source`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={OSCILLATOR_NODE_CONFIG.gridHeight / 2} // Center vertically
				color='primary'
				size='md'
			/>
		</BaseNode>
	);
}
