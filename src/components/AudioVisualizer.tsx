/**
 * AudioVisualizer.tsx
 * Main visualization component that sets up the canvas and audio visualizer
 */
import React from 'react';
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
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
	analyserL,
	analyserR,
	isPlaying,
	width = 280,
	height = 200,
}) => {
	return (
		<div className='flex justify-center items-center'>
			<div
				className='bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600'
				style={{
					width: `${width}px`,
					height: `${height}px`,
				}}
			>
				<Canvas
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
};

export default AudioVisualizer;
