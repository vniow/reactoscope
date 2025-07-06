/**
 * WoscopeVisualization.tsx
 * 3D scene component for woscope audio visualization
 *
 * Follows Reactoscope guidelines:
 * - Function declaration instead of React.FC
 * - Explicit TypeScript types
 * - Performance optimizations
 * - Error handling with graceful degradation
 * - Semantic styling
 */
import React from 'react';
import WoscopeLines from './WoscopeLines';

interface WoscopeVisualizationProps {
	analyzers: {
		l: import('tone').Analyser | null;
		r: import('tone').Analyser | null;
	};
	isPlaying?: boolean;
	lineColor?: string;
	lineThickness?: number;
	lineIntensity?: number;
	audioScale?: number;
}

/**
 * WoscopeVisualization component following Reactoscope guidelines
 *
 * Provides the 3D scene setup for woscope audio visualization
 * with proper error handling and performance optimizations
 */
function WoscopeVisualization({
	analyzers,
	isPlaying = true,
	lineColor = '#00ff00',
	lineThickness = 0.012,
	lineIntensity = 1.0,
	audioScale = 0.8,
}: WoscopeVisualizationProps) {
	// Only render if we have valid analyzers
	if (!analyzers.l || !analyzers.r) {
		return (
			<>
				<color
					attach='background'
					args={[0, 0, 0]}
				/>
				<ambientLight intensity={0.1} />
			</>
		);
	}

	return (
		<>
			{/* Set up the scene background */}
			<color
				attach='background'
				args={[0, 0, 0]}
			/>

			{/* Basic lighting for visibility */}
			<ambientLight intensity={0.1} />

			{/* The woscope lines visualization */}
			<WoscopeLines
				analyserL={analyzers.l}
				analyserR={analyzers.r}
				isPlaying={isPlaying}
				lineColor={lineColor}
				lineThickness={lineThickness}
				lineIntensity={lineIntensity}
				audioScale={audioScale}
			/>
		</>
	);
}

export default WoscopeVisualization;
