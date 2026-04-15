import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../../shared/types';
import OscilloscopeVisualization from './OscilloscopeVisualization';
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedLabel,
	ThemedValue,
	ThemedRangeInput,
} from '../../shared/components/ThemedControls';

export function OscilloscopeNode({ id, data }: NodeProps<CustomNode>) {
	const [scale, setScale] = useState((data?.scale as number) || 1.0);
	const [color, setColor] = useState((data?.color as string) || '#00ff41');
	const [gridVisible, setGridVisible] = useState(
		(data?.gridVisible as boolean) ?? true
	);

	const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newScale = parseFloat(e.target.value);
		setScale(newScale);
	};

	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setColor(e.target.value);
	};

	const toggleGrid = () => {
		setGridVisible(!gridVisible);
	};

	return (
		<ThemedNode
			nodeType='oscilloscope'
			title='Oscilloscope'
			handles={{
				inputs: [{ id: 'audio-in-0' }],
			}}
			className='w-96 h-64'
		>
			{/* 3D Canvas for the oscilloscope */}
			<div className='mb-3'>
				<OscilloscopeVisualization
					nodeId={id}
					color={color}
					scale={scale}
					gridVisible={gridVisible}
				/>
			</div>

			{/* Controls */}
			<div className='space-y-2'>
				<div>
					<ThemedLabel nodeType='oscilloscope'>Scale</ThemedLabel>
					<ThemedRangeInput
						nodeType='oscilloscope'
						min='0.1'
						max='3.0'
						step='0.1'
						value={scale}
						onChange={handleScaleChange}
					/>
					<ThemedValue nodeType='oscilloscope'>{scale.toFixed(1)}x</ThemedValue>
				</div>

				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-2'>
						<ThemedLabel nodeType='oscilloscope'>Color:</ThemedLabel>
						<input
							type='color'
							value={color}
							onChange={handleColorChange}
							className='w-6 h-5 rounded border oscilloscope-node-border cursor-pointer'
						/>
					</div>
					<ThemedButton
						nodeType='oscilloscope'
						onClick={toggleGrid}
						active={gridVisible}
					>
						Grid
					</ThemedButton>
				</div>
			</div>

			<div className='text-xs text-center opacity-70 mt-2'>
				📊 Audio Waveform
			</div>
		</ThemedNode>
	);
}
