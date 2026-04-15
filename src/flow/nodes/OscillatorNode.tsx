import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import {
	updateOscillatorParams,
	toggleOscillator,
} from '../../audio/stores/audioSlice';
import type { CustomNode } from '../../shared/types';
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedLabel,
	ThemedValue,
	ThemedRangeInput,
	ThemedSelect,
} from '../../shared/components/ThemedControls';
import { getNodeTypeClasses } from '../../shared/config/grid';

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
		<ThemedNode
			nodeType='oscillator'
			title='Oscillator'
			handles={{
				outputs: [{ id: 'audio-out-0' }],
			}}
			className={getNodeTypeClasses('oscillator')}
		>
			{/* Frequency Control */}
			<div>
				<ThemedLabel nodeType='oscillator'>Frequency</ThemedLabel>
				<ThemedRangeInput
					nodeType='oscillator'
					min='20'
					max='2000'
					value={frequency}
					onChange={handleFrequencyChange}
				/>
				<ThemedValue nodeType='oscillator'>
					{frequency.toFixed(1)} Hz
				</ThemedValue>
			</div>

			{/* Wave Type Control */}
			<div>
				<ThemedLabel nodeType='oscillator'>Wave Type</ThemedLabel>
				<ThemedSelect
					nodeType='oscillator'
					value={type}
					onChange={handleTypeChange}
				>
					<option value='sine'>Sine</option>
					<option value='square'>Square</option>
					<option value='sawtooth'>Sawtooth</option>
					<option value='triangle'>Triangle</option>
				</ThemedSelect>
			</div>

			{/* Play/Stop Button */}
			<ThemedButton
				nodeType='oscillator'
				onClick={togglePlay}
				active={playing}
			>
				{playing ? 'Stop' : 'Start'}
			</ThemedButton>
		</ThemedNode>
	);
}
