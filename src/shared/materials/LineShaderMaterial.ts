// LineShaderMaterial.ts
// Custom shader material for line visualization (adapted from Woscope)
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Import our shaders
import vsLineCode from '../shaders/vsLine.glsl';
import fsLineCode from '../shaders/fsLine.glsl';

const LineShaderMaterial = shaderMaterial(
	{
		uSize: 0.012,
		uIntensity: 1.0,
		uColor: new THREE.Vector4(1.0, 1.0, 1.0, 1.0),
	},
	vsLineCode,
	fsLineCode
);

// Set default material properties
LineShaderMaterial.prototype.transparent = true;
LineShaderMaterial.prototype.blending = THREE.AdditiveBlending;
LineShaderMaterial.prototype.depthWrite = false;

// Register material with R3F
extend({ LineShaderMaterial });

// Type definitions for JSX
export interface LineShaderMaterialProps
	extends THREE.ShaderMaterialParameters {
	uSize?: number;
	uIntensity?: number;
	uColor?: THREE.Vector4 | THREE.Color | string | number;
	attach?: string;
	key?: React.Key;
	ref?: React.RefObject<THREE.ShaderMaterial>;
}

declare module '@react-three/fiber' {
	interface ThreeElements {
		lineShaderMaterial: LineShaderMaterialProps;
	}
}

export { LineShaderMaterial };
