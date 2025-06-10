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
	gridHeight: 7, // Increased height for volume slider
} as const;

export function OscillatorNode({
	id,
	data,
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
			variant={data.variant || 'source'} // Use variant from data, default to source
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
					gridY={1.5}
				>
					<div className='grid grid-cols-4 gap-1 w-full h-full'>
						{waveTypes.map((type) => (
							<button
								key={type}
								className={`text-xs py-0.5 px-1 rounded transition-colors ${
									params.waveType === type
										? 'bg-[var(--node-accent)] text-white'
										: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
								}`}
								onClick={() => handleWaveTypeClick(type)}
								onPointerDown={(e) => e.stopPropagation()} // Prevent node dragging
							>
								{type.substring(0, 4)}
							</button>
						))}
					</div>
				</GridBlock>

				{/* Frequency Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={2.5}
					label='Frequency'
					sliderProps={{
						value: params.frequency,
						min: 80,
						max: 2000,
						step: 1,
						formatValue: formatFrequency,
						onChange: (e) => updateFrequency(Number(e.target.value)),
					}}
				/>

				{/* Detune Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={3.5}
					label='Detune'
					sliderProps={{
						value: params.detune,
						min: -1200,
						max: 1200,
						step: 1,
						formatValue: formatDetune,
						onChange: (e) => updateDetune(Number(e.target.value)),
					}}
				/>

				{/* Volume Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={4.5}
					label='Volume'
					sliderProps={{
						value: params.volume,
						min: -60,
						max: 0,
						step: 1,
						formatValue: formatVolume,
						onChange: (e) => updateVolume(Number(e.target.value)),
					}}
				/>

				{/* Play/Stop Button */}
				<GridButton
					gridWidth={3}
					gridHeight={1}
					gridX={2}
					gridY={5.5}
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
			</div>

			<GridNodeHandle
				id={`${id}-source`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={OSCILLATOR_NODE_CONFIG.gridHeight / 2} // Center vertically
				size='md'
			/>
		</BaseNode>
	);
}
