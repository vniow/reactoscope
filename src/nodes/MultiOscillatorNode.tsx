import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../shared/types';
import type { OscillatorSettings } from './types';
import {
	updateMultiOscillatorParams,
	toggleMultiOscillator,
} from '../audio/stores/audioSlice';

export function MultiOscillatorNode({ id, data }: NodeProps<CustomNode>) {
	// Initialize three oscillators with default values
	const defaultOscillators: [
		OscillatorSettings,
		OscillatorSettings,
		OscillatorSettings,
	] = [
		{ frequency: 220, type: 'sine', playing: false },
		{ frequency: 440, type: 'square', playing: false },
		{ frequency: 880, type: 'sawtooth', playing: false },
	];

	const [oscillators, setOscillators] = useState<
		[OscillatorSettings, OscillatorSettings, OscillatorSettings]
	>(
		(data?.oscillators as [
			OscillatorSettings,
			OscillatorSettings,
			OscillatorSettings,
		]) || defaultOscillators
	);

	const handleFrequencyChange = (oscIndex: number, frequency: number) => {
		const newOscillators = [...oscillators] as [
			OscillatorSettings,
			OscillatorSettings,
			OscillatorSettings,
		];
		newOscillators[oscIndex] = { ...newOscillators[oscIndex], frequency };
		setOscillators(newOscillators);
		updateMultiOscillatorParams(id, oscIndex, { frequency });
	};

	const handleTypeChange = (
		oscIndex: number,
		type: 'sine' | 'square' | 'sawtooth' | 'triangle'
	) => {
		const newOscillators = [...oscillators] as [
			OscillatorSettings,
			OscillatorSettings,
			OscillatorSettings,
		];
		newOscillators[oscIndex] = { ...newOscillators[oscIndex], type };
		setOscillators(newOscillators);
		updateMultiOscillatorParams(id, oscIndex, { type });
	};

	const togglePlay = async (oscIndex: number) => {
		const newOscillators = [...oscillators] as [
			OscillatorSettings,
			OscillatorSettings,
			OscillatorSettings,
		];
		newOscillators[oscIndex] = {
			...newOscillators[oscIndex],
			playing: !newOscillators[oscIndex].playing,
		};
		setOscillators(newOscillators);
		await toggleMultiOscillator(id, oscIndex);
	};

	const renderOscillator = (oscIndex: number, settings: OscillatorSettings) => (
		<div
			key={oscIndex}
			className='border border-gray-300 rounded p-2 space-y-2'
		>
			<div className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
				Osc {oscIndex + 1}
			</div>

			<div>
				<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
					Frequency
				</label>
				<input
					type='range'
					min='20'
					max='2000'
					value={settings.frequency}
					onChange={(e) =>
						handleFrequencyChange(oscIndex, parseFloat(e.target.value))
					}
					className='w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer'
				/>
				<span className='text-xs text-gray-500'>
					{settings.frequency.toFixed(1)} Hz
				</span>
			</div>

			<div>
				<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
					Wave Type
				</label>
				<select
					value={settings.type}
					onChange={(e) =>
						handleTypeChange(
							oscIndex,
							e.target.value as 'sine' | 'square' | 'sawtooth' | 'triangle'
						)
					}
					className='w-full text-xs border border-gray-300 rounded px-1 py-1'
				>
					<option value='sine'>Sine</option>
					<option value='square'>Square</option>
					<option value='sawtooth'>Sawtooth</option>
					<option value='triangle'>Triangle</option>
				</select>
			</div>

			<button
				onClick={() => togglePlay(oscIndex)}
				className={`w-full px-2 py-1 text-xs rounded ${
					settings.playing
						? 'bg-red-500 hover:bg-red-600 text-white'
						: 'bg-green-500 hover:bg-green-600 text-white'
				}`}
			>
				{settings.playing ? 'Stop' : 'Start'}
			</button>

			{/* Source handle for this oscillator - positioned vertically */}
			<Handle
				type='source'
				position={Position.Right}
				id={`audio-out-${oscIndex}`}
				style={{
					top: `${25 + oscIndex * 25}%`, // Distribute handles vertically
					background: `hsl(${oscIndex * 120}, 70%, 50%)`, // Different colors for each channel
				}}
				className='w-3 h-3 border-2 border-white'
			/>
		</div>
	);

	return (
		<div className='react-flow__node-default bg-white dark:bg-gray-800 border-2 border-purple-500 rounded-lg p-4 min-w-64'>
			<div className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3'>
				Multi-Oscillator
			</div>

			<div className='space-y-3'>
				{oscillators.map((settings, index) =>
					renderOscillator(index, settings)
				)}
			</div>

			<div className='text-xs text-center text-gray-500 mt-3'>
				🎵 3-Channel Output
			</div>
		</div>
	);
}
