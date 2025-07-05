/**
 * NoiseGeneratorPanel - A demonstration panel for audio worklet noise generator
 *
 * This component serves as a simple interface for a noise generator audio worklet,
 * positioned in the top-left of the React Flow canvas. It demonstrates:
 * - Worklet ready state display
 * - Play/stop controls
 * - Amplitude control
 */
import { Panel } from '@xyflow/react';
import { useNoiseWorklet } from '../../audio/hooks/useNoiseWorklet';
import { combineClasses } from '../../shared/utils/styleUtils';

interface NoiseGeneratorPanelProps {
	/**
	 * Whether to enable debug logging
	 */
	debug?: boolean;
}

export function NoiseGeneratorPanel({
	debug = false,
}: NoiseGeneratorPanelProps) {
	const { isReady, isPlaying, amplitude, start, stop, setAmplitude } =
		useNoiseWorklet({
			debug,
			autostart: false,
		});

	const handlePlayToggle = async () => {
		if (isPlaying) {
			stop();
		} else {
			await start();
		}
	};

	const handleAmplitudeChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = parseFloat(event.target.value);
		setAmplitude(value);
	};

	const getStatusColor = () => {
		if (!isReady) return 'text-yellow-600 dark:text-yellow-400';
		return isPlaying
			? 'text-green-600 dark:text-green-400'
			: 'text-gray-600 dark:text-gray-400';
	};

	const getStatusText = () => {
		if (!isReady) return 'Initializing...';
		return isPlaying ? 'Playing' : 'Ready';
	};

	const getStatusIcon = () => {
		if (!isReady) return '⏳';
		return isPlaying ? '🔊' : '🔇';
	};

	return (
		<Panel
			position='top-left'
			className='max-w-full'
		>
			<div
				className={combineClasses(
					// Layout
					'w-64 rounded-xl p-4',
					// Glass panel styling consistent with FlowControls
					'backdrop-blur-md bg-white/80 dark:bg-gray-900/80',
					'border border-gray-200/60 dark:border-gray-700/60',
					'shadow-lg shadow-gray-500/10 dark:shadow-black/25',
					// Animation
					'transition-all duration-300 ease-in-out'
				)}
			>
				{/* Header */}
				<div className='flex items-center justify-between mb-4'>
					<h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
						Noise Generator
					</h3>
					<span className='text-xs text-gray-500 dark:text-gray-400'>
						Worklet Demo
					</span>
				</div>

				{/* Status Section */}
				<div className='mb-4 space-y-2'>
					<div className='flex items-center justify-between'>
						<span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
							Status
						</span>
						<div
							className={combineClasses(
								'flex items-center gap-1 text-xs font-medium',
								getStatusColor()
							)}
						>
							<span>{getStatusIcon()}</span>
							<span>{getStatusText()}</span>
						</div>
					</div>
				</div>

				{/* Play Control */}
				<div className='mb-4'>
					<button
						onClick={handlePlayToggle}
						disabled={!isReady}
						className={combineClasses(
							// Base styles
							'w-full py-2 px-4 rounded-lg font-medium text-sm',
							'transition-all duration-200',
							'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
							// Enabled styles
							isReady &&
								(isPlaying
									? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
									: 'bg-green-500 hover:bg-green-600 text-white shadow-md'),
							// Disabled styles
							!isReady &&
								'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
						)}
					>
						{isPlaying ? '⏹️ Stop' : '▶️ Play'}
					</button>
				</div>

				{/* Amplitude Control */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<label
							htmlFor='amplitude-control'
							className='text-xs font-medium text-gray-700 dark:text-gray-300'
						>
							Amplitude
						</label>
						<span className='text-xs text-gray-500 dark:text-gray-400'>
							{Math.round(amplitude * 100)}%
						</span>
					</div>

					<div className='relative'>
						<input
							id='amplitude-control'
							type='range'
							min='0'
							max='1'
							step='0.01'
							value={amplitude}
							onChange={handleAmplitudeChange}
							disabled={!isReady}
							className={combineClasses(
								// Base styles
								'w-full h-2 rounded-lg appearance-none cursor-pointer',
								'focus:outline-none focus:ring-2 focus:ring-blue-500',
								// Background track
								'bg-gray-200 dark:bg-gray-700',
								// Enabled/disabled states
								isReady ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
							)}
							style={{
								background: isReady
									? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${amplitude * 100}%, #e5e7eb ${amplitude * 100}%, #e5e7eb 100%)`
									: undefined,
							}}
						/>
					</div>
				</div>

				{/* Debug info */}
				{debug && (
					<div className='mt-4 pt-3 border-t border-gray-200 dark:border-gray-700'>
						<div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
							<div>Ready: {isReady ? '✅' : '❌'}</div>
							<div>Playing: {isPlaying ? '✅' : '❌'}</div>
							<div>Amplitude: {amplitude.toFixed(3)}</div>
						</div>
					</div>
				)}
			</div>
		</Panel>
	);
}
