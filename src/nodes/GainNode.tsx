import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { GridBlock } from '../components/GridBlock';
import { GridSlider } from '../components/ui/GridSlider';
import { GridButton } from '../components/ui/GridButton';
import { useToneGain } from '../hooks/useToneGain';
import { useToneConnections } from '../hooks/useToneConnections';
import { useNodeOperations } from '../hooks/useNodeOperations';
import type { GainNode } from './types';

/**
 * Gain Node - Controls audio signal amplitude
 * Updated with grid-based layout and components
 */

// Grid configuration for gain node
const GAIN_NODE_CONFIG = {
	gridWidth: 7,
	gridHeight: 5,
} as const;

export function GainNode({
	id,
	data,
	selected,
	positionAbsoluteX,
	positionAbsoluteY,
}: NodeProps<GainNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Format position values
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	// Initialize gain controls
	const { updateGain, updateMute, params } = useToneGain(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	const handleMuteToggle = () => {
		updateMute(!params.mute);
	};

	return (
		<BaseNode
			variant='component'
			gridWidth={GAIN_NODE_CONFIG.gridWidth}
			gridHeight={GAIN_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Gain'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Position Display */}
				<GridBlock
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={1}
					showDimensions={false}
				>
					<div className='w-full h-full flex justify-center items-center'>
						<div className='text-center'>
							<div className='text-xs text-gray-600 dark:text-gray-400'>
								<span className='font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
									X: {x}px, Y: {y}px
								</span>
							</div>
						</div>
					</div>
				</GridBlock>

				{/* Gain Slider */}
				<GridSlider
					gridWidth={5}
					gridHeight={2}
					gridX={1}
					gridY={2}
					sliderProps={{
						value: params.gain,
						min: 0,
						max: 2,
						step: 0.01,
						formatValue: (val) => val.toFixed(2),
						onChange: (e) => updateGain(parseFloat(e.target.value)),
						disabled: params.mute,
						showMinMax: true,
						'aria-label': 'Gain control',
					}}
					label='Gain'
				/>

				{/* Mute Button */}
				<GridButton
					gridWidth={5}
					gridHeight={1}
					gridX={1}
					gridY={4}
					buttonLabel={params.mute ? '🔇 Muted' : '🔊 Active'}
					onClick={handleMuteToggle}
					aria-label='Toggle mute'
					disabled={false}
				/>
			</div>

			{/* Input handle - grid aligned */}
			<GridNodeHandle
				id={`${id}-audio-in`}
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={GAIN_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
			{/* Output handle - grid aligned */}
			<GridNodeHandle
				id={`${id}-audio-out`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={GAIN_NODE_CONFIG.gridHeight / 2}
				size='md'
			/>
		</BaseNode>
	);
}
