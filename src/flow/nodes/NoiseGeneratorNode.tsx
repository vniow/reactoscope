import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../../shared/types';
import {
	updateNoiseGeneratorParams,
	toggleNoiseGenerator,
} from '../../audio/stores/audioSlice';
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedLabel,
} from '../../shared/components/ThemedControls';
import { useNodeTheme } from '../../shared/hooks/useNodeTheme';
import { cn } from '../../shared/utils/classNames';

export function NoiseGeneratorNode({ id, data }: NodeProps<CustomNode>) {
	const { classes } = useNodeTheme('noise');
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
		<ThemedNode
			nodeType='noise'
			title='Noise Generator'
			handles={{
				outputs: [{ id: 'audio-out' }],
			}}
			className='min-w-64 font-mono'
		>
			{/* Noise Type Selection */}
			<div className='mb-3'>
				<ThemedLabel
					nodeType='noise'
					className='font-mono'
				>
					Noise Type
				</ThemedLabel>
				<div className='flex gap-1'>
					{(['white', 'pink', 'brown'] as const).map((type) => (
						<button
							key={type}
							onClick={() => handleNoiseTypeChange(type)}
							className={cn(
								'px-2 py-1 text-xs rounded font-mono transition-colors',
								noiseType === type
									? classes.button.primary
									: classes.button.secondary
							)}
							style={{
								borderLeft:
									noiseType === type ? `3px solid ${getNoiseColor()}` : 'none',
							}}
						>
							{type.toUpperCase()}
						</button>
					))}
				</div>
				<div className='text-xs opacity-70 mt-1 font-mono'>
					{getNoiseDescription()}
				</div>
			</div>

			{/* Amplitude Control */}
			<div className='mb-3'>
				<ThemedLabel
					nodeType='noise'
					className='font-mono'
				>
					Amplitude
				</ThemedLabel>
				<input
					type='range'
					min='0'
					max='1'
					step='0.01'
					value={amplitude}
					onChange={(e) => handleAmplitudeChange(parseFloat(e.target.value))}
					className='w-full h-2 rounded-lg appearance-none cursor-pointer noise-node-range'
				/>
				<div className='flex justify-between text-xs opacity-70 mt-1 font-mono'>
					<span>0.0</span>
					<span className='noise-node-accent'>{amplitude.toFixed(2)}</span>
					<span>1.0</span>
				</div>
			</div>

			{/* Amplitude Visualization */}
			<div className='mb-3 h-8 secondary-bg rounded border secondary-border relative overflow-hidden'>
				<div
					className='h-full transition-all duration-200'
					style={{
						width: `${amplitude * 100}%`,
						background: `linear-gradient(90deg, ${getNoiseColor()}20, ${getNoiseColor()}80)`,
					}}
				/>
				<div className='absolute inset-0 flex items-center justify-center text-xs font-mono opacity-70'>
					{(amplitude * 100).toFixed(0)}%
				</div>
			</div>

			{/* Play/Stop Button */}
			<ThemedButton
				nodeType='noise'
				onClick={togglePlay}
				active={playing}
				className='font-mono font-bold'
				style={{
					boxShadow: playing ? `0 0 10px ${getNoiseColor()}50` : 'none',
				}}
			>
				{playing ? '⏹ STOP' : '▶ START'} {noiseType.toUpperCase()} NOISE
			</ThemedButton>

			<div className='text-xs text-center opacity-70 mt-3 font-mono'>
				🔊 WORKLET-POWERED
			</div>
		</ThemedNode>
	);
}
