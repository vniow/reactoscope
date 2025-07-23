/**
 * NoiseGeneratorNode - Audio worklet noise generator as a flow node
 *
 * This component demonstrates how to integrate a custom AudioWorklet-based
 * audio node directly into the flow system without using the audioNodeFactory.
 * It manages its own worklet lifecycle and bypasses the standard factory pattern.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useNoiseWorklet } from '../../../audio/hooks/useNoiseWorklet';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';
import { NoiseNode } from '../../../audio/core/NoiseNode';

interface NoiseGeneratorNodeData extends BaseNodeData {
	amplitude?: number;
	isPlaying?: boolean;
}

export function NoiseGeneratorNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: NoiseGeneratorNodeData }) {
	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as NoiseGeneratorNodeData;
	const isSelected = selected as boolean;

	// Local state for UI
	const [localAmplitude, setLocalAmplitude] = useState(
		nodeData.amplitude || 0.5
	);
	const [localIsPlaying, setLocalIsPlaying] = useState(
		nodeData.isPlaying || false
	);

	// Use our worklet hook directly - no factory needed!
	const {
		isReady,
		isPlaying,
		amplitude,
		start,
		stop,
		setAmplitude,
		noiseNode,
	} = useNoiseWorklet({
		debug: true,
		autostart: false,
	});

	// Sync hook state with local state
	useEffect(() => {
		setLocalAmplitude(amplitude);
	}, [amplitude]);

	useEffect(() => {
		setLocalIsPlaying(isPlaying);
	}, [isPlaying]);

	// Register/unregister the worklet node in a simplified way
	// We don't use the factory, but we still want the app store to know about this node
	const updateNode = useAppStore((state) => state.updateNode);

	// Register this as a custom worklet node (only once on mount)
	useEffect(() => {
		console.log(`🎛️ Registering noise worklet node: ${nodeId}`);

		// Update the node data to indicate it's a custom worklet
		updateNode(nodeId, {
			nodeType: 'custom-worklet',
			workletType: 'noise-generator',
			// Don't spread nodeData to avoid dependency issues
			label: nodeData.label || 'Noise Generator',
		});

		// No cleanup needed here since the worklet is managed by the hook
	}, [nodeId, updateNode, nodeData.label]); // Only depend on specific nodeData properties

	// Separate effect to update node data when worklet state changes
	useEffect(() => {
		if (isReady) {
			updateNode(nodeId, {
				amplitude: localAmplitude,
				isPlaying: localIsPlaying,
				isReady: isReady,
			});
		}
	}, [nodeId, updateNode, localAmplitude, localIsPlaying, isReady]);

	// Register the noise node with the registry when ready (top-level hook)
	useEffect(() => {
		if (isReady && noiseNode instanceof NoiseNode) {
			// Register the output (Tone.Gain) as a custom type
			const registerAudioNode = useAppStore.getState().registerAudioNode;
			registerAudioNode(nodeId, 'custom-noise', { node: noiseNode.output });
			return () => useAppStore.getState().unregisterAudioNode(nodeId);
		}
	}, [isReady, noiseNode, nodeId]);


	// Handle amplitude changes
	const handleAmplitudeChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = parseFloat(event.target.value);
		setAmplitude(value);
	};


	// Determine if output handle is connected for visual feedback
	const edges = useAppStore((state) => state.edges);
	const outputConnected = edges.some(
		(edge) => edge.source === nodeId && edge.sourceHandle === 'output'
	);
	const outputConnectionStatus: 'default' | 'connected' =
		outputConnected ? 'connected' : 'default';

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Noise Generator'
			variant='source'
		>

			{/* Play/Stop Control */}
			<div className='mb-3'>
				<GridControl
					type='toggle'
					checked={isPlaying}
					toggleLabel={isPlaying ? 'Stop' : 'Play'}
					onChange={(checked) => {
						if (checked) start();
						else stop();
					}}
					variant='node-variant'
					layout='stacked'
					disabled={!isReady}
					className='h-16'
				/>
			</div>

			{/* Amplitude Control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Amplitude'
					value={localAmplitude}
					min={0}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val * 100)}%`}
					onChange={handleAmplitudeChange}
					disabled={!isReady}
					className='h-16'
				/>
			</div>

				{/* Debug Information */}
				<div className='mb-3 p-2 bg-node-secondary rounded text-xs'>
					<div className='space-y-1 text-node-secondary'>
						<div>Ready: {isReady ? '✅' : '❌'}</div>
						<div>Playing: {isPlaying ? '✅' : '❌'}</div>
						<div>Amplitude: {localAmplitude.toFixed(3)}</div>
						<div>Node ID: {nodeId.slice(0, 8)}...</div>
					</div>
				</div>

			{/* Audio output handle */}
					<NodeHandle
						id='output'
						type='source'
						position={Position.Right}
						label='Out'
						connectionStatus={outputConnectionStatus}
					/>
		</BaseNode>
	);
}
