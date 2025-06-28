/**
 * Audio Transport Controls Component
 *
 * Provides global transport and audio controls for the DAW interface.
 */

import { Panel } from '@xyflow/react';
import { useAppStore } from '../../shared/stores/appStore';

export function AudioTransport() {
	const {
		isPlaying,
		isStarted,
		bpm,
		masterVolume,
		globalMute,
		togglePlayback,
		setBpm,
		setMasterVolume,
		setGlobalMute,
		getTransportTime,
	} = useAppStore((state) => ({
		isPlaying: state.isPlaying,
		isStarted: state.isStarted,
		bpm: state.bpm,
		masterVolume: state.masterVolume,
		globalMute: state.globalMute,
		togglePlayback: state.togglePlayback,
		setBpm: state.setBpm,
		setMasterVolume: state.setMasterVolume,
		setGlobalMute: state.setGlobalMute,
		getTransportTime: state.getTransportTime,
	}));

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setMasterVolume(Number(e.target.value));
	};

	const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBpm(Number(e.target.value));
	};

	return (
		<Panel
			position='top-center'
			className='flex items-center gap-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-gray-200/60 dark:border-gray-700/60 shadow-lg'
		>
			{/* Play/Stop button */}
			<div className='flex items-center gap-2'>
				<button
					onClick={togglePlayback}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 text-white text-xl font-bold shadow-md ${
						isPlaying
							? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
							: 'bg-green-500 hover:bg-green-600 active:bg-green-700'
					}`}
					aria-label={isPlaying ? 'Stop' : 'Play'}
					title={isPlaying ? 'Stop Transport' : 'Start Transport'}
				>
					{isPlaying ? '■' : '▶'}
				</button>

				{/* Status indicator */}
				<div className='flex flex-col items-center'>
					<div
						className={`w-2 h-2 rounded-full ${isStarted ? 'bg-green-500' : 'bg-gray-400'}`}
					/>
					<span className='text-xs text-gray-600 dark:text-gray-400'>
						{isStarted ? 'Ready' : 'Init'}
					</span>
				</div>
			</div>

			{/* Transport position */}
			<div className='flex flex-col items-center min-w-[80px]'>
				<div className='text-sm font-mono font-semibold text-gray-800 dark:text-gray-200'>
					{isStarted ? getTransportTime() : '0:0:0'}
				</div>
				<div className='text-xs text-gray-500'>Position</div>
			</div>

			{/* BPM control */}
			<div className='flex flex-col items-center'>
				<label className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
					BPM
				</label>
				<div className='flex items-center gap-2'>
					<input
						type='range'
						min='40'
						max='240'
						value={bpm}
						onChange={handleBpmChange}
						className='w-24 h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider'
					/>
					<div className='text-sm font-mono min-w-[40px] text-center font-semibold'>
						{bpm}
					</div>
				</div>
			</div>

			{/* Master volume control */}
			<div className='flex flex-col items-center'>
				<label className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
					Master
				</label>
				<div className='flex items-center gap-2'>
					<button
						onClick={() => setGlobalMute(!globalMute)}
						className={`p-1 rounded transition-colors ${
							globalMute
								? 'bg-red-500 text-white'
								: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
						}`}
						title={globalMute ? 'Unmute' : 'Mute'}
					>
						{globalMute ? '🔇' : '🔊'}
					</button>
					<input
						type='range'
						min='-60'
						max='0'
						value={masterVolume}
						onChange={handleVolumeChange}
						disabled={globalMute}
						className={`w-24 h-2 rounded-lg appearance-none cursor-pointer slider ${
							globalMute
								? 'bg-gray-200 dark:bg-gray-700 opacity-50'
								: 'bg-gray-300 dark:bg-gray-600'
						}`}
					/>
					<div className='text-sm font-mono min-w-[45px] text-center'>
						{globalMute ? 'MUTE' : `${masterVolume}dB`}
					</div>
				</div>
			</div>

			{/* Audio context status */}
			<div className='flex flex-col items-center'>
				<div
					className={`w-3 h-3 rounded-full ${
						isStarted ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
					}`}
				/>
				<span className='text-xs text-gray-600 dark:text-gray-400'>Audio</span>
			</div>
		</Panel>
	);
}
