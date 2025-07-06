/**
 * WoscopeLines.tsx
 * React component for rendering woscope audio waveform lines using GPU shaders
 */
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Analyser } from 'tone';
import * as THREE from 'three';

// Import our custom modules
import { WoscopeShaderMaterial } from './WoscopeShaderMaterial';
import { useWoscopeGeometry } from './WoscopeGeometry';

interface AnalyserLike {
	getValue: () => Float32Array;
}

interface WoscopeLinesProps {
	analyserL?: Analyser | AnalyserLike;
	analyserR?: Analyser | AnalyserLike;
	isPlaying: boolean;
	lineColor?: string;
	lineThickness?: number;
	lineIntensity?: number;
	audioScale?: number;
}

const WoscopeLines: React.FC<WoscopeLinesProps> = ({
	analyserL,
	analyserR,
	isPlaying,
	lineColor = '#00ff00',
	lineThickness = 0.012,
	lineIntensity = 1.0,
	audioScale = 0.8,
}) => {
	const meshRef = useRef<THREE.Mesh>(null!);
	const geometryRef = useRef<THREE.BufferGeometry>(null!);
	const materialRef = useRef<THREE.ShaderMaterial>(null!);

	// Get geometry helper functions from our custom hook
	const {
		applyGeometryAttributes,
		updateGeometryWithAudioData,
		resetGeometryData,
	} = useWoscopeGeometry();

	// Apply geometry attributes on first render
	useEffect(() => {
		if (geometryRef.current) {
			applyGeometryAttributes(geometryRef.current);
		}
	}, [applyGeometryAttributes]);

	// Update material uniforms when props change
	useEffect(() => {
		if (materialRef.current && materialRef.current.uniforms) {
			materialRef.current.uniforms.uSize.value = lineThickness;
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
	}, [lineColor, lineThickness, lineIntensity]);

	// Animation frame update
	useFrame(() => {
		if (!geometryRef.current || !analyserL || !analyserR) return;

		if (isPlaying) {
			const dataL = analyserL.getValue();
			const dataR = analyserR.getValue();

			if (dataL instanceof Float32Array && dataR instanceof Float32Array) {
				updateGeometryWithAudioData(
					geometryRef.current,
					dataL,
					dataR,
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
			<woscopeShaderMaterial
				ref={materialRef}
				key={WoscopeShaderMaterial.key}
				attach='material'
				transparent={true}
				depthWrite={false}
				blending={THREE.AdditiveBlending}
			/>
		</mesh>
	);
};

export default WoscopeLines;
