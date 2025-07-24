import { Position, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useSixChannelNoiseWorklet } from '../../../audio/hooks/useSixChannelNoiseWorklet';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface SixChannelNoiseGeneratorNodeData extends BaseNodeData {
	amplitude?: number;
	isPlaying?: boolean;
	activeChannels?: boolean[];
}

export function SixChannelNoiseGeneratorNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: SixChannelNoiseGeneratorNodeData }) {
	const nodeId = id as string;
	const nodeData = data as SixChannelNoiseGeneratorNodeData;
	const isSelected = selected as boolean;

	const {
		isReady,
		isPlaying,
		amplitude,
		activeChannels,
		start,
		stop,
		setAmplitude,
		setActiveChannels,
		noiseNode,
	} = useSixChannelNoiseWorklet({ debug: true });

	const updateNode = useAppStore((state) => state.updateNode);

	// register base metadata
	useEffect(() => {
		updateNode(nodeId, {
			nodeType: 'custom-worklet',
			workletType: 'six-channel-noise-generator',
			label: nodeData.label || 'Noise Generator 6ch',
		});
	}, [nodeId, updateNode, nodeData.label]);

	// update dynamic state
	useEffect(() => {
		if (isReady) {
			updateNode(nodeId, { amplitude, isPlaying, activeChannels });
		}
	}, [nodeId, updateNode, amplitude, isPlaying, activeChannels, isReady]);

	// register audio outputs
	useEffect(() => {
		if (isReady && noiseNode) {
			const register = useAppStore.getState().registerAudioNode;
			const unregister = useAppStore.getState().unregisterAudioNode;
			noiseNode.outputs.forEach((gainNode, idx) => {
				// register each channel under a custom-noise type for routing
				register(`${nodeId}-${idx}`, 'custom-noise', { node: gainNode });
			});
			return () => {
				noiseNode.outputs.forEach((_, idx) => {
					unregister(`${nodeId}-${idx}`);
				});
			};
		}
	}, [isReady, noiseNode, nodeId]);

	const handleAmplitudeChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setAmplitude(parseFloat(event.target.value));
	};

	const handleChannelToggle = (idx: number) => (checked: boolean) => {
		const newChannels = [...activeChannels];
		newChannels[idx] = checked;
		setActiveChannels(newChannels);
	};

	const handleAllToggle = (checked: boolean) => {
		setActiveChannels(Array(6).fill(checked));
	};

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Noise Generator (6ch)'
			variant='source'
		>
			<div className='mb-3'>
				<GridControl
					type='toggle'
					checked={isPlaying}
					toggleLabel={isPlaying ? 'Stop' : 'Play'}
					onChange={(checked) => (checked ? start() : stop())}
					variant='node-variant'
					layout='stacked'
					disabled={!isReady}
					className='h-16'
				/>
			</div>

			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Amplitude'
					value={amplitude}
					min={0}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val) => `${Math.round(val * 100)}%`}
					onChange={handleAmplitudeChange}
					disabled={!isReady}
					className='h-16'
				/>
			</div>

			<div className='mb-3 grid grid-cols-4 gap-2'>
				{activeChannels.map((ch, idx) => (
					<GridControl
						key={idx}
						type='toggle'
						checked={ch}
						toggleLabel={`Ch ${idx + 1}`}
						onChange={handleChannelToggle(idx)}
						variant='node-variant'
						layout='stacked'
						disabled={!isReady}
					/>
				))}
				<GridControl
					type='toggle'
					checked={activeChannels.every(Boolean)}
					toggleLabel='All'
					onChange={handleAllToggle}
					variant='node-variant'
					layout='stacked'
					disabled={!isReady}
				/>
			</div>

			<div className='mb-3 p-2 bg-node-secondary rounded text-xs'>
				<div className='space-y-1 text-node-secondary'>
					<div>Ready: {isReady ? '✅' : '❌'}</div>
					<div>Playing: {isPlaying ? '✅' : '❌'}</div>
					<div>Amplitude: {amplitude.toFixed(3)}</div>
					<div>
						Channels:{' '}
						{activeChannels
							.map((c, i) => (c ? i + 1 : null))
							.filter(Boolean)
							.join(', ') || 'none'}
					</div>
				</div>
			</div>

			{activeChannels.map((_, idx) => (
				<NodeHandle
					key={idx}
					id={`output-${idx}`}
					type='source'
					position={Position.Right}
					label={`Out ${idx + 1}`}
				/>
			))}
		</BaseNode>
	);
}
