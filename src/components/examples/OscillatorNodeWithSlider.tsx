import React from 'react';
import { Position, type NodeProps } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { Slider } from '../components/ui/Slider';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useNodes } from '../hooks/useAppStore';
import { useToneConnections } from '../hooks/useToneConnections';
import { useToneOscillator } from '../hooks/useToneOscillator';
import type { OscillatorNode } from './types';

// Wave type options for the oscillator
const waveTypes = ['sine', 'square', 'triangle', 'sawtooth'] as const;

// UI Components for oscillator controls
interface WaveTypeSelectorProps {
	value: 'sine' | 'square' | 'triangle' | 'sawtooth';
	onChange: (waveType: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
}

function WaveTypeSelector({ value, onChange }: WaveTypeSelectorProps) {
	return (
		<div className='space-y-1'>
			<label className='text-xs font-medium text-orange-800 dark:text-orange-200'>
				Wave Type
			</label>
			<div className='grid grid-cols-2 gap-1'>
				{waveTypes.map((type) => (
					<button
						key={type}
						className={`px-2 py-1 text-xs rounded transition-colors ${
							value === type
								? 'bg-orange-500 text-white'
								: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
						}`}
						onClick={() => onChange(type)}
					>
						{type}
					</button>
				))}
			</div>
		</div>
	);
}

interface PlayStopButtonProps {
	isPlaying: boolean;
	onStart: () => void;
	onStop: () => void;
}

function PlayStopButton({ isPlaying, onStart, onStop }: PlayStopButtonProps) {
	return (
		<button
			onClick={isPlaying ? onStop : onStart}
			className={`w-full py-2 px-4 rounded font-medium text-sm transition-colors ${
				isPlaying
					? 'bg-red-500 hover:bg-red-600 text-white'
					: 'bg-green-500 hover:bg-green-600 text-white'
			}`}
		>
			{isPlaying ? '⏹️ Stop' : '▶️ Play'}
		</button>
	);
}

export function OscillatorNodeWithSlider({
	id,
	data,
	selected,
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

	// Handle positions from the Zustand store
	const sourcePosition = useHandlePosition(id, 'audio-out', Position.Bottom);

	// Get the removeNode function from the store
	const { removeNode } = useNodes();

	// Slider handlers
	const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateFrequency(Number(e.target.value));
	};

	const handleDetuneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateDetune(Number(e.target.value));
	};

	// Custom formatters for slider values
	const formatFrequency = (value: number) => `${value}Hz`;
	const formatDetune = (value: number) =>
		`${value > 0 ? '+' : ''}${value} cents`;

	return (
		<BaseNode
			variant='audio'
			gridWidth={data.gridWidth ?? 4}
			gridHeight={data.gridHeight ?? 5}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Oscillator'}
		>
			<div className='space-y-3'>
				{/* Wave Type Selector */}
				<WaveTypeSelector
					value={params.waveType}
					onChange={updateWaveType}
				/>

				{/* Frequency Control with new Slider component */}
				<Slider
					label='Frequency'
					value={params.frequency}
					min={80}
					max={2000}
					step={1}
					onChange={handleFrequencyChange}
					formatValue={formatFrequency}
					color='orange'
					size='md'
				/>

				{/* Detune Control with new Slider component */}
				<Slider
					label='Detune'
					value={params.detune}
					min={-1200}
					max={1200}
					step={1}
					onChange={handleDetuneChange}
					formatValue={formatDetune}
					color='orange'
					size='md'
				/>

				{/* Play/Stop Button */}
				<PlayStopButton
					isPlaying={isPlaying}
					onStart={start}
					onStop={stop}
				/>
			</div>

			{/* Audio Output Handle */}
			<NodeHandle
				id='audio-out'
				type='source'
				position={sourcePosition}
				variant='audio'
			/>
		</BaseNode>
	);
}
