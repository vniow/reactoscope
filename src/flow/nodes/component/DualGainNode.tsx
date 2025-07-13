/**
 * Dual Gain Node Component
 *
 * Component node with two independent gain stages, each with their own
 * input and output for separate audio channels.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface DualGainNodeData extends BaseNodeData {
	gain1?: number;
	gain2?: number;
}

export function DualGainNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: DualGainNodeData }) {
	// Get audio context state
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as DualGainNodeData;
	const isSelected = selected as boolean;

	// Register audio node on mount (only once)
	useEffect(() => {
		console.log(`🎛️ Registering dual gain audio node: ${nodeId}`);

		registerAudioNode(nodeId, 'dualGain', {
			gain1: nodeData.gain1 || 1,
			gain2: nodeData.gain2 || 1,
		});

		// Cleanup on unmount
		return () => {
			console.log(`🧹 Unregistering dual gain audio node: ${nodeId}`);
			unregisterAudioNode(nodeId);
		};
		// Only depend on nodeId and the register/unregister functions, NOT on nodeData parameters
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up gain controls using our custom hook
	const [gain1, setGain1] = useAudioNodeParam<number>(
		nodeId,
		'gain', // This will target the first gain node (index 0)
		nodeData.gain1 || 1,
		{
			min: 0,
			max: 4,
			rampTime: 0.05,
			audioNodeIndex: 0, // Target the first gain in the array
		}
	);

	const [gain2, setGain2] = useAudioNodeParam<number>(
		nodeId,
		'gain', // This will target the second gain node (index 1)
		nodeData.gain2 || 1,
		{
			min: 0,
			max: 4,
			rampTime: 0.05,
			audioNodeIndex: 1, // Target the second gain in the array
		}
	);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			gain1,
			gain2,
			audioParams: { gain1, gain2 },
		});
	}, [nodeId, gain1, gain2, updateNode]);

	// Helper to convert gain to dB for display
	const gainToDb = (gain: number) => {
		return gain > 0 ? Math.round(20 * Math.log10(gain) * 10) / 10 : -60;
	};

	// Helper to convert gain to percentage for display
	const gainToPercent = (gain: number) => {
		return Math.round(gain * 100);
	};

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Dual Gain'
			variant='component'
		>
			{/* Channel 1 Controls */}
			<div className='mb-4 p-3 bg-node-accent/10 rounded-lg'>
				<div className='text-xs text-node-text/70 mb-2 font-medium'>
					CHANNEL 1
				</div>
				<GridControl
					type='slider'
					label='Gain 1'
					value={gain1}
					min={0}
					max={4}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${gainToPercent(val)}% (${gainToDb(val)}dB)`}
					onChange={(e) => setGain1(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Channel 2 Controls */}
			<div className='mb-4 p-3 bg-node-accent/10 rounded-lg'>
				<div className='text-xs text-node-text/70 mb-2 font-medium'>
					CHANNEL 2
				</div>
				<GridControl
					type='slider'
					label='Gain 2'
					value={gain2}
					min={0}
					max={4}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${gainToPercent(val)}% (${gainToDb(val)}dB)`}
					onChange={(e) => setGain2(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Independent Input Handles */}
			<NodeHandle
				id='input-1'
				type='target'
				position={Position.Left}
				label='In 1'
				style={{ top: '30%' }}
			/>
			<NodeHandle
				id='input-2'
				type='target'
				position={Position.Left}
				label='In 2'
				style={{ top: '70%' }}
			/>

			{/* Independent Output Handles */}
			<NodeHandle
				id='output-1'
				type='source'
				position={Position.Right}
				label='Out 1'
				style={{ top: '30%' }}
			/>
			<NodeHandle
				id='output-2'
				type='source'
				position={Position.Right}
				label='Out 2'
				style={{ top: '70%' }}
			/>
		</BaseNode>
	);
}
