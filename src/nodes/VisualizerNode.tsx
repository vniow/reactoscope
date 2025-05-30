import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { Slider } from '../components/ui';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useNodes } from '../hooks/useAppStore';
import { useToneAnalyser } from '../hooks/useToneAnalyser';
import { useToneConnections } from '../hooks/useToneConnections';
import AudioVisualizer from '../components/AudioVisualizer';
import type { VisualizerNode } from './types';

export function VisualizerNode({
	id,
	data,
	selected,
}: NodeProps<VisualizerNode>) {
	// Handle positions from the Zustand store
	const inputPositionL = useHandlePosition(id, 'audio-in-L', Position.Left);
	const inputPositionR = useHandlePosition(id, 'audio-in-R', Position.Right);

	// Get the removeNode function from the store
	const { removeNode } = useNodes();

	// Initialize analyser controls
	const { updateSize, updateSmoothing, getAnalyserL, getAnalyserR, params } =
		useToneAnalyser(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Get analysers for visualization
	const analyserL = getAnalyserL();
	const analyserR = getAnalyserR();

	const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const size = parseInt(e.target.value);
		updateSize(size);
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		e.stopPropagation();
	};

	return (
		<BaseNode
			variant='audio'
			gridWidth={data.gridWidth ?? 6}
			gridHeight={data.gridHeight ?? 8}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Audio Visualizer'}
		>
			<div className='flex flex-col h-full space-y-3'>
				{/* Visualizer Display */}
				<div className='flex-1 min-h-0'>
					<AudioVisualizer
						analyserL={analyserL || undefined}
						analyserR={analyserR || undefined}
						isPlaying={params.isConnected}
					/>
				</div>

				{/* Controls */}
				<div className='space-y-2'>
					{/* FFT Size Control */}
					<div className='space-y-1'>
						<label className='text-xs font-medium text-gray-700 dark:text-gray-300'>
							FFT Size: {params.size}
						</label>
						<select
							value={params.size}
							onChange={handleSizeChange}
							onPointerDown={handlePointerDown}
							className='nodrag w-full text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1'
						>
							<option value={256}>256</option>
							<option value={512}>512</option>
							<option value={1024}>1024</option>
							<option value={2048}>2048</option>
						</select>
					</div>

					{/* Smoothing Control */}
					<Slider
						label='Smoothing'
						value={params.smoothing}
						min={0}
						max={1}
						step={0.01}
						formatValue={(val) => val.toFixed(2)}
						onChange={(e) => updateSmoothing(parseFloat(e.target.value))}
						showMinMax={true}
					/>

					{/* Connection Status */}
					<div className='text-center'>
						<div className='text-xs text-gray-600 dark:text-gray-400'>
							{params.isConnected ? (
								<span className='text-green-600 dark:text-green-400'>
									🎵 Audio Connected
								</span>
							) : (
								<span className='text-orange-600 dark:text-orange-400'>
									🔌 Waiting for input...
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Audio Input Handles */}
			<NodeHandle
				id='audio-in-L'
				type='target'
				position={inputPositionL}
				variant='audio'
			/>
			<NodeHandle
				id='audio-in-R'
				type='target'
				position={inputPositionR}
				variant='audio'
			/>
		</BaseNode>
	);
}
