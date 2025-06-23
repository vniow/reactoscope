import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomNode } from '../shared/types';
import { getAudioAnalyzer } from '../audio/stores/audioSlice';

export function SimpleOscNode({ id }: NodeProps<CustomNode>) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationFrameRef = useRef<number | null>(null);
	const dataArrayRef = useRef<Float32Array | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	// Initialize data array for waveform
	useEffect(() => {
		// Initialize with empty data array
		dataArrayRef.current = new Float32Array(128);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	// Simple waveform drawing function
	const drawWaveform = useCallback(() => {
		const canvas = canvasRef.current;
		const dataArray = dataArrayRef.current;

		if (!canvas || !dataArray) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Get analyzer from audio system
		const analyzer = getAudioAnalyzer(id);
		if (analyzer) {
			// Get waveform data from Tone.js analyzer
			const waveformData = analyzer.getValue() as Float32Array;
			if (waveformData && waveformData.length > 0) {
				dataArray.set(waveformData.slice(0, dataArray.length));
				setIsConnected(true);
			} else {
				setIsConnected(false);
			}
		} else {
			// No analyzer means no audio connected
			setIsConnected(false);
			// Fill with flat line at center
			dataArray.fill(0);
		}

		// Clear canvas
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw grid
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 2]);

		// Horizontal center line
		ctx.beginPath();
		ctx.moveTo(0, canvas.height / 2);
		ctx.lineTo(canvas.width, canvas.height / 2);
		ctx.stroke();

		// Vertical grid lines
		for (let i = 0; i < 5; i++) {
			const x = (canvas.width / 4) * i;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}

		// Draw waveform
		ctx.setLineDash([]);
		ctx.strokeStyle = '#00ff00';
		ctx.lineWidth = 2;
		ctx.beginPath();

		const sliceWidth = canvas.width / dataArray.length;
		let x = 0;

		for (let i = 0; i < dataArray.length; i++) {
			// dataArray values are between -1 and 1 (Float32Array from Tone.js)
			const v = (dataArray[i] + 1) / 2; // Convert to 0-1 range
			const y = v * canvas.height; // Convert to canvas height

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		ctx.stroke();

		// Continue animation
		animationFrameRef.current = requestAnimationFrame(drawWaveform);
	}, [id]);

	// Start visualization when mounted
	useEffect(() => {
		drawWaveform();

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [drawWaveform]);

	return (
		<div className='react-flow__node-default bg-black border-2 border-green-500 rounded-lg p-3 min-w-80'>
			<div className='text-sm font-semibold text-green-400 mb-2 font-mono'>
				Simple Oscilloscope
			</div>

			{/* Canvas for waveform visualization */}
			<div className='bg-black border border-green-700 rounded mb-3'>
				<canvas
					ref={canvasRef}
					width={300}
					height={150}
					className='w-full h-full'
					style={{ imageRendering: 'pixelated' }}
				/>
			</div>

			{/* Simple controls */}
			<div className='flex items-center justify-center text-xs'>
				<div className='text-green-400 font-mono'>
					Status: {isConnected ? 'CONNECTED' : 'NO SIGNAL'}
				</div>
			</div>

			<div className='text-xs text-center text-green-500 mt-2 font-mono'>
				📺 WAVEFORM DISPLAY
			</div>

			{/* Input handle */}
			<Handle
				type='target'
				position={Position.Left}
				id='audio-in'
				className='w-3 h-3 bg-green-500 border-2 border-white'
			/>
		</div>
	);
}
