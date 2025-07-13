import { useEffect } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import type { BaseNodeData } from '../types';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../../shared/stores/appStore';

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
}: NodeProps & { data: FilterNodeData }) {
	const nodeId = id as string;
	const nodeData = (data ?? {}) as FilterNodeData;
	const isSelected = selected as boolean;

	// Use stable references for register/unregister callbacks
	const registerAudioNode = useAppStore.getState().registerAudioNode;
	const unregisterAudioNode = useAppStore.getState().unregisterAudioNode;

	// Register audio node only on mount/unmount
	// Do NOT include nodeData or parameter values in dependencies to avoid recreating the node on every param change
	useEffect(() => {
		registerAudioNode(nodeId, 'filter', {
			type: nodeData.type || 'lowpass',
			frequency: nodeData.frequency || 1000,
			Q: nodeData.Q || 1,
			gain: nodeData.gain || 0,
		});

		return () => {
			unregisterAudioNode(nodeId);
		};
		// Only run on mount/unmount. registerAudioNode/unregisterAudioNode are stable from Zustand getState.
	}, [nodeId]);

	// Set up controls for audio parameters using our custom hook
	const [type, setType] = useAudioNodeParam<FilterNodeData['type']>(
		nodeId,
		'type',
		nodeData.type || 'lowpass'
	);
	const [frequency, setFrequency] = useAudioNodeParam<number>(
		nodeId,
		'frequency',
		nodeData.frequency || 1000,
		{ min: 1, max: 20000 }
	);
	const [Q, setQ] = useAudioNodeParam<number>(nodeId, 'Q', nodeData.Q || 1, {
		min: 0.1,
		max: 20,
	});
	const [gain, setGain] = useAudioNodeParam<number>(
		nodeId,
		'gain',
		nodeData.gain || 0,
		{ min: -40, max: 40 }
	);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
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
				<GridControl
					type='select'
					label='Type'
					value={type || ''}
					onChange={(e) => setType(e.target.value as FilterNodeData['type'])}
					options={[
						{ value: 'lowpass', label: 'Lowpass' },
						{ value: 'highpass', label: 'Highpass' },
						{ value: 'bandpass', label: 'Bandpass' },
						{ value: 'notch', label: 'Notch' },
						{ value: 'allpass', label: 'Allpass' },
					]}
					layout='stacked'
				/>
				<GridControl
					type='slider'
					label='Frequency'
					value={frequency}
					min={1}
					max={20000}
					step={1}
					onChange={(e) => setFrequency(Number(e.target.value))}
					formatValue={(val) => `${val} Hz`}
					showValue
					layout='stacked'
				/>
				<GridControl
					type='slider'
					label='Q'
					value={Q}
					min={0.1}
					max={20}
					step={0.1}
					onChange={(e) => setQ(Number(e.target.value))}
					formatValue={(val) => val.toFixed(1)}
					showValue
					layout='stacked'
				/>
				<GridControl
					type='slider'
					label='Gain'
					value={gain}
					min={-40}
					max={40}
					step={0.1}
					onChange={(e) => setGain(Number(e.target.value))}
					formatValue={(val) => `${val} dB`}
					showValue
					layout='stacked'
				/>
			</div>
		</BaseNode>
	);
}
