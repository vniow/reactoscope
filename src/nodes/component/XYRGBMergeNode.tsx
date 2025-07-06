/**
 * XYRGB Merge Node Component
 *
 * Merges 5 mono channels (X, Y, R, G, B) into a single 5-channel output using Tone.Merge.
 * Follows Reactoscope guidelines: explicit types, semantic styling, robust audio node registration.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';
import * as Tone from 'tone';

interface XYRGBMergeNodeData extends BaseNodeData {}

export function XYRGBMergeNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: XYRGBMergeNodeData }) {
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const updateNode = useAppStore((state) => state.updateNode);
	const nodeId = id as string;
	const isSelected = selected as boolean;

	// Register Tone.Merge node on mount
	useEffect(() => {
		// 5-channel merger
		const merger = new Tone.Merge(5);
		// Register each input as a separate node for connection logic
		const channelMap = [
			{ key: 'x', index: 0 },
			{ key: 'y', index: 1 },
			{ key: 'r', index: 2 },
			{ key: 'g', index: 3 },
			{ key: 'b', index: 4 },
		];
		channelMap.forEach(({ key, index }) => {
			// For each input, register a Gain node that feeds the correct merger input
			const gain = new Tone.Gain();
			gain.connect(merger, 0, index);
			registerAudioNode(`${nodeId}:${key}`, 'gain', { node: gain });
		});
		// Register the merger node itself for output
		registerAudioNode(nodeId, 'xyrgbMerge', { node: merger });
		return () => {
			channelMap.forEach(({ key }) => {
				unregisterAudioNode(`${nodeId}:${key}`);
			});
			unregisterAudioNode(nodeId);
			merger.dispose();
		};
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Update node data to track which source is connected to which input, like XYRGBScope3DNode
	useEffect(() => {
		updateNode(nodeId, {
			inputX: data.inputX,
			inputY: data.inputY,
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
		});
	}, [
		nodeId,
		data.inputX,
		data.inputY,
		data.inputR,
		data.inputG,
		data.inputB,
		updateNode,
	]);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='XYRGB Merge'
			variant='component'
		>
			<div className='flex flex-col gap-2'>
				<div className='text-xs text-node-secondary mb-2 h-64'>
					Merges X, Y, R, G, B into a 5-channel output
				</div>
			</div>
			{/* Input handles for X, Y, R, G, B */}
			<NodeHandle
				id='inputX'
				type='target'
				position={Position.Left}
				label='X'
				style={{ top: '10%' }}
			/>
			<NodeHandle
				id='inputY'
				type='target'
				position={Position.Left}
				label='Y'
				style={{ top: '25%' }}
			/>
			<NodeHandle
				id='inputR'
				type='target'
				position={Position.Left}
				label='R'
				style={{ top: '45%' }}
			/>
			<NodeHandle
				id='inputG'
				type='target'
				position={Position.Left}
				label='G'
				style={{ top: '65%' }}
			/>
			<NodeHandle
				id='inputB'
				type='target'
				position={Position.Left}
				label='B'
				style={{ top: '85%' }}
			/>
			{/* Output handle */}
			<NodeHandle
				id='output'
				type='source'
				position={Position.Right}
				label='Out'
				style={{ top: '50%' }}
			/>
		</BaseNode>
	);
}
