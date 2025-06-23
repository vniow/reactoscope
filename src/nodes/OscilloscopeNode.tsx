import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../shared/types';
import OscilloscopeVisualization from './OscilloscopeVisualization';

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
		<div className='w-full h-[200px]'>
			<div className='flex flex-col border border-solid border-gray-200 h-full rounded-2xl bg-white/70 shadow-[0_7px_9px_0_rgba(0,0,0,0.02)]'>
				<div className='text-xs px-3 py-2 border-b border-solid border-gray-200 font-mono font-semibold rounded-t-2xl'>
					Oscilloscope
				</div>

				{/* 3D Canvas for the oscilloscope */}
				<div className='text-xs px-3 py-2 border-b border-solid border-gray-200 font-mono font-semibold rounded-t-2xl'>
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
						<label className='block text-xs text-green-400 mb-1'>Scale</label>
						<input
							type='range'
							min='0.1'
							max='3.0'
							step='0.1'
							value={scale}
							onChange={handleScaleChange}
							className='w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer'
							style={{
								background: `linear-gradient(to right, #00ff41 0%, #00ff41 ${((scale - 0.1) / 2.9) * 100}%, #374151 ${((scale - 0.1) / 2.9) * 100}%, #374151 100%)`,
							}}
						/>
						<span className='text-xs text-green-300'>{scale.toFixed(1)}x</span>
					</div>

					<div className='flex items-center justify-between'>
						<div className='flex items-center space-x-2'>
							<label className='text-xs text-green-400'>Color:</label>
							<input
								type='color'
								value={color}
								onChange={handleColorChange}
								className='w-6 h-5 rounded border border-green-600 cursor-pointer'
							/>
						</div>
						<button
							onClick={toggleGrid}
							className={`px-2 py-1 text-xs rounded ${
								gridVisible
									? 'bg-green-600 text-white'
									: 'bg-gray-700 text-green-400'
							}`}
						>
							Grid
						</button>
					</div>
				</div>

				<div className='text-xs text-center text-green-500 mt-2'>
					📊 Audio Waveform
				</div>

				{/* Input handle */}
				<Handle
					type='target'
					position={Position.Left}
					id='audio-in-0'
					className='w-3 h-3 bg-green-500 border-2 border-white'
				/>
			</div>
		</div>
	);
}
