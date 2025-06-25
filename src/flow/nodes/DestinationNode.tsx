import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { updateDestinationGain } from '../../audio/stores/audioSlice';
import type { CustomNode } from '../../shared/types';
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedLabel,
	ThemedValue,
	ThemedRangeInput,
} from '../../shared/components/ThemedControls';
import { getNodeTypeClasses } from '../../shared/config/grid';

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
		<ThemedNode
			nodeType='destination'
			title='Destination'
			handles={{
				inputs: [{ id: 'audio-in-0' }],
			}}
			className={getNodeTypeClasses('destination')}
		>
			{/* Volume Control */}
			<div>
				<ThemedLabel nodeType='destination'>Volume</ThemedLabel>
				<ThemedRangeInput
					nodeType='destination'
					min='0'
					max='1'
					step='0.01'
					value={volume}
					onChange={handleVolumeChange}
				/>
				<ThemedValue nodeType='destination'>
					{muted ? 'Muted' : `${Math.round(volume * 100)}%`}
				</ThemedValue>
			</div>

			{/* Mute Button */}
			<ThemedButton
				nodeType='destination'
				onClick={toggleMute}
				active={muted}
			>
				{muted ? 'Unmute' : 'Mute'}
			</ThemedButton>

			<div className='text-xs text-center opacity-70'>🔊 Audio Output</div>
		</ThemedNode>
	);
}
