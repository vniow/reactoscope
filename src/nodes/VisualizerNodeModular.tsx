import { useMemo, memo, useEffect, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import AudioVisualizer from '../audio/AudioVisualizer';
import { useToneAnalyserModular } from '../audio/hooks/useToneAnalyserModular';
import { useAppStore } from '../shared/stores/appStore';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import type { VisualizerNodeModular as VisualizerNodeModularType } from './types';

// Grid configuration for visualizer node
const VISUALIZER_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

/**
 * VisualizerNodeModular - A modular visualizer node that uses two separate analyser hooks
 *
 * This component demonstrates the modular approach by using two instances of the
 * useToneAnalyserModular hook to manage X and Y channel analysers independently.
 * The analysers are registered under the main node ID in the `instances` map.
 *
 * @param props - React Flow node properties
 * @returns React element representing the modular visualizer node
 */
function VisualizerNodeModular({
	id,
	data,
	selected = false,
}: NodeProps<VisualizerNodeModularType>) {
	const { addAudioNode, audioNodes } = useAppStore();
	const { deleteNode } = useNodeOperations();

	// Initialize the main audio node entry if it doesn't exist.
	// This is crucial for the connection system to find the parent node.
	useEffect(() => {
		if (!audioNodes[id]) {
			addAudioNode(id, 'visualizer', {}); // Type 'visualizer' with empty params
			console.log(`📊 Initialized main visualizer node in store: ${id}`);
		}
	}, [id, audioNodes, addAudioNode]);

	/**
	 * Event handler for node deletion with proper error handling
	 * Follows defensive programming principles
	 */
	const handleDelete = useCallback((): void => {
		try {
			deleteNode(id);
			console.log(`🗑️ Deleted modular visualizer node: ${id}`);
		} catch (error) {
			console.error(
				`🚨 Failed to delete modular visualizer node ${id}:`,
				error
			);
		}
	}, [deleteNode, id]);

	// Use two instances of the modular analyser hook for X and Y channels
	// Pass the correct targetHandle IDs: 'audio-in-X' and 'audio-in-Y'
	const analyserX = useToneAnalyserModular(id, 'X', 'audio-in-X');
	const analyserY = useToneAnalyserModular(id, 'Y', 'audio-in-Y');

	// Control functions for X channel with error handling
	const xControls = useMemo(
		() => ({
			updateSize: (size: number) => {
				try {
					analyserX.updateSize(size);
					console.log(`🎛️ Updated X channel FFT size for ${id}: ${size}`);
				} catch (error) {
					console.error(
						`🚨 Failed to update X channel FFT size for ${id}:`,
						error
					);
				}
			},
			updateSmoothing: (smoothing: number) => {
				try {
					analyserX.updateSmoothing(smoothing);
					console.log(
						`🎛️ Updated X channel smoothing for ${id}: ${smoothing.toFixed(2)}`
					);
				} catch (error) {
					console.error(
						`🚨 Failed to update X channel smoothing for ${id}:`,
						error
					);
				}
			},
		}),
		[analyserX, id]
	);

	// Control functions for Y channel with error handling
	const yControls = useMemo(
		() => ({
			updateSize: (size: number) => {
				try {
					analyserY.updateSize(size);
					console.log(`🎛️ Updated Y channel FFT size for ${id}: ${size}`);
				} catch (error) {
					console.error(
						`🚨 Failed to update Y channel FFT size for ${id}:`,
						error
					);
				}
			},
			updateSmoothing: (smoothing: number) => {
				try {
					analyserY.updateSmoothing(smoothing);
					console.log(
						`🎛️ Updated Y channel smoothing for ${id}: ${smoothing.toFixed(2)}`
					);
				} catch (error) {
					console.error(
						`🚨 Failed to update Y channel smoothing for ${id}:`,
						error
					);
				}
			},
		}),
		[analyserY, id]
	);

	// Input validation after hooks - defensive programming
	if (!id || typeof id !== 'string') {
		console.error('🚨 VisualizerNodeModular: Invalid id provided', { id });
		return (
			<div className='text-destructive p-4 text-center'>
				Error: Invalid node ID provided
			</div>
		);
	}

	// Get analyser instances for the visualizer
	const analyserXInstance = analyserX.getAnalyser();
	const analyserYInstance = analyserY.getAnalyser();

	// Determine if either analyser is connected
	const isConnected =
		analyserX.params.isConnected || analyserY.params.isConnected;

	// Get params for display (size, smoothing)
	// These now come from the hook's local state via its returned `params` object.
	const paramsX = analyserX.params;
	const paramsY = analyserY.params;

	return (
		<BaseNode
			variant='signal'
			gridWidth={VISUALIZER_NODE_CONFIG.gridWidth}
			gridHeight={VISUALIZER_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={handleDelete}
			title={data?.label || 'Visualizer (Modular)'}
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
						{analyserX.isAnalyserReady && analyserY.isAnalyserReady ? (
							<AudioVisualizer
								analyserX={analyserXInstance || undefined}
								analyserY={analyserYInstance || undefined}
								isPlaying={isConnected}
								fillContainer={true}
							/>
						) : (
							<div className='flex items-center justify-center h-full text-text-secondary'>
								Loading Analysers...
							</div>
						)}
					</div>
				</GridBlock>

				{/* Configuration Controls */}
				<GridBlock
					gridWidth={12}
					gridHeight={4}
					gridX={0}
					gridY={13}
					showDimensions={false}
				>
					<div className='flex flex-col gap-2 p-2 bg-background-secondary rounded h-full'>
						<div className='text-xs font-medium text-text-primary'>
							Modular Configuration
						</div>

						{/* X and Y Channel Controls in compact layout */}
						<div className='grid grid-cols-2 gap-2 flex-1'>
							{/* X Channel */}
							<div className='flex flex-col gap-1'>
								<div className='text-xs text-text-secondary font-medium'>
									X Channel
								</div>
								<div className='flex flex-col gap-1'>
									<div className='flex items-center justify-between'>
										<span className='text-xs text-text-secondary'>Size:</span>
										<span className='text-xs text-text-primary'>
											{paramsX.size}
										</span>
									</div>
									<input
										type='range'
										min='256'
										max='2048'
										step='256' // Common step for powers of 2
										value={paramsX.size}
										onChange={(e) =>
											xControls.updateSize(parseInt(e.target.value))
										}
										className='w-full h-1 bg-border rounded-lg appearance-none cursor-pointer'
										aria-label='X Channel FFT Size'
									/>
									<div className='flex items-center justify-between'>
										<span className='text-xs text-text-secondary'>Smooth:</span>
										<span className='text-xs text-text-primary'>
											{paramsX.smoothing.toFixed(1)}
										</span>
									</div>
									<input
										type='range'
										min='0'
										max='1'
										step='0.1'
										value={paramsX.smoothing}
										onChange={(e) =>
											xControls.updateSmoothing(parseFloat(e.target.value))
										}
										className='w-full h-1 bg-border rounded-lg appearance-none cursor-pointer'
										aria-label='X Channel Smoothing'
									/>
								</div>
							</div>

							{/* Y Channel */}
							<div className='flex flex-col gap-1'>
								<div className='text-xs text-text-secondary font-medium'>
									Y Channel
								</div>
								<div className='flex flex-col gap-1'>
									<div className='flex items-center justify-between'>
										<span className='text-xs text-text-secondary'>Size:</span>
										<span className='text-xs text-text-primary'>
											{paramsY.size}
										</span>
									</div>
									<input
										type='range'
										min='256'
										max='2048'
										step='256' // Common step for powers of 2
										value={paramsY.size}
										onChange={(e) =>
											yControls.updateSize(parseInt(e.target.value))
										}
										className='w-full h-1 bg-border rounded-lg appearance-none cursor-pointer'
										aria-label='Y Channel FFT Size'
									/>
									<div className='flex items-center justify-between'>
										<span className='text-xs text-text-secondary'>Smooth:</span>
										<span className='text-xs text-text-primary'>
											{paramsY.smoothing.toFixed(1)}
										</span>
									</div>
									<input
										type='range'
										min='0'
										max='1'
										step='0.1'
										value={paramsY.smoothing}
										onChange={(e) =>
											yControls.updateSmoothing(parseFloat(e.target.value))
										}
										className='w-full h-1 bg-border rounded-lg appearance-none cursor-pointer'
										aria-label='Y Channel Smoothing'
									/>
								</div>
							</div>
						</div>

						{/* Connection Status */}
						<div className='flex justify-center items-center gap-2 text-xs'>
							<span
								className={`px-2 py-1 rounded ${
									analyserX.params.isConnected
										? 'bg-success/10 text-success dark:bg-success/20 dark:text-success'
										: 'bg-muted text-muted-foreground'
								}`}
							>
								X: {analyserX.params.isConnected ? 'Connected' : 'Disconnected'}
							</span>
							<span
								className={`px-2 py-1 rounded ${
									analyserY.params.isConnected
										? 'bg-success/10 text-success dark:bg-success/20 dark:text-success'
										: 'bg-muted text-muted-foreground'
								}`}
							>
								Y: {analyserY.params.isConnected ? 'Connected' : 'Disconnected'}
							</span>
						</div>
					</div>
				</GridBlock>
			</div>

			{/* Input Handles using 'audio-in-X' and 'audio-in-Y' */}
			<GridNodeHandle
				id='audio-in-X' // Corrected handle ID
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={1}
				size='md'
				label='X'
			/>
			<GridNodeHandle
				id='audio-in-Y' // Corrected handle ID
				type='target'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={1}
				size='md'
				label='Y'
			/>
		</BaseNode>
	);
}

// Export memoized version following React best practices
export default memo(VisualizerNodeModular);

VisualizerNodeModular.displayName = 'VisualizerNodeModular';
