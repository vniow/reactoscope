import { useState, useEffect } from 'react';
import BaseNode, { NodeButton } from './BaseNode';
import { createNodeSlots } from './nodeSlotUtils';
import { useNodeStore } from '../../store/nodeStore';
import {
	NODE_THEME_KEYS,
	NodeTypes,
	type OscillatorData as OscillatorDataType,
} from '../../types/nodes';
import type { NodeProps } from '@xyflow/react';

export default function OscillatorNode({ id, data, isConnectable }: NodeProps) {
	const { updateNodeData } = useNodeStore();

	// Type assertion for data since the interface typing is not working as expected
	const oscillatorData = data as OscillatorDataType;

	const [frequency, setFrequency] = useState(oscillatorData.frequency || 440);
	const [waveform, setWaveform] = useState(oscillatorData.waveform || 'sine');
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		updateNodeData(id, {
			frequency,
			waveform,
			themeKey: NODE_THEME_KEYS[NodeTypes.OSCILLATOR],
		} as Partial<OscillatorDataType>);
	}, [id, frequency, waveform, updateNodeData]);

	useEffect(() => {
		setFrequency(oscillatorData.frequency || 440);
		setWaveform(oscillatorData.waveform || 'sine');
	}, [oscillatorData.frequency, oscillatorData.waveform]);

	const themeKey = NODE_THEME_KEYS[NodeTypes.OSCILLATOR];

	const waveforms = ['sine', 'square', 'sawtooth', 'triangle'] as const;

	const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFreq = parseFloat(e.target.value);
		setFrequency(newFreq);
	};

	const handleWaveformChange = (newWaveform: (typeof waveforms)[number]) => {
		setWaveform(newWaveform);
	};

	const togglePlay = () => {
		setIsPlaying(!isPlaying);
		// TODO: Implement actual audio start/stop logic
		console.log(`Oscillator ${id} ${!isPlaying ? 'started' : 'stopped'}`);
	};

	// Toolbar content - Play/Stop button and status indicator
	const toolbarContent = (
		<div className='flex items-center justify-between w-full'>
			<NodeButton
				onClick={togglePlay}
				themeKey={themeKey}
				variant='node'
				className='text-xs px-2 py-1'
			>
				{isPlaying ? 'Stop' : 'Play'}
			</NodeButton>
			<div className='text-xs opacity-75'>
				{isPlaying ? '🔊' : '🔇'} {frequency.toFixed(0)}Hz
			</div>
		</div>
	);

	// Main content - Controls for frequency and waveform
	const mainContent = (
		<div className='flex flex-col gap-3 w-full'>
			{/* Frequency Control */}
			<div className='flex flex-col gap-1'>
				<label
					htmlFor={`freq-${id}`}
					className='text-xs font-medium text-inherit'
				>
					Frequency: {frequency.toFixed(0)} Hz
				</label>
				<input
					id={`freq-${id}`}
					type='range'
					min='20'
					max='5000'
					step='1'
					value={frequency}
					onChange={handleFrequencyChange}
					className='w-full h-2 rounded-lg appearance-none cursor-pointer 
                               bg-ui-input-bg dark:bg-ui-input-dark-bg 
                               focus:outline-none focus:ring-2 focus:ring-offset-1 
                               focus:ring-node-oscillator-handle dark:focus:ring-node-oscillator-dark-handle'
				/>
			</div>

			{/* Waveform Selection */}
			<div className='flex flex-col gap-1'>
				<label className='text-xs font-medium text-inherit'>Waveform</label>
				<div className='grid grid-cols-2 gap-1.5'>
					{waveforms.map((wave) => (
						<NodeButton
							key={wave}
							onClick={() => handleWaveformChange(wave)}
							themeKey={themeKey}
							variant='node'
							className={`
								${
									waveform === wave
										? 'ring-2 ring-offset-1 ring-node-oscillator-handle dark:ring-node-oscillator-dark-handle brightness-110'
										: 'opacity-80 hover:opacity-100'
								}
								capitalize text-center
							`}
						>
							{wave}
						</NodeButton>
					))}
				</div>
			</div>
		</div>
	);

	// Footer content - Node ID and connection info
	const footerContent = (
		<div className='text-center'>
			<div className='text-xs opacity-60'>ID: {id}</div>
		</div>
	);

	// Create the slots object
	const slots = createNodeSlots({
		toolbar: toolbarContent,
		content: mainContent,
		footer: footerContent,
	});

	return (
		<BaseNode
			label={oscillatorData.label || 'Oscillator'}
			description={oscillatorData.description || 'Produces a waveform'}
			nodeType={oscillatorData.nodeType || NodeTypes.OSCILLATOR}
			themeKey={themeKey}
			isConnectable={isConnectable}
			widthUnits={7}
			heightUnits={8}
			slots={slots}
		/>
	);
}
