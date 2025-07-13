// RGBWaveformLines.tsx
// Shader-based XYRGB waveform visualizer using buffer geometry and custom shader material
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as Tone from 'tone';

import '../../../shared/materials/LineShaderMaterial';
import { useWaveformGeometry } from '../../../shared/geometry/useWaveformGeometry';

// Add minimum amplitude threshold for rendering
const MIN_RENDER_AMP = 0.005;

/**
 * Props for RGBWaveformLines component.
 * @property analyserX - Tone.js analyser for X axis
 * @property analyserY - Tone.js analyser for Y axis
 * @property analyserR - Tone.js analyser for Red channel
 * @property analyserG - Tone.js analyser for Green channel
 * @property analyserB - Tone.js analyser for Blue channel
 * @property isPlaying - Whether audio is currently playing
 * @property audioScale - Optional scale factor for audio amplitude
 * @property afterglow - Optional afterglow intensity for shader
 */
interface RGBWaveformLinesProps {
	analyserX?: Tone.Analyser;
	analyserY?: Tone.Analyser;
	analyserZ?: Tone.Analyser;
	analyserR?: Tone.Analyser;
	analyserG?: Tone.Analyser;
	analyserB?: Tone.Analyser;
	isPlaying: boolean;
	audioScale?: number;
	lineIntensity?: number;
}

/**
 * Shader-based XYRGB waveform visualizer using buffer geometry and custom shader material.
 * @param props - RGBWaveformLinesProps
 */
function RGBWaveformLines({
	analyserX,
	analyserY,
	analyserZ,
	analyserR,
	analyserG,
	analyserB,
	isPlaying,
	audioScale = 1.0,
	lineIntensity = 1.0,
}: RGBWaveformLinesProps): React.ReactElement {
	const meshRef = useRef<THREE.Mesh>(null!);
	const geometryRef = useRef<THREE.BufferGeometry>(null!);
	const materialRef = useRef<THREE.ShaderMaterial>(null!);

	const {
		applyGeometryAttributes,
		updateGeometryWithAudioData,
		resetGeometryData,
	} = useWaveformGeometry();

	// Initialize geometry attributes
	useEffect(() => {
		if (geometryRef.current) {
			applyGeometryAttributes(geometryRef.current);
		}
	}, [applyGeometryAttributes]);

	useFrame(() => {
		if (!geometryRef.current || !materialRef.current) return;

		// Set intensity uniform from prop
		materialRef.current.uniforms.uIntensity.value = lineIntensity;

		// Only render if playing and all analysers present
		if (
			isPlaying &&
			analyserX &&
			analyserY &&
			analyserZ &&
			analyserR &&
			analyserG &&
			analyserB
		) {
			const dataX = analyserX.getValue() as Float32Array;
			const dataY = analyserY.getValue() as Float32Array;
			const dataZ = analyserZ.getValue() as Float32Array;

			// Compute average absolute amplitude to gate rendering
			const avgAmpX =
				dataX.reduce((sum, v) => sum + Math.abs(v), 0) / dataX.length;
			const avgAmpY =
				dataY.reduce((sum, v) => sum + Math.abs(v), 0) / dataY.length;
			const avgAmpZ =
				dataZ.reduce((sum, v) => sum + Math.abs(v), 0) / dataZ.length;
			const avgAmp = (avgAmpX + avgAmpY + avgAmpZ) / 3;
			if (avgAmp < MIN_RENDER_AMP) {
				// Clear geometry when signal is too weak
				resetGeometryData(geometryRef.current);
				return;
			}

			// Proceed with geometry update and color when above threshold
			const dataR = analyserR.getValue() as Float32Array;
			const dataG = analyserG.getValue() as Float32Array;
			const dataB = analyserB.getValue() as Float32Array;

			if (
				dataX instanceof Float32Array &&
				dataY instanceof Float32Array &&
				dataZ instanceof Float32Array &&
				dataR instanceof Float32Array &&
				dataG instanceof Float32Array &&
				dataB instanceof Float32Array
			) {
				// Pass Z and per-vertex RGB data to geometry update
				updateGeometryWithAudioData(
					geometryRef.current,
					dataX,
					dataY,
					audioScale,
					dataZ,
					dataR,
					dataG,
					dataB
				);
			}
		} else {
			// Clear geometry when not playing
			resetGeometryData(geometryRef.current);
		}
	});

	return (
		<mesh
			ref={meshRef}
			frustumCulled={false}
		>
			<bufferGeometry ref={geometryRef} />
			<lineShaderMaterial
				ref={materialRef}
				attach='material'
			/>
		</mesh>
	);
}

export default RGBWaveformLines;
