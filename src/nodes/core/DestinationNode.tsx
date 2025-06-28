/**
 * Destination Node Component
 *
 * Audio output destination that connects audio to the speakers.
 * Uses a Tone.Gain node connected to destination for master volume control.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface DestinationNodeData extends BaseNodeData {
	volume?: number;
	mute?: boolean;
}

export function DestinationNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: DestinationNodeData }) {
	// Get audio context state
	const isPlaying = useAppStore((state) => state.isPlaying);
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as DestinationNodeData;
	const isSelected = selected as boolean;

	// Register audio node on mount (only once)
	useEffect(() => {
		console.log(`🎧 Registering destination audio node: ${nodeId}`);

		registerAudioNode(nodeId, 'destination', {
			volume: nodeData.volume || 0,
		});

		// Cleanup on unmount
		return () => {
			console.log(`🧹 Unregistering destination audio node: ${nodeId}`);
			unregisterAudioNode(nodeId);
		};
		// Only depend on nodeId and the register/unregister functions, NOT on nodeData.volume
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up volume control using our custom hook
	const [volume, setVolume] = useAudioNodeParam<number>(
		nodeId,
		'gain', // Use 'gain' parameter which maps to the Tone.Gain node
		nodeData.volume || 0,
		{
			min: -60,
			max: 12,
			rampTime: 0.05,
			transform: (value) => Tone.dbToGain(value),
		}
	);

	// Track mute state separately, don't use audio param for this
	const [mute, setMute] = useAudioNodeParam<boolean>(
		nodeId,
		'mute',
		nodeData.mute || false
	);

	// Handle mute by directly controlling the gain node
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	useEffect(() => {
		const audioNode = getAudioNode(nodeId);
		if (audioNode && !Array.isArray(audioNode)) {
			// Cast to Tone.Gain since we know destination nodes use Gain
			const gainNode = audioNode as Tone.Gain;
			if (mute) {
				gainNode.gain.setValueAtTime(0, Tone.now());
			} else {
				gainNode.gain.setValueAtTime(Tone.dbToGain(volume), Tone.now());
			}
		}
	}, [mute, volume, nodeId, getAudioNode]);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			volume,
			mute,
			audioParams: { volume, mute },
		});
	}, [nodeId, volume, mute, updateNode]);

	// Helper to convert dB to percentage for display
	const volumeToPercent = (db: number) => {
		// Convert dB to linear scale for percentage display
		// 0dB = 100%, -60dB = 0%
		const percent = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
		return Math.round(percent);
	};

	// Visual indicator for output level
	const getOutputLevelColor = () => {
		if (mute) return 'bg-gray-500';
		if (volume > 0) return 'bg-red-500'; // Clipping warning
		if (volume > -6) return 'bg-yellow-500'; // Hot signal
		if (volume > -20) return 'bg-green-500'; // Good level
		return 'bg-green-300'; // Low level
	};

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Master Output'
			variant='core'
		>
			{/* Output level indicator */}
			<div className='flex justify-center mb-4 h-16 bg-node-accent/10 rounded-lg overflow-hidden relative'>
				<div className='flex items-center justify-center w-full'>
					<div className='flex flex-col items-center space-y-2'>
						{/* Level meter visualization */}
						<div className='flex space-x-1'>
							{Array.from({ length: 10 }, (_, i) => {
								const levelThreshold = -60 + i * 6; // Each bar represents 6dB
								const isActive = !mute && volume >= levelThreshold;
								return (
									<div
										key={i}
										className={`w-2 h-8 rounded-sm transition-all ${
											isActive
												? i >= 8
													? 'bg-red-500'
													: i >= 6
														? 'bg-yellow-500'
														: 'bg-green-500'
												: 'bg-node-accent/20'
										}`}
									/>
								);
							})}
						</div>

						{/* Status indicator */}
						{isPlaying && !mute && (
							<div className='flex items-center'>
								<div
									className={`w-2 h-2 rounded-full animate-pulse mr-1 ${getOutputLevelColor()}`}
								/>
								<span className='text-xs text-node-text/70'>OUTPUT</span>
							</div>
						)}

						{mute && (
							<div className='flex items-center'>
								<div className='w-2 h-2 bg-red-500 rounded-full mr-1' />
								<span className='text-xs text-red-500'>MUTED</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Master volume control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Master Volume'
					value={volume}
					min={-60}
					max={12}
					step={0.5}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) =>
						`${Math.round(val)}dB (${volumeToPercent(val)}%)`
					}
					onChange={(e) => setVolume(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Mute button */}
			<div className='mb-3'>
				<GridControl
					type='button'
					buttonLabel={mute ? '🔇 MUTED' : '🔊 UNMUTE'}
					variant={mute ? 'danger' : 'node-variant'}
					layout='fill'
					size='md'
					onClick={() => setMute(!mute)}
					className='h-10'
				/>
			</div>

			{/* Audio input handles - support multiple inputs */}
			<NodeHandle
				id='input'
				type='target'
				position={Position.Left}
				label='In'
				style={{ top: '40%' }}
			/>
			<NodeHandle
				id='input-2'
				type='target'
				position={Position.Left}
				label='In 2'
				style={{ top: '60%' }}
			/>
		</BaseNode>
	);
}
