/**
 * Placeholder node components for the node system
 *
 * These components serve as temporary placeholders while the full audio system is being developed.
 * They follow the component composition pattern and demonstrate proper variant usage.
 *
 * @module PlaceholderNodes
 */
import { Position, type NodeProps, type Node } from '@xyflow/react';
import { BaseNode } from '../shared/components/BaseNode';
import { NodeHandle } from '../shared/components/NodeHandle';
import { GridControl } from '../shared/components/ui/GridControl';
import type { ComponentVariant } from '../shared/types/ui';
import type { BaseNodeData } from './types';

// Base placeholder node interface
interface PlaceholderNodeData extends BaseNodeData {
	label?: string;
	description?: string;
}

// Define placeholder node types
export type CoreNode = Node<PlaceholderNodeData, 'core'>;
export type SourceNode = Node<PlaceholderNodeData, 'source'>;
export type InstrumentNode = Node<PlaceholderNodeData, 'instrument'>;
export type EffectNode = Node<PlaceholderNodeData, 'effect'>;
export type ComponentNode = Node<PlaceholderNodeData, 'component'>;
export type SignalNode = Node<PlaceholderNodeData, 'signal'>;
export type EventNode = Node<PlaceholderNodeData, 'event'>;
export type UtilityNode = Node<PlaceholderNodeData, 'unit'>;

/**
 * Generic placeholder node component following component composition pattern
 * Uses BaseNode for consistent styling and behavior
 *
 * @param id - Node identifier
 * @param selected - Whether the node is currently selected
 * @param data - Node data containing label and description
 * @param variant - Component variant for styling
 * @param title - Default title if not provided in data
 * @param description - Node description text
 */
function PlaceholderNode({
	id,
	selected = false,
	data,
	variant,
	title,
	description,
}: {
	id: string;
	selected?: boolean;
	data: PlaceholderNodeData;
	variant: ComponentVariant;
	title: string;
	description: string;
}) {
	return (
		<BaseNode
			variant={variant}
			nodeId={id as string}
			selected={selected}
			title={data.label || title}
			className='w-grid-4 h-grid-4'
		>
			<div className='flex flex-col space-y-2 p-2'>
				<div className='text-node-secondary text-xs'>{description}</div>

				<div className='flex items-center space-x-2'>
					<div
						className='w-3 h-3 rounded-full'
						style={{ backgroundColor: 'var(--node-accent)' }}
					/>
					<span className='text-node-primary text-xs font-medium'>
						{variant.toUpperCase()}
					</span>
				</div>

				<GridControl
					type='button'
					buttonLabel='Configure'
					onClick={() => console.log(`Configuring ${variant} node:`, id)}
					variant='node-variant'
					className='w-full h-6 text-xs'
				/>
			</div>

			{/* Input handle */}
			<NodeHandle
				id={`${id}-in`}
				type='target'
				position={Position.Left}
				size='sm'
			/>
			{/* Output handle */}
			<NodeHandle
				id={`${id}-out`}
				type='source'
				position={Position.Right}
				size='sm'
			/>
		</BaseNode>
	);
}

// Core System Components
export function CoreNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<CoreNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='core'
			title='Core System'
			description='Master context, destinations, and core audio infrastructure'
		/>
	);
}

// Audio Sources
export function SourceNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<SourceNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='source'
			title='Audio Source'
			description='Oscillators, players, microphones, and input sources'
		/>
	);
}

// Instruments
export function InstrumentNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<InstrumentNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='instrument'
			title='Instrument'
			description='Synthesizers, samplers, and musical instruments'
		/>
	);
}

// Effects
export function EffectNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<EffectNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='effect'
			title='Audio Effect'
			description='Reverb, delay, filters, and audio processing effects'
		/>
	);
}

// Signal Components
export function ComponentNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<ComponentNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='component'
			title='Signal Component'
			description='Gain, panner, mixer, and signal routing components'
		/>
	);
}

// Signal Processing
export function SignalNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<SignalNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='signal'
			title='Signal Processor'
			description='Analyzers, FFT, meters, and signal analysis tools'
		/>
	);
}

// Event-based
export function EventNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<EventNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='event'
			title='Event Controller'
			description='Sequences, parts, transport, and timing control'
		/>
	);
}

// Already have DebugNode as unit variant, but let's create a generic utility node
export function UtilityNodeComponent({
	id,
	data,
	selected = false,
}: NodeProps<UtilityNode>) {
	return (
		<PlaceholderNode
			id={id as string}
			data={data}
			selected={selected}
			variant='unit'
			title='Utility'
			description='Frequency converters, time utilities, and helper tools'
		/>
	);
}
