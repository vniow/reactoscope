import { Position, type NodeProps } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useNodes } from '../hooks/useAppStore';
import { useToneGain } from '../hooks/useToneGain';
import { useToneConnections } from '../hooks/useToneConnections';
import type { GainNode } from './types';

export function GainNode({ id, data, selected }: NodeProps<GainNode>) {
	// Handle positions from the Zustand store
	const inputPosition = useHandlePosition(id, 'audio-in', Position.Top);
	const outputPosition = useHandlePosition(id, 'audio-out', Position.Bottom);

	// Get the removeNode function from the store
	const { removeNode } = useNodes();

	// Initialize gain controls
	const { updateGain, updateMute, params } = useToneGain(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const gain = parseFloat(e.target.value);
		updateGain(gain);
	};

	const handleMuteToggle = () => {
		updateMute(!params.mute);
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		e.stopPropagation();
	};

	return (
		<BaseNode
			variant='audio'
			gridWidth={data.gridWidth ?? 3}
			gridHeight={data.gridHeight ?? 4}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Gain'}
		>
			<div className='flex flex-col h-full justify-center p-2 space-y-3'>
				{/* Gain Icon */}
				<div className='text-center'>
					<div className='text-2xl mb-1'>🎚️</div>
					<div className='text-xs text-gray-600 dark:text-gray-400'>
						Volume Control
					</div>
				</div>

				{/* Gain Slider */}
				<div className='space-y-2'>
					<label className='text-xs font-medium text-gray-700 dark:text-gray-300'>
						Gain: {params.gain.toFixed(2)}
					</label>
					<input
						type='range'
						min='0'
						max='2'
						step='0.01'
						value={params.gain}
						onChange={handleGainChange}
						onPointerDown={handlePointerDown}
						className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider'
						disabled={params.mute}
					/>
					<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
						<span>0</span>
						<span>1</span>
						<span>2</span>
					</div>
				</div>

				{/* Mute Button */}
				<button
					onClick={handleMuteToggle}
					onPointerDown={handlePointerDown}
					className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
						params.mute
							? 'bg-red-500 hover:bg-red-600 text-white'
							: 'bg-gray-500 hover:bg-gray-600 text-white'
					}`}
				>
					{params.mute ? '🔇 Muted' : '🔊 Active'}
				</button>

				{/* Gain Level Indicator */}
				<div className='text-center'>
					<div className='text-xs text-orange-600 dark:text-orange-400'>
						{params.mute ? 'MUTED' : `${Math.round(params.gain * 100)}%`}
					</div>
				</div>
			</div>

			{/* Audio Input Handle */}
			<NodeHandle
				id='audio-in'
				type='target'
				position={inputPosition}
				variant='audio'
			/>

			{/* Audio Output Handle */}
			<NodeHandle
				id='audio-out'
				type='source'
				position={outputPosition}
				variant='audio'
			/>
		</BaseNode>
	);
}
