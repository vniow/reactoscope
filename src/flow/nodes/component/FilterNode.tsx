import { useState } from 'react';
import { Position } from '@xyflow/react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import type { BaseNodeData } from '../types';

export interface FilterNodeData extends BaseNodeData {
	type?: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass';
	frequency?: number;
	Q?: number;
	gain?: number;
}

export function FilterNode({
	id,
	data,
	selected = false,
}: {
	id: string;
	data: FilterNodeData;
	selected?: boolean;
}) {
	const nodeId = id as string;
	const nodeData = (data ?? {}) as FilterNodeData;
	const [type, setType] = useState<FilterNodeData['type']>(
		nodeData.type ?? 'lowpass'
	);
	const [frequency, setFrequency] = useState<number>(
		nodeData.frequency ?? 1000
	);
	const [Q, setQ] = useState<number>(nodeData.Q ?? 1);
	const [gain, setGain] = useState<number>(nodeData.gain ?? 0);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={selected}
			variant='component'
			title='Filter'
		>
			{/* Input handle */}
			<NodeHandle
				type='target'
				position={Position.Left}
				id='in'
			/>
			{/* Output handle */}
			<NodeHandle
				type='source'
				position={Position.Right}
				id='out'
			/>
			{/* Filter controls */}
			<div className='flex flex-col gap-2 p-2'>
				<label className='flex flex-col text-xs'>
					Type
					<select
						className='bg-primary text-primary-foreground rounded p-1 mt-1'
						value={type}
						onChange={(e) => setType(e.target.value as FilterNodeData['type'])}
					>
						<option value='lowpass'>Lowpass</option>
						<option value='highpass'>Highpass</option>
						<option value='bandpass'>Bandpass</option>
						<option value='notch'>Notch</option>
						<option value='allpass'>Allpass</option>
					</select>
				</label>
				<label className='flex flex-col text-xs'>
					Frequency
					<input
						type='number'
						min={20}
						max={20000}
						step={1}
						className='bg-primary text-primary-foreground rounded p-1 mt-1'
						value={frequency}
						onChange={(e) => setFrequency(Number(e.target.value))}
					/>
				</label>
				<label className='flex flex-col text-xs'>
					Q
					<input
						type='number'
						min={0.1}
						max={20}
						step={0.1}
						className='bg-primary text-primary-foreground rounded p-1 mt-1'
						value={Q}
						onChange={(e) => setQ(Number(e.target.value))}
					/>
				</label>
				<label className='flex flex-col text-xs'>
					Gain
					<input
						type='number'
						min={-40}
						max={40}
						step={0.1}
						className='bg-primary text-primary-foreground rounded p-1 mt-1'
						value={gain}
						onChange={(e) => setGain(Number(e.target.value))}
					/>
				</label>
			</div>
		</BaseNode>
	);
}
