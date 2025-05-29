import { useTransport } from '../hooks/useAppStore';

export function TransportControls() {
	const {
		transport,
		audioContext,
		startTransport,
		stopTransport,
		setBPM,
		initializeAudioContext,
	} = useTransport();

	const handleStartStop = async () => {
		// Initialize audio context if not started
		if (!audioContext.isStarted) {
			await initializeAudioContext();
		}

		if (transport.isPlaying) {
			stopTransport();
		} else {
			startTransport();
		}
	};

	const handleBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBPM(parseInt(e.target.value));
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		e.stopPropagation();
	};

	return (
		<div className='space-y-3'>
			{/* Transport Controls Row */}
			<div className='flex items-center gap-2'>
				<span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
					🎵 Transport
				</span>
				<button
					onClick={handleStartStop}
					onPointerDown={handlePointerDown}
					className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
						transport.isPlaying
							? 'bg-red-500 hover:bg-red-600 text-white'
							: 'bg-green-500 hover:bg-green-600 text-white'
					}`}
				>
					{transport.isPlaying ? '⏹️ Stop' : '▶️ Play'}
				</button>
			</div>

			{/* BPM and Status Row */}
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					<label className='text-sm text-gray-600 dark:text-gray-400'>
						BPM:
					</label>
					<input
						type='number'
						min='60'
						max='200'
						value={transport.bpm}
						onChange={handleBPMChange}
						onPointerDown={handlePointerDown}
						className='w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
					/>
				</div>

				<span
					className={`text-xs px-2 py-1 rounded ${
						audioContext.isStarted
							? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
							: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
					}`}
				>
					{audioContext.isStarted ? '🎧 Ready' : '🔇 Stopped'}
				</span>
			</div>
		</div>
	);
}
