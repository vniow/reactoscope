import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useErrorBoundary } from 'use-error-boundary';
import { getAudioAnalyzer } from '../../audio/stores/audioSlice';

const canvasResize = { scroll: false };

function WebGLFallback() {
	return (
		<div className='flex items-center justify-center h-full text-green-400 text-sm'>
			WebGL not supported 😢
		</div>
	);
}

interface VisualizationProps {
	nodeId: string;
	color: string;
	scale: number;
	gridVisible: boolean;
}

function Visualization({
	nodeId,
	color,
	scale,
	gridVisible,
}: VisualizationProps) {
	const waveformRef = useRef<Float32Array>(new Float32Array(128));

	// Generate grid lines
	const gridLines = useMemo(() => {
		if (!gridVisible) return [];

		const lines = [];
		// Horizontal lines
		for (let i = -0.8; i <= 0.8; i += 0.4) {
			lines.push({
				points: [
					[-1.6, i, 0],
					[1.6, i, 0],
				] as [number, number, number][],
				color: '#444444',
			});
		}
		// Vertical lines
		for (let i = -1.6; i <= 1.6; i += 0.4) {
			lines.push({
				points: [
					[i, -0.8, 0],
					[i, 0.8, 0],
				] as [number, number, number][],
				color: '#444444',
			});
		}
		return lines;
	}, [gridVisible]);

	// Convert waveform data to 3D points
	const waveformPoints = useMemo(() => {
		const points: [number, number, number][] = [];
		const width = 3.2; // Total width of oscilloscope (from -1.6 to +1.6)
		const stepSize = width / (waveformRef.current.length - 1);

		for (let i = 0; i < waveformRef.current.length; i++) {
			const x = -1.6 + i * stepSize; // Map to -1.6 to +1.6
			const y = waveformRef.current[i] * scale * 0.8; // Scale the amplitude and keep within bounds
			points.push([x, y, 0]);
		}
		return points;
	}, [scale]);

	useFrame(() => {
		// Get audio data from the analyzer
		const analyzer = getAudioAnalyzer(nodeId);
		if (analyzer) {
			// Get the actual waveform data from the Tone.js analyzer
			const waveform = analyzer.getValue();

			if (waveform instanceof Float32Array) {
				// Downsample to 128 points for performance
				const downsampledData = new Float32Array(128);
				const step = Math.floor(waveform.length / 128);
				for (let i = 0; i < 128; i++) {
					downsampledData[i] = waveform[i * step] || 0;
				}
				waveformRef.current = downsampledData;
			}
		}
	});

	return (
		<>
			{/* Grid lines */}
			{gridLines.map((line, index) => (
				<Line
					key={index}
					points={line.points}
					color={line.color}
					lineWidth={0.5}
				/>
			))}

			{/* Main waveform line */}
			{waveformPoints.length > 1 && (
				<Line
					points={waveformPoints}
					color={color}
					lineWidth={2}
				/>
			)}

			{/* Oscilloscope frame */}
			<Line
				points={
					[
						[-1.8, -0.9, 0],
						[1.8, -0.9, 0],
						[1.8, 0.9, 0],
						[-1.8, 0.9, 0],
						[-1.8, -0.9, 0],
					] as [number, number, number][]
				}
				color='#666666'
				lineWidth={1.5}
			/>
		</>
	);
}

export default function OscilloscopeVisualization({
	nodeId,
	color,
	scale,
	gridVisible,
}: VisualizationProps) {
	const { ErrorBoundary, didCatch } = useErrorBoundary();

	if (didCatch) {
		return <WebGLFallback />;
	}

	return (
		<ErrorBoundary>
			<Canvas
				orthographic
				camera={{
					position: [0, 0, 5],
					zoom: 100,
					left: -2,
					right: 2,
					top: 1.2,
					bottom: -1.2,
				}}
				resize={canvasResize}
				dpr={2}
				fallback={<WebGLFallback />}
				gl={{ antialias: true }}
			>
				<ambientLight intensity={0.1} />
				<Suspense fallback={null}>
					<Visualization
						nodeId={nodeId}
						color={color}
						scale={scale}
						gridVisible={gridVisible}
					/>
				</Suspense>
			</Canvas>
		</ErrorBoundary>
	);
}
