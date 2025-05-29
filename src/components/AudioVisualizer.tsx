/**
 * AudioVisualizer.tsx
 * Main visualization component that sets up the canvas and audio visualizer
 */
import { Canvas } from '@react-three/fiber';
import { Analyser } from 'tone';

// Import our custom component
import AudioWaveformLines from './AudioWaveformLines';

interface AudioVisualizerProps {
	analyserL?: Analyser;
	analyserR?: Analyser;
	isPlaying: boolean;
	width?: number;
	height?: number;
}

/**
 * Main AudioVisualizer component that sets up the canvas and scene
 */
function AudioVisualizer({
	analyserL,
	analyserR,
	isPlaying,
	width = 280,
	height = 280,
}: AudioVisualizerProps) {
	return (
		<div className='flex justify-center items-center w-full h-full'>
			{/* This is the new r3f-canvas-container */}
			<div
				className='r3f-canvas-container bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600'
				style={{
					width: width ? `${width}px` : '100%', // Use prop or fill
					height: height ? `${height}px` : '100%', // Use prop or fill
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
					{analyserL && analyserR && (
						<AudioWaveformLines
							analyserL={analyserL}
							analyserR={analyserR}
							isPlaying={isPlaying}
						/>
					)}
				</Canvas>
			</div>
		</div>
	);
}

export default AudioVisualizer;
