// RGBWaveformLines.tsx
// Shader-based XYRGB waveform visualizer using buffer geometry and custom shader material
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as Tone from 'tone';

import '../../shared/materials/LineShaderMaterial';
import { useWaveformGeometry } from '../../shared/geometry/useWaveformGeometry';

interface RGBWaveformLinesProps {
	analyserX?: Tone.Analyser;
	analyserY?: Tone.Analyser;
	analyserR?: Tone.Analyser;
	analyserG?: Tone.Analyser;
	analyserB?: Tone.Analyser;
	isPlaying: boolean;
	audioScale?: number;
}

const RGBWaveformLines: React.FC<RGBWaveformLinesProps> = ({
	analyserX,
	analyserY,
	analyserR,
	analyserG,
	analyserB,
	isPlaying,
	audioScale = 1.0,
}) => {
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

		if (
			isPlaying &&
			analyserX &&
			analyserY &&
			analyserR &&
			analyserG &&
			analyserB
		) {
			const dataX = analyserX.getValue() as Float32Array;
			const dataY = analyserY.getValue() as Float32Array;
			const dataR = analyserR.getValue() as Float32Array;
			const dataG = analyserG.getValue() as Float32Array;
			const dataB = analyserB.getValue() as Float32Array;

			if (dataX instanceof Float32Array && dataY instanceof Float32Array) {
				updateGeometryWithAudioData(
					geometryRef.current,
					dataX,
					dataY,
					audioScale
				);
			}

			// Compute average color from R,G,B analysers
			const avg = (arr: Float32Array): number => {
				const sum = arr.reduce((s, v) => s + v, 0);
				return Math.min(1, Math.max(0, (sum / arr.length + 1) * 0.5));
			};
			const r = avg(dataR);
			const g = avg(dataG);
			const b = avg(dataB);

			// Update shader color uniform
			const uColor = materialRef.current.uniforms.uColor.value as THREE.Vector4;
			uColor.set(r, g, b, 1.0);
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
};

export default RGBWaveformLines;
