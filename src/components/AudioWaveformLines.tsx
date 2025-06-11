/**
 * AudioWaveformLines.tsx
 * React component for rendering audio waveform lines using GPU shaders
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Analyser } from 'tone';
import * as THREE from 'three';

// Import our custom modules
import { LineShaderMaterial } from '../materials/LineShaderMaterial';
import { useWaveformGeometry } from '../geometry/AudioWaveformGeometry';
import { useVisualizerControls } from '../controls/VisualizerControls';

interface AudioWaveformLinesProps {
	analyserX?: Analyser;
	analyserY?: Analyser;
	isPlaying: boolean;
}

function AudioWaveformLines({
	analyserX,
	analyserY,
	isPlaying,
}: AudioWaveformLinesProps) {
	const meshRef = useRef<THREE.Mesh>(null!);
	const geometryRef = useRef<THREE.BufferGeometry>(null!);
	const materialRef = useRef<THREE.ShaderMaterial>(null!);

	// Get controls from our custom hook
	const { lineColor, lineThickness, lineIntensity, audioScale, highQuality } =
		useVisualizerControls();

	// Get geometry helper functions from our custom hook
	const {
		applyGeometryAttributes,
		updateGeometryWithAudioData,
		resetGeometryData,
	} = useWaveformGeometry();

	// Apply geometry attributes on first render
	useEffect(() => {
		if (geometryRef.current) {
			applyGeometryAttributes(geometryRef.current);
		}
	}, [applyGeometryAttributes]);

	// Update material uniforms when controls change
	useEffect(() => {
		if (materialRef.current && materialRef.current.uniforms) {
			// Update base line thickness based on quality setting
			const effectiveThickness = highQuality
				? lineThickness
				: lineThickness * 1.2; // Slightly thicker for low quality

			materialRef.current.uniforms.uSize.value = effectiveThickness;
			materialRef.current.uniforms.uIntensity.value = lineIntensity;

			// Convert hex color string to RGB components for the shader
			const color = new THREE.Color(lineColor);
			materialRef.current.uniforms.uColor.value = new THREE.Vector4(
				color.r,
				color.g,
				color.b,
				1.0
			);
		}
	}, [lineColor, lineThickness, lineIntensity, highQuality]);

	// Animation frame update
	useFrame(() => {
		if (!geometryRef.current || !analyserX || !analyserY) return;

		if (isPlaying) {
			const dataX = analyserX.getValue();
			const dataY = analyserY.getValue();

			if (dataX instanceof Float32Array && dataY instanceof Float32Array) {
				updateGeometryWithAudioData(
					geometryRef.current,
					dataX,
					dataY,
					audioScale
				);
			}
		} else {
			// Clear geometry if not playing
			resetGeometryData(geometryRef.current);
		}
	});

	return (
		<mesh
			ref={meshRef}
			frustumCulled={false} // Ensure it's always rendered
		>
			<bufferGeometry ref={geometryRef} />
			<lineShaderMaterial
				ref={materialRef}
				key={LineShaderMaterial.key}
				attach='material'
				transparent={true}
				depthWrite={false}
				blending={THREE.AdditiveBlending}
			/>
		</mesh>
	);
}

export default AudioWaveformLines;
