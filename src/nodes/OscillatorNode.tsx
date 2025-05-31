import { Position, type NodeProps } from '@xyflow/react';
import React from 'react';

import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { Slider } from '../components/ui';
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
						className={`nodrag px-2 py-1 text-xs rounded transition-colors ${
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

interface FrequencySliderProps {
	value: number;
	onChange: (frequency: number) => void;
}

function FrequencySlider({ value, onChange }: FrequencySliderProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(Number(e.target.value));
	};

	return (
		<Slider
			label='Frequency'
			value={value}
			min={80}
			max={2000}
			step={1}
			formatValue={(val) => `${val}Hz`}
			color='orange'
			onChange={handleChange}
		/>
	);
}

interface DetuneSliderProps {
	value: number;
	onChange: (detune: number) => void;
}

function DetuneSlider({ value, onChange }: DetuneSliderProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(Number(e.target.value));
	};

	return (
		<Slider
			label='Detune'
			value={value}
			min={-1200}
			max={1200}
			step={1}
			formatValue={(val) => `${val > 0 ? '+' : ''}${val} cents`}
			color='green'
			onChange={handleChange}
		/>
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
			className={`nodrag w-full py-2 px-4 rounded font-medium text-sm transition-colors ${
				isPlaying
					? 'bg-red-500 hover:bg-red-600 text-white'
					: 'bg-green-500 hover:bg-green-600 text-white'
			}`}
		>
			{isPlaying ? '⏹️ Stop' : '▶️ Play'}
		</button>
	);
}

export function OscillatorNode({
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

	return (
		<BaseNode
			variant='audio'
			gridWidth={data.gridWidth ?? 3}
			gridHeight={data.gridHeight ?? 6}
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

				{/* Frequency Control */}
				<FrequencySlider
					value={params.frequency}
					onChange={updateFrequency}
				/>

				{/* Detune Control */}
				<DetuneSlider
					value={params.detune}
					onChange={updateDetune}
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
