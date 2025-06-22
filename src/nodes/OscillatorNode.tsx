import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import {
	updateOscillatorParams,
	toggleOscillator,
} from '../audio/stores/audioSlice';
import type { CustomNode } from '../shared/types';

export function OscillatorNode({ id, data }: NodeProps<CustomNode>) {
	const [frequency, setFrequency] = useState(
		(data?.frequency as number) || 440
	);
	const [type, setType] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>(
		(data?.type as 'sine' | 'square' | 'sawtooth' | 'triangle') || 'sine'
	);
	const [playing, setPlaying] = useState((data?.playing as boolean) || false);

	const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFreq = parseFloat(e.target.value);
		setFrequency(newFreq);
		updateOscillatorParams(id, { frequency: newFreq });
	};

	const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newType = e.target.value as
			| 'sine'
			| 'square'
			| 'sawtooth'
			| 'triangle';
		setType(newType);
		updateOscillatorParams(id, { type: newType });
	};
	const togglePlay = async () => {
		console.log('OscillatorNode togglePlay called with ID:', id);
		setPlaying(!playing);
		await toggleOscillator(id);
	};

	return (
		<div className='react-flow__node-default bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 min-w-48'>
			<div className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2'>
				Oscillator
			</div>

			<div className='space-y-2'>
				<div>
					<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
						Frequency
					</label>
					<input
						type='range'
						min='20'
						max='2000'
						value={frequency}
						onChange={handleFrequencyChange}
						className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
					/>
					<span className='text-xs text-gray-500'>
						{frequency.toFixed(1)} Hz
					</span>
				</div>

				<div>
					<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
						Wave Type
					</label>
					<select
						value={type}
						onChange={handleTypeChange}
						className='w-full text-xs border border-gray-300 rounded px-2 py-1'
					>
						<option value='sine'>Sine</option>
						<option value='square'>Square</option>
						<option value='sawtooth'>Sawtooth</option>
						<option value='triangle'>Triangle</option>
					</select>
				</div>

				<button
					onClick={togglePlay}
					className={`w-full px-3 py-1 text-xs rounded ${
						playing
							? 'bg-red-500 hover:bg-red-600 text-white'
							: 'bg-green-500 hover:bg-green-600 text-white'
					}`}
				>
					{playing ? 'Stop' : 'Start'}
				</button>
			</div>

			{/* Output handle */}
			<Handle
				type='source'
				position={Position.Right}
				id='audio-out-0'
				className='w-3 h-3 bg-blue-500 border-2 border-white'
			/>
		</div>
	);
}
