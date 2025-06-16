import {
	useReactFlow,
	type NodeProps,
	Position,
	type Edge,
} from '@xyflow/react'; // Import Position as a value
import { useCallback, type ChangeEvent, type JSX } from 'react'; // Use type-only import for ChangeEvent

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import {
	GridSlider,
	type SliderProps,
} from '../shared/components/ui/GridSlider'; // Assuming SliderProps is exported
import { GridButton } from '../shared/components/ui/GridButton';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import {
	useToneOscillator,
	type ToneOscillatorControls,
	type WaveType,
} from '../audio/hooks/useToneOscillator';
import type { OscillatorNode as OscillatorNodeType } from './types';

// Grid configuration for the oscillator node
const OSCILLATOR_NODE_GRID_CONFIG = {
	gridWidth: 5,
	gridHeight: 8.5,
} as const;

/**
 * React component for an Oscillator audio node in the React Flow graph.
 * It provides UI controls for managing the oscillator's parameters like
 * frequency, detune, wave type, and playback state.
 *
 * @param id - The unique identifier of the node.
 * @param data - Data associated with the node, including label and variant.
 * @param selected - Boolean indicating if the node is currently selected.
 * @returns A JSX element representing the oscillator node.
 */
export function OscillatorNode({
	id,
	data,
	selected = false,
}: NodeProps<OscillatorNodeType>): JSX.Element {
	// Hook for managing the underlying Tone.js oscillator instance
	const {
		start,
		stop,
		updateFrequency,
		updateDetune,
		updateWaveType,
		isPlaying,
		params,
	}: ToneOscillatorControls = useToneOscillator(id);

	// Hook to manage audio connections for this node
	useToneConnections(id);

	// Correctly type the React Flow instance.
	const reactFlowInstance = useReactFlow<
		OscillatorNodeType,
		Edge<Record<string, unknown>>
	>();

	/**
	 * Removes the current node and its associated edges from the graph.
	 */
	const handleRemoveNode = useCallback((): void => {
		reactFlowInstance.setNodes((nds) => nds.filter((node) => node.id !== id));
		reactFlowInstance.setEdges((eds) =>
			eds.filter((edge) => edge.source !== id && edge.target !== id)
		);
		console.log(`🗑️ Removed oscillator node ${id} and its edges.`);
	}, [reactFlowInstance, id]);

	/**
	 * Handles clicks on wave type selector buttons.
	 * @param type - The selected wave type.
	 */
	const handleWaveTypeClick = useCallback(
		(type: WaveType): void => {
			updateWaveType(type);
		},
		[updateWaveType]
	);

	/**
	 * Formats the frequency value for display.
	 * @param value - The frequency value in Hz.
	 * @returns Formatted string (e.g., "440 Hz").
	 */
	const formatFrequencyDisplay = useCallback(
		(value: number): string => `${value} Hz`,
		[]
	);

	/**
	 * Formats the detune value for display.
	 * @param value - The detune value in cents.
	 * @returns Formatted string (e.g., "+50 cents").
	 */
	const formatDetuneDisplay = useCallback(
		(value: number): string => `${value > 0 ? '+' : ''}${value} cents`,
		[]
	);

	/**
	 * Toggles the playback state of the oscillator.
	 */
	const handlePlayStopClick = useCallback((): void => {
		if (isPlaying) {
			stop();
		} else {
			start();
		}
	}, [isPlaying, start, stop]);

	/**
	 * Handles changes from the frequency slider.
	 * @param event - The input change event.
	 */
	const handleFrequencyChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void => {
			updateFrequency(Number(event.target.value));
		},
		[updateFrequency]
	);

	/**
	 * Handles changes from the detune slider.
	 * @param event - The input change event.
	 */
	const handleDetuneChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void => {
			updateDetune(Number(event.target.value));
		},
		[updateDetune]
	);

	// Slider properties for frequency control
	const frequencySliderProps: SliderProps = {
		value: params.frequency,
		min: 80,
		max: 2000,
		step: 1,
		formatValue: formatFrequencyDisplay,
		onChange: handleFrequencyChange,
		'aria-label': 'Frequency control',
	};

	// Slider properties for detune control
	const detuneSliderProps: SliderProps = {
		value: params.detune,
		min: -1200,
		max: 1200,
		step: 1,
		formatValue: formatDetuneDisplay,
		onChange: handleDetuneChange,
		'aria-label': 'Detune control',
	};

	return (
		<BaseNode
			variant={data.variant || 'source'}
			gridWidth={OSCILLATOR_NODE_GRID_CONFIG.gridWidth}
			gridHeight={OSCILLATOR_NODE_GRID_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={handleRemoveNode}
			title={data.label || 'Oscillator'}
		>
			<div className='relative flex flex-col w-full h-full p-1 space-y-1 md:p-2 md:space-y-2 overflow-visible'>
				{/* Wave Type Selection Buttons */}
				<div className='grid grid-cols-2 gap-1'>
					{(['sine', 'square', 'triangle', 'sawtooth'] as const).map((wave) => (
						<GridButton
							key={wave}
							gridWidth={1}
							gridHeight={1}
							buttonLabel=''
							variant={params.waveType === wave ? 'node-variant' : 'secondary'}
							layout='minimal'
							size='sm'
							buttonClassName='p-0.5'
							onClick={() => handleWaveTypeClick(wave)}
							aria-label={`Select ${wave} wave`}
							icon={
								<svg
									viewBox='0 0 24 24'
									className='w-5 h-5'
								>
									<path
										d={
											wave === 'sine'
												? 'M2 12 Q6 4 10 12 T18 12'
												: wave === 'square'
													? 'M2 18 L2 6 L6 6 L6 18 L10 18 L10 6 L14 6 L14 18 L18 18'
													: wave === 'triangle'
														? 'M2 18 L7 6 L12 18 L17 6 L22 18'
														: 'M2 18 L6 6 L6 18 L10 6 L10 18 L14 6 L14 18 L18 6'
										}
										stroke='currentColor'
										strokeWidth='2'
										fill='none'
										strokeLinecap='round'
										strokeLinejoin='round'
										vectorEffect='non-scaling-stroke'
									/>
								</svg>
							}
						/>
					))}
				</div>

				{/* Frequency Slider */}
				<GridSlider
					gridWidth={OSCILLATOR_NODE_GRID_CONFIG.gridWidth - 0.5}
					gridHeight={2}
					gridX={0.25}
					gridY={3}
					label='Frequency'
					layout='stacked'
					textSize='sm'
					sliderProps={frequencySliderProps}
				/>

				{/* Detune Slider */}
				<GridSlider
					gridWidth={OSCILLATOR_NODE_GRID_CONFIG.gridWidth - 0.5}
					gridHeight={2}
					gridX={0.25}
					gridY={5}
					label='Detune'
					layout='stacked'
					textSize='sm'
					sliderProps={detuneSliderProps}
				/>

				{/* Play/Stop Button */}
				<GridButton
					gridWidth={OSCILLATOR_NODE_GRID_CONFIG.gridWidth - 1}
					gridHeight={1.25}
					gridX={0.5}
					gridY={7}
					buttonLabel={isPlaying ? 'Stop' : 'Play'}
					variant={isPlaying ? 'danger' : 'success'}
					size='md'
					layout='fill'
					onClick={handlePlayStopClick}
					aria-label={isPlaying ? 'Stop oscillator' : 'Play oscillator'}
				/>
			</div>

			{/* Output Handle */}
			<GridNodeHandle
				type='source'
				position={Position.Right}
				id={`${id}-audio-out`}
				gridX={0}
				gridY={OSCILLATOR_NODE_GRID_CONFIG.gridHeight / 2}
			/>
		</BaseNode>
	);
}
