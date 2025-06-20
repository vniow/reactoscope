import { type NodeProps, Position } from '@xyflow/react';
import { useCallback, type JSX, type ChangeEvent } from 'react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridButton } from '../shared/components/ui/GridButton';
import { useToneGain } from '../audio/hooks/useToneGain';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import type { GainNode as GainNodeType } from './types';

// Grid configuration for gain node
const GAIN_NODE_CONFIG = {
	gridWidth: 4,
	gridHeight: 4,
} as const;

/**
 * React component for a Gain audio node in the React Flow graph.
 * Controls audio signal amplitude with gain and mute functionality.
 * Provides UI controls for adjusting gain level and toggling mute state.
 *
 * @param id - The unique identifier of the node.
 * @param data - Data associated with the node, including label and variant.
 * @param selected - Boolean indicating if the node is currently selected.
 * @returns A JSX element representing the gain node.
 */
export function GainNode({
	id,
	data,
	selected = false,
}: NodeProps<GainNodeType>): JSX.Element {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Initialize gain controls
	const { updateGain, updateMute, params } = useToneGain(id);

	/**
	 * Handles node deletion with proper cleanup.
	 */
	const handleDelete = useCallback((): void => {
		deleteNode(id);
	}, [deleteNode, id]);

	/**
	 * Handles mute toggle functionality.
	 */
	const handleMuteToggle = useCallback((): void => {
		updateMute(!params.mute);
	}, [updateMute, params.mute]);

	/**
	 * Handles gain slider changes.
	 * @param event - The input change event.
	 */
	const handleGainChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void => {
			updateGain(parseFloat(event.target.value));
		},
		[updateGain]
	);

	/**
	 * Formats the gain value for display.
	 * @param value - The gain value.
	 * @returns Formatted string with two decimal places.
	 */
	const formatGainValue = useCallback((value: number): string => {
		return value.toFixed(2);
	}, []);

	return (
		<BaseNode
			gridWidth={GAIN_NODE_CONFIG.gridWidth}
			gridHeight={GAIN_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Gain'}
			variant={data.variant || 'event'} // Use variant from data, default to event for pastel yellow
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Gain Slider */}
				<GridSlider
					gridWidth={3}
					gridHeight={2}
					gridX={0.5}
					gridY={1}
					sliderProps={{
						value: params.gain,
						min: 0,
						max: 1,
						step: 0.01,
						formatValue: formatGainValue,
						onChange: handleGainChange,
						disabled: params.mute,
						showMinMax: true,
						'aria-label': 'Gain control',
					}}
					label='Gain'
					layout='stacked'
					textSize='lg'
				/>

				{/* Mute Button */}
				<GridButton
					gridWidth={3}
					gridHeight={1}
					gridX={0.5}
					gridY={3}
					buttonLabel={params.mute ? 'Muted' : 'Active'}
					variant={params.mute ? 'warning' : 'node-variant'}
					icon={params.mute ? '🔇' : '🔊'}
					layout='fill'
					onClick={handleMuteToggle}
					aria-label='Toggle mute'
					disabled={false}
				/>
			</div>

			{/* Input handle - grid aligned (circle SVG icon) */}
			<GridNodeHandle
				id={`${id}-audio-in`}
				type='target'
				mode='static'
				position={Position.Left}
				gridX={0}
				gridY={1}
				size='md'
			/>
			{/* Output handle - grid aligned (square SVG icon) */}
			<GridNodeHandle
				id={`${id}-audio-out`}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={1}
				size='md'
			/>
		</BaseNode>
	);
}
