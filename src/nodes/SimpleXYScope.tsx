import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomNode } from '../shared/types';
import { getAudioAnalyzer } from '../audio/stores/audioSlice';

export function SimpleXYScope({ id }: NodeProps<CustomNode>) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationFrameRef = useRef<number | null>(null);
	const xDataArrayRef = useRef<Float32Array | null>(null);
	const yDataArrayRef = useRef<Float32Array | null>(null);
	const [xConnected, setXConnected] = useState(false);
	const [yConnected, setYConnected] = useState(false);

	// Initialize data arrays for XY plotting
	useEffect(() => {
		// Initialize with empty data arrays
		xDataArrayRef.current = new Float32Array(128);
		yDataArrayRef.current = new Float32Array(128);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	// XY waveform drawing function
	const drawXYWaveform = useCallback(() => {
		const canvas = canvasRef.current;
		const xDataArray = xDataArrayRef.current;
		const yDataArray = yDataArrayRef.current;

		if (!canvas || !xDataArray || !yDataArray) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Get analyzers from audio system for both X and Y inputs
		const xAnalyzer = getAudioAnalyzer(`${id}-x`);
		const yAnalyzer = getAudioAnalyzer(`${id}-y`);

		// Update X data
		if (xAnalyzer) {
			const xWaveformData = xAnalyzer.getValue() as Float32Array;
			if (xWaveformData && xWaveformData.length > 0) {
				xDataArray.set(xWaveformData.slice(0, xDataArray.length));
				setXConnected(true);
			} else {
				setXConnected(false);
			}
		} else {
			setXConnected(false);
			xDataArray.fill(0);
		}

		// Update Y data
		if (yAnalyzer) {
			const yWaveformData = yAnalyzer.getValue() as Float32Array;
			if (yWaveformData && yWaveformData.length > 0) {
				yDataArray.set(yWaveformData.slice(0, yDataArray.length));
				setYConnected(true);
			} else {
				setYConnected(false);
			}
		} else {
			setYConnected(false);
			yDataArray.fill(0);
		}

		// Clear canvas
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw grid
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 2]);

		// Center cross-hairs
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;

		// Horizontal center line
		ctx.beginPath();
		ctx.moveTo(0, centerY);
		ctx.lineTo(canvas.width, centerY);
		ctx.stroke();

		// Vertical center line
		ctx.beginPath();
		ctx.moveTo(centerX, 0);
		ctx.lineTo(centerX, canvas.height);
		ctx.stroke();

		// Grid circles for XY scope
		ctx.setLineDash([4, 4]);
		const maxRadius = Math.min(centerX, centerY) * 0.8;
		for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
			ctx.beginPath();
			ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
			ctx.stroke();
		}

		// Draw XY plot
		if (xConnected || yConnected) {
			ctx.setLineDash([]);
			ctx.strokeStyle = '#00ff00';
			ctx.lineWidth = 2;

			// XY plotting - create Lissajous patterns
			ctx.beginPath();

			const plotPoints = Math.min(xDataArray.length, yDataArray.length);
			let firstPoint = true;

			for (let i = 0; i < plotPoints; i++) {
				// Convert audio data (-1 to 1) to canvas coordinates
				const x = centerX + xDataArray[i] * maxRadius;
				const y = centerY - yDataArray[i] * maxRadius; // Invert Y for screen coordinates

				if (firstPoint) {
					ctx.moveTo(x, y);
					firstPoint = false;
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();

			// Add some glow effect for the trace
			ctx.shadowColor = '#00ff00';
			ctx.shadowBlur = 4;
			ctx.stroke();
			ctx.shadowBlur = 0;
		}

		// Continue animation
		animationFrameRef.current = requestAnimationFrame(drawXYWaveform);
	}, [id, xConnected, yConnected]);

	// Start visualization when mounted
	useEffect(() => {
		drawXYWaveform();

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [drawXYWaveform]);

	const connectionStatus = () => {
		if (xConnected && yConnected) return 'XY ACTIVE';
		if (xConnected) return 'X ONLY';
		if (yConnected) return 'Y ONLY';
		return 'NO SIGNAL';
	};

	const getStatusColor = () => {
		if (xConnected && yConnected) return 'text-green-400';
		if (xConnected || yConnected) return 'text-yellow-400';
		return 'text-red-400';
	};

	return (
		<div className='react-flow__node-default bg-black border-2 border-cyan-500 rounded-lg p-3 w-96'>
			<div className='text-sm font-semibold text-cyan-400 mb-2 font-mono'>
				XY Oscilloscope
			</div>

			{/* Canvas for XY visualization */}
			<div className='bg-black border border-cyan-700 rounded mb-3'>
				<canvas
					ref={canvasRef}
					width={300}
					height={300}
					className='w-full h-full'
					style={{ imageRendering: 'pixelated' }}
				/>
			</div>

			{/* Connection status */}
			<div className='flex items-center justify-center text-xs mb-2'>
				<div className={`font-mono ${getStatusColor()}`}>
					Status: {connectionStatus()}
				</div>
			</div>

			{/* Input labels */}
			<div className='flex justify-between text-xs text-cyan-300 font-mono mb-2'>
				<div className={xConnected ? 'text-green-400' : 'text-gray-500'}>
					X: {xConnected ? 'CONNECTED' : 'NO SIGNAL'}
				</div>
				<div className={yConnected ? 'text-green-400' : 'text-gray-500'}>
					Y: {yConnected ? 'CONNECTED' : 'NO SIGNAL'}
				</div>
			</div>

			<div className='text-xs text-center text-cyan-500 mt-2 font-mono'>
				📊 XY MODE DISPLAY
			</div>

			{/* Input handles */}
			<Handle
				type='target'
				position={Position.Left}
				id='audio-in-x'
				style={{ top: '40%' }}
				className='w-3 h-3 bg-red-500 border-2 border-white'
			/>
			<Handle
				type='target'
				position={Position.Left}
				id='audio-in-y'
				style={{ top: '60%' }}
				className='w-3 h-3 bg-green-500 border-2 border-white'
			/>

			{/* Handle labels */}
			<div className='absolute left-4 top-[40%] transform -translate-y-1/2 text-xs text-red-400 font-mono font-bold'>
				X
			</div>
			<div className='absolute left-4 top-[60%] transform -translate-y-1/2 text-xs text-green-400 font-mono font-bold'>
				Y
			</div>
		</div>
	);
}
