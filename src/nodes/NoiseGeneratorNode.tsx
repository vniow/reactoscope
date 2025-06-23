import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../shared/types';
import {
	updateNoiseGeneratorParams,
	toggleNoiseGenerator,
} from '../audio/stores/audioSlice';

export function NoiseGeneratorNode({ id, data }: NodeProps<CustomNode>) {
	const [noiseType, setNoiseType] = useState<'white' | 'pink' | 'brown'>(
		(data?.noiseType as 'white' | 'pink' | 'brown') || 'white'
	);
	const [amplitude, setAmplitude] = useState(
		(data?.amplitude as number) || 0.5
	);
	const [playing, setPlaying] = useState((data?.playing as boolean) || false);

	const handleNoiseTypeChange = (type: 'white' | 'pink' | 'brown') => {
		setNoiseType(type);
		updateNoiseGeneratorParams(id, { noiseType: type });
	};

	const handleAmplitudeChange = (amp: number) => {
		setAmplitude(amp);
		updateNoiseGeneratorParams(id, { amplitude: amp });
	};

	const togglePlay = async () => {
		const newPlaying = !playing;
		setPlaying(newPlaying);
		await toggleNoiseGenerator(id, newPlaying);
	};

	const getNoiseColor = () => {
		switch (noiseType) {
			case 'white':
				return '#ffffff';
			case 'pink':
				return '#ff69b4';
			case 'brown':
				return '#8b4513';
			default:
				return '#ffffff';
		}
	};

	const getNoiseDescription = () => {
		switch (noiseType) {
			case 'white':
				return 'Equal energy across all frequencies';
			case 'pink':
				return '1/f noise - more low frequency content';
			case 'brown':
				return 'Brownian noise - even more low frequencies';
			default:
				return '';
		}
	};

	return (
		<div className='react-flow__node-default bg-gray-900 border-2 border-purple-500 rounded-lg p-4 min-w-64'>
			<div className='text-sm font-semibold text-purple-400 mb-3 font-mono'>
				Noise Generator
			</div>

			{/* Noise Type Selection */}
			<div className='mb-3'>
				<label className='block text-xs text-purple-300 mb-2 font-mono'>
					Noise Type
				</label>
				<div className='flex gap-1'>
					{(['white', 'pink', 'brown'] as const).map((type) => (
						<button
							key={type}
							onClick={() => handleNoiseTypeChange(type)}
							className={`px-2 py-1 text-xs rounded font-mono ${
								noiseType === type
									? 'bg-purple-600 text-white'
									: 'bg-gray-700 text-purple-300 hover:bg-gray-600'
							}`}
							style={{
								borderLeft:
									noiseType === type ? `3px solid ${getNoiseColor()}` : 'none',
							}}
						>
							{type.toUpperCase()}
						</button>
					))}
				</div>
				<div className='text-xs text-gray-400 mt-1 font-mono'>
					{getNoiseDescription()}
				</div>
			</div>

			{/* Amplitude Control */}
			<div className='mb-3'>
				<label className='block text-xs text-purple-300 mb-1 font-mono'>
					Amplitude
				</label>
				<input
					type='range'
					min='0'
					max='1'
					step='0.01'
					value={amplitude}
					onChange={(e) => handleAmplitudeChange(parseFloat(e.target.value))}
					className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer'
					style={{
						background: `linear-gradient(to right, ${getNoiseColor()} 0%, ${getNoiseColor()} ${amplitude * 100}%, #374151 ${amplitude * 100}%, #374151 100%)`,
					}}
				/>
				<div className='flex justify-between text-xs text-gray-400 mt-1 font-mono'>
					<span>0.0</span>
					<span className='text-purple-300'>{amplitude.toFixed(2)}</span>
					<span>1.0</span>
				</div>
			</div>

			{/* Amplitude Visualization */}
			<div className='mb-3 h-8 bg-gray-800 rounded border border-gray-600 relative overflow-hidden'>
				<div
					className='h-full transition-all duration-200'
					style={{
						width: `${amplitude * 100}%`,
						background: `linear-gradient(90deg, ${getNoiseColor()}20, ${getNoiseColor()}80)`,
					}}
				/>
				<div className='absolute inset-0 flex items-center justify-center text-xs font-mono text-gray-300'>
					{(amplitude * 100).toFixed(0)}%
				</div>
			</div>

			{/* Play/Stop Button */}
			<button
				onClick={togglePlay}
				className={`w-full px-3 py-2 text-sm rounded font-mono font-bold ${
					playing
						? 'bg-red-600 hover:bg-red-700 text-white'
						: 'bg-purple-600 hover:bg-purple-700 text-white'
				}`}
				style={{
					boxShadow: playing ? `0 0 10px ${getNoiseColor()}50` : 'none',
				}}
			>
				{playing ? '⏹ STOP' : '▶ START'} {noiseType.toUpperCase()} NOISE
			</button>

			<div className='text-xs text-center text-purple-400 mt-3 font-mono'>
				🔊 WORKLET-POWERED
			</div>

			{/* Output handle */}
			<Handle
				type='source'
				position={Position.Right}
				id='audio-out'
				className='w-3 h-3 border-2 border-white'
				style={{
					background: getNoiseColor(),
				}}
			/>
		</div>
	);
}
