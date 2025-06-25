import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../../shared/types';
import type { OscillatorSettings } from '../../nodes/types';
import {
	updateMultiOscillatorParams,
	toggleMultiOscillator,
} from '../../audio/stores/audioSlice';
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedLabel,
	ThemedValue,
	ThemedRangeInput,
	ThemedSelect,
} from '../../shared/components/ThemedControls';

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
			className='border secondary-border rounded p-2 space-y-2'
		>
			<div className='text-xs font-semibold oscillator-node-accent'>
				Osc {oscIndex + 1}
			</div>

			<div>
				<ThemedLabel nodeType='oscillator'>Frequency</ThemedLabel>
				<ThemedRangeInput
					nodeType='oscillator'
					min='20'
					max='2000'
					value={settings.frequency}
					onChange={(e) =>
						handleFrequencyChange(oscIndex, parseFloat(e.target.value))
					}
				/>
				<ThemedValue nodeType='oscillator'>
					{settings.frequency.toFixed(1)} Hz
				</ThemedValue>
			</div>

			<div>
				<ThemedLabel nodeType='oscillator'>Wave Type</ThemedLabel>
				<ThemedSelect
					nodeType='oscillator'
					value={settings.type}
					onChange={(e) =>
						handleTypeChange(
							oscIndex,
							e.target.value as 'sine' | 'square' | 'sawtooth' | 'triangle'
						)
					}
				>
					<option value='sine'>Sine</option>
					<option value='square'>Square</option>
					<option value='sawtooth'>Sawtooth</option>
					<option value='triangle'>Triangle</option>
				</ThemedSelect>
			</div>

			<ThemedButton
				nodeType='oscillator'
				onClick={() => togglePlay(oscIndex)}
				active={settings.playing}
			>
				{settings.playing ? 'Stop' : 'Start'}
			</ThemedButton>
		</div>
	);

	return (
		<ThemedNode
			nodeType='oscillator'
			title='Multi-Oscillator'
			handles={{
				outputs: [
					{ id: 'audio-out-0' },
					{ id: 'audio-out-1' },
					{ id: 'audio-out-2' },
				],
			}}
			className='min-w-64'
		>
			<div className='space-y-3'>
				{oscillators.map((settings, index) =>
					renderOscillator(index, settings)
				)}
			</div>
		</ThemedNode>
	);
}
