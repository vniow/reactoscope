import { useState, useEffect } from 'react';
import BaseNode, { NodeButton, NodePre } from './BaseNode';
import { useNodeStore } from '../../store/nodeStore';
import {
	NODE_THEME_KEYS,
	NodeType,
	type OscillatorData as OscillatorDataType,
} from '../../types/nodes';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';

interface OscillatorNodeProps extends NodeProps<OscillatorDataType> {}

export default function OscillatorNode({
	id,
	data,
	isConnectable,
}: OscillatorNodeProps) {
	const { updateNodeData } = useNodeStore();

	const [frequency, setFrequency] = useState(data.frequency || 440);
	const [waveform, setWaveform] = useState(data.waveform || 'sine');
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		updateNodeData(id, {
			frequency,
			waveform,
			themeKey: NODE_THEME_KEYS[NodeType.OSCILLATOR],
		});
	}, [id, frequency, waveform, updateNodeData]);

	useEffect(() => {
		setFrequency(data.frequency || 440);
		setWaveform(data.waveform || 'sine');
	}, [data.frequency, data.waveform]);

	const themeKey = NODE_THEME_KEYS[NodeType.OSCILLATOR];

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

	// Example custom handles (optional, BaseNode provides defaults)
	const customSourceHandles = [
		{ id: 'audio-out', position: Position.Right, style: { top: '50%' } },
	];
	const customTargetHandles = [
		{ id: 'freq-mod-in', position: Position.Left, style: { top: '30%' } },
		{ id: 'amp-mod-in', position: Position.Left, style: { top: '70%' } },
	];

	return (
		<BaseNode
			label={data.label || 'Oscillator'}
			description={data.description || 'Produces a waveform'}
			nodeType={data.nodeType}
			themeKey={themeKey}
			isConnectable={isConnectable}
			widthUnits={7} // Adjusted for more content
			heightUnits={8} // Adjusted for more content
			// sourceHandles={customSourceHandles} // Uncomment to use custom handles
			// targetHandles={customTargetHandles} // Uncomment to use custom handles
		>
			<div className='flex flex-col gap-3 p-1 w-full'>
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
						max='5000' // Increased max range
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
								themeKey={themeKey} // Pass themeKey for styling
								variant='node' // Use node-specific button styling
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

				{/* Play/Stop Button */}
				<NodeButton
					onClick={togglePlay}
					themeKey={themeKey}
					variant='node'
					className='mt-2 w-full'
				>
					{isPlaying ? 'Stop' : 'Play'}
				</NodeButton>

				{/* Optional: Display current state in a Pre block for debugging */}
				{/* 
				<NodePre themeKey={themeKey}>
					{JSON.stringify({ frequency, waveform, isPlaying, id, nodeType: data.nodeType }, null, 2)}
				</NodePre>
				*/}
			</div>
		</BaseNode>
	);
}
