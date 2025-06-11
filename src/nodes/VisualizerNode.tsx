import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { GridBlock } from '../components/GridBlock';
import { GridSlider } from '../components/ui/GridSlider';
import { GridSelect } from '../components/ui/GridSelect';
import { useToneAnalyser } from '../hooks/useToneAnalyser';
import { useToneConnections } from '../hooks/useToneConnections';
import { useNodeOperations } from '../hooks/useNodeOperations';
import AudioVisualizer from '../components/AudioVisualizer';
import type { VisualizerNode } from './types';

/**
 * Visualizer Node - Audio spectrum analyzer and waveform display
 * Updated with grid-based layout and components
 */

// Grid configuration for visualizer node
const VISUALIZER_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

export function VisualizerNode({
	id,
	data,
	selected,
}: NodeProps<VisualizerNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Initialize analyser controls
	const { updateSize, updateSmoothing, getAnalyserL, getAnalyserR, params } =
		useToneAnalyser(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Get analysers for visualization
	const analyserL = getAnalyserL();
	const analyserR = getAnalyserR();

	// FFT size options for the select dropdown
	const fftSizeOptions = [
		{ value: 256, label: '256' },
		{ value: 512, label: '512' },
		{ value: 1024, label: '1024' },
		{ value: 2048, label: '2048' },
	];

	return (
		<BaseNode
			variant='signal'
			gridWidth={VISUALIZER_NODE_CONFIG.gridWidth}
			gridHeight={VISUALIZER_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Audio Visualizer'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Visualizer Display */}
				<GridBlock
					gridWidth={12}
					gridHeight={12}
					gridX={0}
					gridY={1.5}
					showDimensions={false}
				>
					<div className='w-full h-full p-1'>
						<AudioVisualizer
							analyserL={analyserL || undefined}
							analyserR={analyserR || undefined}
							isPlaying={params.isConnected}
							fillContainer={true}
						/>
					</div>
				</GridBlock>

				{/* FFT Size Control */}
				<GridSelect
					gridWidth={3}
					gridHeight={2}
					gridX={0}
					gridY={13.5}
					label={`FFT Size`}
					layout='stacked'
					textSize='lg'
					selectProps={{
						value: params.size,
						options: fftSizeOptions,
						onChange: (e) =>
							updateSize(parseInt((e.target as HTMLSelectElement).value)),
						'aria-label': 'FFT Size control',
					}}
				/>

				{/* Smoothing Control */}
				<GridSlider
					gridWidth={3}
					gridHeight={2}
					gridX={3}
					gridY={13.5}
					label='Smoothing'
					layout='stacked'
					textSize='lg'
					sliderProps={{
						value: params.smoothing,
						min: 0,
						max: 1,
						step: 0.01,
						formatValue: (val: number) => val.toFixed(2),
						onChange: (e) =>
							updateSmoothing(parseFloat((e.target as HTMLInputElement).value)),
						showMinMax: false,
						'aria-label': 'Smoothing control',
					}}
				/>

				{/* Connection Status */}
				<GridBlock
					gridWidth={6}
					gridHeight={1}
					gridX={6}
					gridY={14}
					showDimensions={false}
				>
					<div className='w-full h-full flex justify-center items-center'>
						<div className='text-center'>
							<div className='text-lg font-medium'>
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
				</GridBlock>
			</div>

			{/* Left audio input handle */}
			<GridNodeHandle
				id='audio-in-L'
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={VISUALIZER_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
			{/* Right audio input handle */}
			<GridNodeHandle
				id='audio-in-R'
				type='target'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={VISUALIZER_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
		</BaseNode>
	);
}
