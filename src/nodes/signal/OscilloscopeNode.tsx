/**
 * Oscilloscope Node Component
 *
 * Real-time waveform visualization using HTML Canvas.
 * Acts as a pass-through node with visualization - signal flows in and out.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface OscilloscopeNodeData extends BaseNodeData {
	timeWindow?: number;
	triggerLevel?: number;
	resolution?: number;
}

export function OscilloscopeNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: OscilloscopeNodeData }) {
	// Get audio context state
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const getAudioNode = useAppStore((state) => state.getAudioNode);

	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as OscilloscopeNodeData;
	const isSelected = selected as boolean;

	// Canvas reference and animation
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationFrameRef = useRef<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	// Register audio node on mount (only once)
	useEffect(() => {
		console.log(`📊 Registering oscilloscope audio node: ${nodeId}`);

		registerAudioNode(nodeId, 'oscilloscope', {
			timeWindow: nodeData.timeWindow || 0.1,
			triggerLevel: nodeData.triggerLevel || 0,
			resolution: nodeData.resolution || 512,
		});

		// Cleanup on unmount
		return () => {
			console.log(`🧹 Unregistering oscilloscope audio node: ${nodeId}`);
			unregisterAudioNode(nodeId);
		};
		// Only depend on nodeId and the register/unregister functions
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up controls using our custom hook
	const [timeWindow, setTimeWindow] = useAudioNodeParam<number>(
		nodeId,
		'timeWindow',
		nodeData.timeWindow || 0.1,
		{
			min: 0.01,
			max: 1.0,
		}
	);

	const [triggerLevel, setTriggerLevel] = useAudioNodeParam<number>(
		nodeId,
		'triggerLevel',
		nodeData.triggerLevel || 0,
		{
			min: -1,
			max: 1,
		}
	);

	// Canvas dimensions
	const canvasWidth = 280;
	const canvasHeight = 120;

	// Helper function to draw grid
	const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
		// Set up styling
		ctx.lineWidth = 1.5;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Draw grid
		ctx.strokeStyle = 'rgba(64, 64, 64, 0.3)';
		ctx.lineWidth = 0.5;

		// Horizontal grid lines
		for (let i = 0; i <= 4; i++) {
			const y = (i / 4) * canvasHeight;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvasWidth, y);
			ctx.stroke();
		}

		// Vertical grid lines
		for (let i = 0; i <= 8; i++) {
			const x = (i / 8) * canvasWidth;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvasHeight);
			ctx.stroke();
		}

		// Draw center line (zero level)
		ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, canvasHeight / 2);
		ctx.lineTo(canvasWidth, canvasHeight / 2);
		ctx.stroke();
	}, []);

	// Animation and waveform drawing
	const drawWaveform = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			// If no canvas, try again next frame
			animationFrameRef.current = requestAnimationFrame(drawWaveform);
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			// If no context, try again next frame
			animationFrameRef.current = requestAnimationFrame(drawWaveform);
			return;
		}

		// Clear canvas first
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		// Always draw grid
		drawGrid(ctx);

		// Get the analyzer audio node (index 1 in the array: [passThrough, analyzer])
		const audioNodes = getAudioNode(nodeId) as Tone.ToneAudioNode[];
		const analyzer = audioNodes?.[1] as Tone.Analyser;

		// Create default waveform data if no analyzer
		let waveformData: Float32Array;

		if (!analyzer) {
			// Create a flat line at zero level
			waveformData = new Float32Array(512).fill(0);
			console.log(`📊 No analyzer found for ${nodeId}, showing flat line`);
		} else {
			// Get waveform data from analyzer
			waveformData = analyzer.getValue() as Float32Array;

			// Debug: Log waveform data occasionally
			if (Math.random() < 0.02) {
				// Log ~2% of frames
				const hasSignal = waveformData.some((val) => Math.abs(val) > 0.001);
				console.log(`🌊 Oscilloscope data:`, {
					nodeId,
					hasSignal,
					length: waveformData.length,
					min: Math.min(...waveformData),
					max: Math.max(...waveformData),
					rms: Math.sqrt(
						waveformData.reduce((sum, val) => sum + val * val, 0) /
							waveformData.length
					),
				});
			}
		}

		// Draw trigger level line
		if (Math.abs(triggerLevel) > 0.01) {
			ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 4]);
			const triggerY = canvasHeight / 2 - (triggerLevel * canvasHeight) / 2;
			ctx.beginPath();
			ctx.moveTo(0, triggerY);
			ctx.lineTo(canvasWidth, triggerY);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Draw waveform
		ctx.strokeStyle = isSelected ? '#10b981' : '#06b6d4'; // emerald-500 or cyan-500
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		let hasStarted = false;
		for (let i = 0; i < waveformData.length; i++) {
			const x = (i / (waveformData.length - 1)) * canvasWidth;
			const y = canvasHeight / 2 - (waveformData[i] * canvasHeight) / 2;

			if (!hasStarted) {
				ctx.moveTo(x, y);
				hasStarted = true;
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.stroke();

		// Continue animation
		animationFrameRef.current = requestAnimationFrame(drawWaveform);
	}, [nodeId, triggerLevel, isSelected, getAudioNode, drawGrid]);

	// Start animation when component mounts
	useEffect(() => {
		console.log(`🎯 Starting oscilloscope animation for ${nodeId}`);
		setIsPlaying(true);

		// Start the animation loop immediately
		if (!animationFrameRef.current) {
			animationFrameRef.current = requestAnimationFrame(drawWaveform);
		}

		// Cleanup animation frame on unmount
		return () => {
			if (animationFrameRef.current) {
				console.log(`🛑 Stopping oscilloscope animation for ${nodeId}`);
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			setIsPlaying(false);
		};
	}, [nodeId, drawWaveform]);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			timeWindow,
			triggerLevel,
			audioParams: { timeWindow, triggerLevel },
		});
	}, [nodeId, timeWindow, triggerLevel, updateNode]);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Oscilloscope'
			variant='signal'
		>
			{/* Waveform Display */}
			<div className='mb-4 p-3 bg-black rounded-lg border border-node-accent/20'>
				<canvas
					ref={canvasRef}
					width={canvasWidth}
					height={canvasHeight}
					className='block w-full h-auto'
					style={{ imageRendering: 'pixelated' }}
				/>

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
							}`}
						/>
						<span className='text-node-text/70'>
							{isPlaying ? 'SIGNAL' : 'NO INPUT'}
						</span>
					</div>
					<span className='text-node-text/50'>
						{(timeWindow * 1000).toFixed(0)}ms
					</span>
				</div>
			</div>

			{/* Time Window Control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Time Window'
					value={timeWindow}
					min={0.01}
					max={1.0}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${(val * 1000).toFixed(0)}ms`}
					onChange={(e) => setTimeWindow(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Trigger Level Control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Trigger Level'
					value={triggerLevel}
					min={-1}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${(val * 100).toFixed(0)}%`}
					onChange={(e) => setTriggerLevel(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Audio Input Handle */}
			<NodeHandle
				id='input'
				type='target'
				position={Position.Left}
				label='In'
				style={{ top: '50%' }}
			/>

			{/* Audio Output Handle - pass-through */}
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
