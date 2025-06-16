/**
 * SimpleNoiseDemo - Example component showing how to use the simplified worklet approach
 * This is for testing and can be used within the node editor
 */

import { useState } from 'react';
import { useSimpleNoiseWorklet } from '../hooks/useSimpleNoiseWorklet';

export function SimpleNoiseDemo() {
	const [volumeSlider, setVolumeSlider] = useState(50);

	const { start, stop, setVolume, isPlaying, isReady, volume, node } =
		useSimpleNoiseWorklet(0.5, false);

	// Update volume when slider changes
	const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseInt(event.target.value) / 100;
		setVolumeSlider(parseInt(event.target.value));
		setVolume(newVolume);
	};

	const handleToggle = async () => {
		if (isPlaying) {
			stop();
		} else {
			await start();
		}
	};

	const connectToDestination = () => {
		if (node && isReady) {
			// Connect to Tone.js destination (speakers)
			node.toDestination();
			console.log('🔌 Connected to destination');
		}
	};

	return (
		<div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
			<h3 className='text-sm font-semibold mb-3 text-gray-900 dark:text-white'>
				Simple Noise Worklet Test
			</h3>

			<div className='space-y-3'>
				{/* Status */}
				<div className='flex items-center gap-2 text-xs'>
					<div
						className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-red-500'}`}
					/>
					<span className='text-gray-600 dark:text-gray-300'>
						{isReady ? 'Ready' : 'Initializing...'}
					</span>
				</div>

				{/* Controls */}
				<div className='flex items-center gap-2'>
					<button
						onClick={handleToggle}
						disabled={!isReady}
						className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
							isReady
								? isPlaying
									? 'bg-red-500 hover:bg-red-600 text-white'
									: 'bg-green-500 hover:bg-green-600 text-white'
								: 'bg-gray-300 text-gray-500 cursor-not-allowed'
						}`}
					>
						{isPlaying ? '⏹️ Stop' : '▶️ Start'}
					</button>

					<button
						onClick={connectToDestination}
						disabled={!isReady}
						className='px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded font-medium transition-colors'
					>
						🔌 To Speakers
					</button>
				</div>

				{/* Volume Control */}
				<div className='space-y-1'>
					<label className='block text-xs font-medium text-gray-700 dark:text-gray-300'>
						Volume: {Math.round(volume * 100)}%
					</label>
					<input
						type='range'
						min='0'
						max='100'
						value={volumeSlider}
						onChange={handleVolumeChange}
						disabled={!isReady}
						className='w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed'
					/>
				</div>

				{/* Debug Info */}
				<details className='text-xs text-gray-500 dark:text-gray-400'>
					<summary className='cursor-pointer'>Debug Info</summary>
					<div className='mt-1 space-y-1 pl-2'>
						<div>Ready: {isReady ? '✅' : '❌'}</div>
						<div>Playing: {isPlaying ? '✅' : '❌'}</div>
						<div>Volume: {Math.round(volume * 100)}%</div>
						<div>Node: {node ? '✅ Created' : '❌ Not created'}</div>
					</div>
				</details>
			</div>
		</div>
	);
}
