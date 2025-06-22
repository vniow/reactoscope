import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { updateDestinationGain } from '../audio/stores/audioSlice';
import type { CustomNode } from '../shared/types';

export function DestinationNode({ id, data }: NodeProps<CustomNode>) {
	const [volume, setVolume] = useState((data?.volume as number) || 0.7);
	const [muted, setMuted] = useState((data?.muted as boolean) || false);

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value);
		setVolume(newVolume);
		updateDestinationGain(id, newVolume);
	};

	const toggleMute = () => {
		setMuted(!muted);
		updateDestinationGain(id, muted ? volume : 0);
	};

	return (
		<div className='react-flow__node-default bg-white dark:bg-gray-800 border-2 border-green-500 rounded-lg p-4 min-w-48'>
			<div className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2'>
				Destination
			</div>

			<div className='space-y-2'>
				<div>
					<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
						Volume
					</label>
					<input
						type='range'
						min='0'
						max='1'
						step='0.01'
						value={volume}
						onChange={handleVolumeChange}
						className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
					/>
					<span className='text-xs text-gray-500'>
						{muted ? 'Muted' : `${Math.round(volume * 100)}%`}
					</span>
				</div>

				<button
					onClick={toggleMute}
					className={`w-full px-3 py-1 text-xs rounded ${
						muted
							? 'bg-red-500 hover:bg-red-600 text-white'
							: 'bg-gray-500 hover:bg-gray-600 text-white'
					}`}
				>
					{muted ? 'Unmute' : 'Mute'}
				</button>

				<div className='text-xs text-center text-gray-500'>🔊 Audio Output</div>
			</div>

			{/* Input handle */}
			<Handle
				type='target'
				position={Position.Left}
				id='audio-in-0'
				className='w-3 h-3 bg-green-500 border-2 border-white'
			/>
		</div>
	);
}
