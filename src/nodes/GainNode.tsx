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
}: NodeProps<GainNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Initialize gain controls
	const { updateGain, updateMute, params } = useToneGain(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	const handleMuteToggle = () => {
		updateMute(!params.mute);
	};

	return (
		<BaseNode
			gridWidth={GAIN_NODE_CONFIG.gridWidth}
			gridHeight={GAIN_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Gain'}
			variant={data.variant || 'event'} // Use variant from data, default to event for pastel yellow
		>
			<div className='relative w-full h-full overflow-visible'>


				{/* Gain Slider with Volume Indicator */}
				<GridSlider
					gridWidth={5}
					gridHeight={3}
					gridX={1}
					gridY={1}
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
					layout='stacked'
					visualIndicator={{
						type: 'volume',
						showBars: true,
						barCount: 5,
						animated: true,
						color: 'green'
					}}
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
