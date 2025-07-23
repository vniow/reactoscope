/**
 * Example Oscillator Node Component
 *
 * This demonstrates how to create an audio node component that integrates
 * with the audio registry system.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { startAudioNode, stopAudioNode } from '../../../audio/factories/audioNodeFactory';
import * as Tone from 'tone';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface OscillatorNodeData extends BaseNodeData {
	frequency?: number;
	waveType?: OscillatorType;
	detune?: number;
	volume?: number;
}

export function OscillatorNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: OscillatorNodeData }) {
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

		// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as OscillatorNodeData;
	const isSelected = selected as boolean;

	// Register audio node on mount (only once)
	useEffect(() => {
		// console.log(`🎵 Registering oscillator audio node: ${nodeId}`);

		registerAudioNode(nodeId, 'oscillator', {
			frequency: nodeData.frequency || 440,
			type: nodeData.waveType || 'sine',
			detune: nodeData.detune || 0,
			volume: nodeData.volume || 0,
		});

		// Cleanup on unmount
		return () => {
			// console.log(`🧹 Unregistering oscillator audio node: ${nodeId}`);
			unregisterAudioNode(nodeId);
		};
		// Only depend on nodeId and the register/unregister functions, NOT on nodeData parameters
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up controls for audio parameters using our custom hook
	const [frequency, setFrequency] = useAudioNodeParam<number>(
		nodeId,
		'frequency',
		nodeData.frequency || 440,
		{ min: 1, max: 2400, rampTime: 0.1 }
	);

	const [waveType, setWaveType] = useAudioNodeParam<OscillatorType>(
		nodeId,
		'type',
		nodeData.waveType || 'sine'
	);

	const [detune, setDetune] = useAudioNodeParam<number>(
		nodeId,
		'detune',
		nodeData.detune || 0,
		{ min: -100, max: 100 }
	);

	// For oscillator nodes that have volume control, the factory creates [oscillator, gain]
	// We need to control the gain node (index 1) for volume
	const [volume, setVolume] = useAudioNodeParam<number>(
		nodeId,
		'gain',
		nodeData.volume || 0,
		{
			min: -60,
			max: 0,
			rampTime: 0.05,
			audioNodeIndex: 1, // Target the gain node in the array
			transform: (value) => Tone.dbToGain(value),
		}
	);

		// Visual feedback for the wave type
	const getWaveformPath = () => {
		switch (waveType) {
			case 'sine':
				return 'M0,50 C20,10 30,90 50,50 C70,10 80,90 100,50';
			case 'square':
				return 'M0,20 L0,80 L50,80 L50,20 L100,20 L100,80';
			case 'sawtooth':
				return 'M0,80 L50,20 L50,80 L100,20';
			case 'triangle':
				return 'M0,80 L33,20 L66,80 L100,20';
			default:
				return 'M0,50 C20,10 30,90 50,50 C70,10 80,90 100,50';
		}
	};

	   // Local play state for toggle control
	   const [isNodePlaying, setIsNodePlaying] = useState(false);
	   // Handler for play/stop toggle
	   const handlePlayToggle = () => {
		   const node = useAppStore.getState().getAudioNode(nodeId);
		   if (!node) return;
		   if (!isNodePlaying) {
			   startAudioNode(node);
			   setIsNodePlaying(true);
		   } else {
			   stopAudioNode(node);
			   setIsNodePlaying(false);
		   }
	   };
   
	   // Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			frequency,
			waveType,
			detune,
			volume,
			audioParams: { frequency, type: waveType, detune, volume },
		});
	}, [nodeId, frequency, waveType, detune, volume, updateNode]);

	// === CONNECTION STATUS LOGIC ===
	// Determine if the output handle is connected
	const edges = useAppStore((state) => state.edges);
	const outputConnected = edges.some(
		(edge) => edge.source === nodeId && edge.sourceHandle === 'output'
	);
	const outputConnectionStatus: 'default' | 'connected' = outputConnected
		? 'connected'
		: 'default';

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Oscillator'
			variant='source'
		>
			{/* Visual representation of waveform */}
			<div className='flex justify-center mb-4 h-16 bg-node-accent/10 rounded-lg overflow-hidden'>
				<svg
					width='100%'
					height='100%'
					viewBox='0 0 100 100'
					preserveAspectRatio='none'
				>
					<path
						d={getWaveformPath()}
						stroke='var(--node-accent)'
						strokeWidth='2'
						fill='none'
					/>
				</svg>
			</div>

			{/* Play/Stop Control */}
			<div className='mb-3'>
				<GridControl
					type='toggle'
					checked={isNodePlaying}
					toggleLabel={isNodePlaying ? 'Stop' : 'Play'}
					onChange={() => handlePlayToggle()}
					variant='node-variant'
					layout='stacked'
					className='h-16'
				/>
			</div>

			{/* Frequency control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Frequency'
					value={frequency}
					min={1}
					max={2400}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val)}Hz`}
					onChange={(e) => setFrequency(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Wave type selector */}
			<div className='mb-3'>
				<GridControl
					type='select'
					label='Wave Type'
					value={waveType}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					options={[
						{ value: 'sine', label: 'Sine' },
						{ value: 'square', label: 'Square' },
						{ value: 'sawtooth', label: 'Sawtooth' },
						{ value: 'triangle', label: 'Triangle' },
					]}
					onChange={(e) => setWaveType(e.target.value as OscillatorType)}
					className='h-16'
				/>
			</div>

			{/* Detune control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Detune'
					value={detune}
					min={-100}
					max={100}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val)} cents`}
					onChange={(e) => setDetune(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Volume control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Volume'
					value={volume}
					min={-60}
					max={0}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val)}dB`}
					onChange={(e) => setVolume(Number(e.target.value))}
					className='h-16'
				/>
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
