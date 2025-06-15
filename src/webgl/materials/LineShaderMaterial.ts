/**
 * LineShaderMaterial.ts
 * Custom shader material for line visualization
 */
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Import shader code
import vsLineCode from '../shaders/vsLine.glsl';
import fsLineCode from '../shaders/fsLine.glsl';

// Define the shader material using drei/shaderMaterial
const LineShaderMaterial = shaderMaterial(
	{
		// Uniforms
		uSize: 0.012, // Line thickness - adjust as needed
		uIntensity: 1.0,
		uColor: new THREE.Vector4(1 / 32, 1.0, 1 / 32, 1.0), // Green, RGBA
	},
	vsLineCode,
	fsLineCode
);

// Apply default material properties
LineShaderMaterial.prototype.transparent = true;
LineShaderMaterial.prototype.blending = THREE.AdditiveBlending; // Same as gl.ONE in WebGL
LineShaderMaterial.prototype.depthWrite = false; // Important for proper transparent blending

// Extend R3F to recognize this material
extend({ LineShaderMaterial });

// Type definitions for the material
export interface LineShaderMaterialProps
	extends THREE.ShaderMaterialParameters {
	uSize?: number;
	uIntensity?: number;
	uColor?: THREE.Vector4 | THREE.Color | string | number;
	attach?: string;
	key?: React.Key;
	ref?: React.RefObject<THREE.ShaderMaterial>;
}

// Add type declaration for JSX
declare module '@react-three/fiber' {
	interface ThreeElements {
		lineShaderMaterial: LineShaderMaterialProps;
	}
}

export { LineShaderMaterial };
