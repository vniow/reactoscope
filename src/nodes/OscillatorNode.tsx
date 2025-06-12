import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { GridSlider } from '../components/ui/GridSlider';
import { GridButton } from '../components/ui/GridButton';
import { useToneConnections } from '../hooks/useToneConnections';
import { useToneOscillator } from '../hooks/useToneOscillator';
import type { OscillatorNode } from './types';

// Wave type options for the oscillator (used for type checking)
type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

// Grid configuration for oscillator node
const OSCILLATOR_NODE_CONFIG = {
	gridWidth: 5,
	gridHeight: 8.5, // Optimized for SVG wave buttons and controls
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
	const handleWaveTypeClick = (type: WaveType) => {
		updateWaveType(type);
	};

	// Format frequency value with Hz
	const formatFrequency = (value: number) => `${value} Hz`;

	// Format detune value with cents
	const formatDetune = (value: number) =>
		`${value > 0 ? '+' : ''}${value} cents`;

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
				{/* Wave Type Selection - 2x2 Grid Layout with SVG Icons */}
				{/* 
					Enhanced wave type buttons with:
					- SVG icons for better scaling and visual quality
					- Optimized grid positioning to fill available space
					- Accessible labels for screen readers
					- Variant-aware styling (highlighted when selected)
					- vectorEffect="non-scaling-stroke" for consistent line width
				*/}
				{/* Top Row */}
				<GridButton
					gridWidth={2.25}
					gridHeight={1.3}
					gridX={0.375}
					gridY={1.0}
					buttonLabel=''
					variant={params.waveType === 'sine' ? 'node-variant' : 'secondary'}
					size='sm'
					layout='fill'
					onClick={() => handleWaveTypeClick('sine')}
					aria-label='Select sine wave'
					icon={
						<svg
							viewBox='0 0 48 24'
							className='w-full h-full'
							style={{ minWidth: '24px', minHeight: '12px' }}
						>
							<path
								d='M4 12 Q12 4 20 12 T36 12'
								stroke='currentColor'
								strokeWidth='2.5'
								fill='none'
								strokeLinecap='round'
								strokeLinejoin='round'
								vectorEffect='non-scaling-stroke'
							/>
						</svg>
					}
				/>

				<GridButton
					gridWidth={2.25}
					gridHeight={1.3}
					gridX={2.625}
					gridY={1.0}
					buttonLabel=''
					variant={params.waveType === 'square' ? 'node-variant' : 'secondary'}
					size='sm'
					layout='fill'
					onClick={() => handleWaveTypeClick('square')}
					aria-label='Select square wave'
					icon={
						<svg
							viewBox='0 0 48 24'
							className='w-full h-full'
							style={{ minWidth: '24px', minHeight: '12px' }}
						>
							<path
								d='M4 18 L4 6 L12 6 L12 18 L20 18 L20 6 L28 6 L28 18 L36 18'
								stroke='currentColor'
								strokeWidth='2.5'
								fill='none'
								strokeLinecap='round'
								strokeLinejoin='round'
								vectorEffect='non-scaling-stroke'
							/>
						</svg>
					}
				/>

				{/* Bottom Row */}
				<GridButton
					gridWidth={2.25}
					gridHeight={1.3}
					gridX={0.375}
					gridY={2.3}
					buttonLabel=''
					variant={
						params.waveType === 'triangle' ? 'node-variant' : 'secondary'
					}
					size='sm'
					layout='fill'
					onClick={() => handleWaveTypeClick('triangle')}
					aria-label='Select triangle wave'
					icon={
						<svg
							viewBox='0 0 48 24'
							className='w-full h-full'
							style={{ minWidth: '24px', minHeight: '12px' }}
						>
							<path
								d='M4 18 L12 6 L20 18 L28 6 L36 18'
								stroke='currentColor'
								strokeWidth='2.5'
								fill='none'
								strokeLinecap='round'
								strokeLinejoin='round'
								vectorEffect='non-scaling-stroke'
							/>
						</svg>
					}
				/>

				<GridButton
					gridWidth={2.25}
					gridHeight={1.3}
					gridX={2.625}
					gridY={2.3}
					buttonLabel=''
					variant={
						params.waveType === 'sawtooth' ? 'node-variant' : 'secondary'
					}
					size='sm'
					layout='fill'
					onClick={() => handleWaveTypeClick('sawtooth')}
					aria-label='Select sawtooth wave'
					icon={
						<svg
							viewBox='0 0 48 24'
							className='w-full h-full'
							style={{ minWidth: '24px', minHeight: '12px' }}
						>
							<path
								d='M4 18 L12 6 L12 18 L20 6 L20 18 L28 6 L28 18 L36 6'
								stroke='currentColor'
								strokeWidth='2.5'
								fill='none'
								strokeLinecap='round'
								strokeLinejoin='round'
								vectorEffect='non-scaling-stroke'
							/>
						</svg>
					}
				/>

				{/* Frequency Slider */}
				<GridSlider
					gridWidth={4.5}
					gridHeight={2}
					gridX={0.25}
					gridY={3.5}
					label='Frequency'
					layout='stacked'
					textSize='lg'
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
					gridWidth={4.5}
					gridHeight={2}
					gridX={0.25}
					gridY={5.5}
					label='Detune'
					layout='stacked'
					textSize='lg'
					sliderProps={{
						value: params.detune,
						min: -1200,
						max: 1200,
						step: 1,
						formatValue: formatDetune,
						onChange: (e) => updateDetune(Number(e.target.value)),
					}}
				/>

				{/* Play/Stop Button */}
				<GridButton
					gridWidth={3}
					gridHeight={1}
					gridX={1}
					gridY={7.5}
					buttonLabel={isPlaying ? 'Stop' : 'Play'}
					variant={isPlaying ? 'danger' : 'success'}
					icon={isPlaying ? '⏹️' : '▶️'}
					layout='fill'
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
				gridY={1} // Center vertically
				size='md'
			/>
		</BaseNode>
	);
}
