import { Position, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../../shared/stores/appStore';
import type { SignalNodeData } from '../types';

export function SignalNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: SignalNodeData }) {
	const isPlaying = useAppStore((state) => state.isPlaying);
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const nodeId = id as string;
	const nodeData = data as SignalNodeData;
	const isSelected = selected as boolean;

	// Register audio node on mount
	useEffect(() => {
		registerAudioNode(nodeId, 'signal', {
			value: nodeData.value ?? 0,
			min: nodeData.min,
			max: nodeData.max,
			units: nodeData.units,
		});
		return () => unregisterAudioNode(nodeId);
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	const [value, setValue] = useAudioNodeParam<number>(
		nodeId,
		'value',
		nodeData.value ?? 0,
		{ min: nodeData.min ?? -1, max: nodeData.max ?? 1, rampTime: 0.05 }
	);

	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			value,
			audioParams: { value },
		});
	}, [nodeId, value, updateNode]);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Signal'
			variant='source'
		>
			<div className='flex justify-center mb-4 h-10 bg-node-accent/10 rounded-lg items-center'>
				<span className='text-lg font-mono'></span>
			</div>
			{isPlaying && (
				<div className='flex items-center justify-center mb-2'>
					<div className='w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2' />
					<span className='text-xs text-green-500'>Playing</span>
				</div>
			)}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Value'
					value={value}
					min={nodeData.min ?? -1}
					max={nodeData.max ?? 1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) =>
						`${val}${nodeData.units ? ' ' + nodeData.units : ''}`
					}
					onChange={(e) => setValue(Number(e.target.value))}
					className='h-16'
				/>
			</div>
			<NodeHandle
				id='output'
				type='source'
				position={Position.Right}
				label='Out'
			/>
		</BaseNode>
	);
}
