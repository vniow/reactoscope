/**
 * BitCrusher Effect Node Component
 *
 * A worklet-based bit crusher effect with real-time parameter control.
 * Provides bit reduction and sample rate reduction for lo-fi effects.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface BitCrusherNodeData extends BaseNodeData {
	bits?: number;
	sampleRate?: number;
	wet?: number;
}

export function BitCrusherNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: BitCrusherNodeData }) {
	// Get audio context state
	const isPlaying = useAppStore((state) => state.isPlaying);
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as BitCrusherNodeData;
	const isSelected = selected as boolean;

	// Track worklet loading state
	const [isWorkletReady, setIsWorkletReady] = useState(false);
	const [workletError, setWorkletError] = useState<string | null>(null);

	// Register audio node on mount
	useEffect(() => {
		console.log(`🎛️ Registering BitCrusher audio node: ${nodeId}`);

		try {
			registerAudioNode(nodeId, 'bitcrusher', {
				bits: nodeData.bits ?? 8,
				sampleRate: nodeData.sampleRate ?? 8000,
				wet: nodeData.wet ?? 1.0,
			});

			// Set worklet ready after a short delay to allow for async initialization
			const timeout = setTimeout(() => {
				setIsWorkletReady(true);
			}, 100);

			return () => {
				clearTimeout(timeout);
				console.log(`🧹 Unregistering BitCrusher audio node: ${nodeId}`);
				unregisterAudioNode(nodeId);
			};
		} catch (error) {
			console.error('Failed to register BitCrusher node:', error);
			setWorkletError(error instanceof Error ? error.message : 'Unknown error');
		}
		// Only depend on nodeId and the register/unregister functions
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up controls for audio parameters
	const [bits, setBits] = useAudioNodeParam<number>(
		nodeId,
		'bits',
		nodeData.bits ?? 8,
		{ min: 1, max: 16, rampTime: 0.05 }
	);

	const [sampleRate, setSampleRate] = useAudioNodeParam<number>(
		nodeId,
		'sampleRate',
		nodeData.sampleRate ?? 8000,
		{ min: 100, max: 48000, rampTime: 0.1 }
	);

	const [wet, setWet] = useAudioNodeParam<number>(
		nodeId,
		'wet',
		nodeData.wet ?? 1.0,
		{ min: 0, max: 1, rampTime: 0.05 }
	);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			bits,
			sampleRate,
			wet,
			audioParams: { bits, sampleRate, wet },
		});
	}, [nodeId, bits, sampleRate, wet, updateNode]);

	// Visual representation of bit crushing effect
	const getBitCrushVisualization = () => {
		const steps = Math.max(1, Math.floor(bits));

		const points: string[] = [];
		for (let i = 0; i <= 100; i += 5) {
			const level = Math.floor((i / 100) * steps) / steps;
			const y = 90 - level * 80;
			points.push(`${i},${y}`);
		}

		return `M${points.join(' L')}`;
	};

	// Get effect intensity color based on settings
	const getEffectIntensity = () => {
		const bitIntensity = (16 - bits) / 15; // Higher intensity for fewer bits
		const sampleRateIntensity = (48000 - sampleRate) / 47900; // Higher intensity for lower sample rate
		const avgIntensity = (bitIntensity + sampleRateIntensity) * 0.5 * wet;

		if (avgIntensity > 0.7) return 'rgb(239, 68, 68)'; // Red for heavy crushing
		if (avgIntensity > 0.4) return 'rgb(245, 158, 11)'; // Orange for moderate
		return 'rgb(34, 197, 94)'; // Green for light
	};

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='BitCrusher'
			variant='effect'
		>
			{/* Worklet status indicator */}
			{workletError ? (
				<div className='flex items-center justify-center mb-2 p-2 bg-red-500/20 rounded-lg'>
					<div className='w-2 h-2 bg-red-500 rounded-full mr-2' />
					<span className='text-xs text-red-400'>Worklet Error</span>
				</div>
			) : !isWorkletReady ? (
				<div className='flex items-center justify-center mb-2 p-2 bg-yellow-500/20 rounded-lg'>
					<div className='w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2' />
					<span className='text-xs text-yellow-400'>Loading Worklet...</span>
				</div>
			) : (
				<div className='flex items-center justify-center mb-2 p-2 bg-green-500/20 rounded-lg'>
					<div className='w-2 h-2 bg-green-500 rounded-full mr-2' />
					<span className='text-xs text-green-400'>Worklet Ready</span>
				</div>
			)}

			{/* Visual representation of bit crushing */}
			<div className='flex justify-center mb-4 h-16 bg-node-accent/10 rounded-lg overflow-hidden'>
				<svg
					width='100%'
					height='100%'
					viewBox='0 0 100 100'
					preserveAspectRatio='none'
				>
					<path
						d={getBitCrushVisualization()}
						stroke={getEffectIntensity()}
						strokeWidth='2'
						fill='none'
					/>
					{/* Grid lines to show quantization */}
					{Array.from({ length: Math.floor(bits) + 1 }, (_, i) => (
						<line
							key={i}
							x1='0'
							y1={10 + (i * 80) / Math.floor(bits)}
							x2='100'
							y2={10 + (i * 80) / Math.floor(bits)}
							stroke='var(--node-accent)'
							strokeWidth='0.5'
							opacity='0.3'
						/>
					))}
				</svg>
			</div>

			{/* Processing indicator */}
			{isPlaying && isWorkletReady && (
				<div className='flex items-center justify-center mb-2'>
					<div
						className='w-2 h-2 rounded-full animate-pulse mr-2'
						style={{ backgroundColor: getEffectIntensity() }}
					/>
					<span
						className='text-xs'
						style={{ color: getEffectIntensity() }}
					>
						Crushing
					</span>
				</div>
			)}

			{/* Bit depth control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Bit Depth'
					value={bits}
					min={1}
					max={16}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val)} bits`}
					onChange={(e) => setBits(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Sample rate control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Sample Rate'
					value={sampleRate}
					min={100}
					max={48000}
					step={100}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val)}Hz`}
					onChange={(e) => setSampleRate(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Wet/dry mix control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Wet/Dry'
					value={wet}
					min={0}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${Math.round(val * 100)}%`}
					onChange={(e) => setWet(Number(e.target.value))}
					className='h-16'
				/>
			</div>

			{/* Input/Output handles */}
			<NodeHandle
				id='input'
				type='target'
				position={Position.Left}
				label='In'
			/>
			<NodeHandle
				id='output'
				type='source'
				position={Position.Right}
				label='Out'
			/>
		</BaseNode>
	);
}
