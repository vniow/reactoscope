/**
 * AudioVisualizer - Main visualization component for audio spectrum analysis
 *
 * This component sets up a Three.js canvas for rendering real-time audio visualizations
 * using React Three Fiber. It displays waveform data from dual Tone.js Analyser nodes
 * with optimized performance and responsive design.
 */
import { Canvas } from '@react-three/fiber';
import { Analyser } from 'tone';

// Import our custom component
import AudioWaveformLines from './AudioWaveformLines';

/**
 * Props interface for AudioVisualizer component
 */
interface AudioVisualizerProps {
	/** X-axis analyser for horizontal waveform data */
	analyserX?: Analyser;
	/** Y-axis analyser for vertical waveform data */
	analyserY?: Analyser;
	/** Whether audio is currently playing */
	isPlaying: boolean;
	/** Fixed width in pixels (ignored if fillContainer is true) */
	width?: number;
	/** Fixed height in pixels (ignored if fillContainer is true) */
	height?: number;
	/** Whether to fill the parent container completely */
	fillContainer?: boolean;
}

/**
 * AudioVisualizer - Main visualization component
 *
 * @param props - Component properties
 * @returns React element containing the 3D audio visualizer
 */
export function AudioVisualizer({
	analyserX,
	analyserY,
	isPlaying,
	width = 280,
	height = 280,
	fillContainer = false,
}: AudioVisualizerProps) {
	// Input validation
	if (width !== undefined && (typeof width !== 'number' || width <= 0)) {
		console.error('🚨 AudioVisualizer: Invalid width value', width);
	}

	if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
		console.error('🚨 AudioVisualizer: Invalid height value', height);
	}
	return (
		<div className='flex justify-center items-center w-full h-full'>
			{/* This is the new r3f-canvas-container */}
			<div
				className='r3f-canvas-container bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600'
				style={{
					width: fillContainer ? '100%' : width ? `${width}px` : '100%',
					height: fillContainer ? '100%' : height ? `${height}px` : '100%',
					// position, overflow, isolation are handled by CSS class now
				}}
			>
				<Canvas
					style={
						{
							/* Styles for direct canvas are now in CSS */
						}
					}
					camera={{ position: [0, 0, 1.5], fov: 75 }}
					gl={{
						antialias: true,
						alpha: false,
						pixelRatio: Math.min(window.devicePixelRatio, 2), // Cap pixel ratio for performance
					}}
				>
					<color
						attach='background'
						args={[0, 0, 0]}
					/>
					{analyserX && analyserY && (
						<AudioWaveformLines
							analyserX={analyserX}
							analyserY={analyserY}
							isPlaying={isPlaying}
						/>
					)}
				</Canvas>
			</div>
		</div>
	);
}

export default AudioVisualizer;
