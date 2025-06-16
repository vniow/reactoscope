import { useCallback } from 'react';
import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridBlock } from '../shared/components/GridBlock';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridSelect } from '../shared/components/ui/GridSelect';
import { useToneAnalyser } from '../audio/hooks/useToneAnalyser';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import AudioVisualizer from '../audio/AudioVisualizer';
import type { VisualizerNode } from './types';

// Grid configuration for visualizer node
const VISUALIZER_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

/**
 * VisualizerNode - Audio spectrum analyzer and waveform display component
 *
 * This component provides a comprehensive audio visualization interface within the React Flow canvas,
 * featuring FFT analysis, dual-axis display, and real-time parameter controls.
 *
 * @param props - React Flow node properties
 * @returns React element representing the visualizer node
 */
export function VisualizerNode({
	id,
	data,
	selected = false,
}: NodeProps<VisualizerNode>) {
	// Hooks must be called first, before any conditional logic
	const { deleteNode } = useNodeOperations();

	// Initialize analyser controls
	const { updateSize, updateSmoothing, getAnalyserX, getAnalyserY, params } =
		useToneAnalyser(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Get analysers for visualization
	const analyserX = getAnalyserX();
	const analyserY = getAnalyserY();

	// Event handlers with useCallback for performance
	const handleDelete = useCallback((): void => {
		try {
			deleteNode(id);
			console.log(`🗑️ Deleted visualizer node: ${id}`);
		} catch (error) {
			console.error(`🚨 Failed to delete visualizer node ${id}:`, error);
		}
	}, [deleteNode, id]);

	const handleSizeChange = useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>): void => {
			try {
				const newSize = parseInt(event.target.value, 10);
				if (isNaN(newSize) || newSize <= 0) {
					console.error('🚨 Invalid FFT size value:', event.target.value);
					return;
				}
				updateSize(newSize);
				console.log(`🎛️ Updated FFT size for ${id}: ${newSize}`);
			} catch (error) {
				console.error(`🚨 Failed to update FFT size for ${id}:`, error);
			}
		},
		[updateSize, id]
	);

	const handleSmoothingChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			try {
				const newSmoothing = parseFloat(event.target.value);
				if (isNaN(newSmoothing) || newSmoothing < 0 || newSmoothing > 1) {
					console.error('🚨 Invalid smoothing value:', event.target.value);
					return;
				}
				updateSmoothing(newSmoothing);
				console.log(
					`🎛️ Updated smoothing for ${id}: ${newSmoothing.toFixed(2)}`
				);
			} catch (error) {
				console.error(`🚨 Failed to update smoothing for ${id}:`, error);
			}
		},
		[updateSmoothing, id]
	);

	const formatSmoothingValue = useCallback((value: number): string => {
		return value.toFixed(2);
	}, []);

	// Input validation after hooks
	if (!id || typeof id !== 'string') {
		console.error('🚨 VisualizerNode: Invalid id provided', { id });
		return <div>Error: Invalid node ID</div>;
	}

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
			nodeId={id}
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
							analyserX={analyserX || undefined}
							analyserY={analyserY || undefined}
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
						onChange: handleSizeChange,
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
						formatValue: formatSmoothingValue,
						onChange: handleSmoothingChange,
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

			{/* X axis audio input handle */}
			<GridNodeHandle
				id='audio-in-X'
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={1}
				size='md'
			/>
			{/* Y axis audio input handle */}
			<GridNodeHandle
				id='audio-in-Y'
				type='target'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={1}
				size='md'
			/>
		</BaseNode>
	);
}
