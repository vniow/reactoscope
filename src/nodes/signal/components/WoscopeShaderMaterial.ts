/**
 * WoscopeShaderMaterial.ts
 * Custom shader material for woscope line visualization
 */
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Vertex shader for rendering line segments as quads
const vsLineCode = `
precision highp float;
#define EPS 1E-6

uniform float uSize;       // Line thickness

attribute vec2 aStart, aEnd;
attribute float aIdx;

// xy: quad orientation and side, z: segment length, w: segment index
varying vec4 uvl;

void main() {
    float idx = mod(aIdx, 4.0);
    
    // Determine position and tangent from vertex index
    vec2 current = (idx >= 2.0) ? aEnd : aStart;
    float tang = (idx >= 2.0) ? 1.0 : -1.0;
    
    // Side alternates between -1 and 1
    float side = (mod(idx, 2.0) - 0.5) * 2.0;
    
    // Pack values for fragment shader
    uvl.xy = vec2(tang, side);
    uvl.w = floor(aIdx / 4.0 + 0.5);  // segment index
    
    // Calculate direction and segment length
    vec2 dir = aEnd - aStart;
    uvl.z = length(dir);
    
    // Normalize direction if not too short
    if(uvl.z > EPS) {
        dir = dir / uvl.z;
    } else {
        dir = vec2(1.0, 0.0);  // Default direction
    }
    
    // Calculate normal vector (perpendicular)
    vec2 norm = vec2(-dir.y, dir.x);
    
    // Calculate final position (always inverted on Y-axis)
    gl_Position = vec4((current + (tang * dir + norm * side) * uSize) * -1.0, 0.0, 1.0);
}
`;

// Fragment shader for anti-aliased line segments
const fsLineCode = `
precision highp float;

#define EPS 1E-6
#define SQRT2 1.4142135623730951

uniform float uSize;      // Line thickness
uniform float uIntensity; // Line brightness
uniform vec4 uColor;      // Line color

varying vec4 uvl;         // .xy: orientation, .z: length, .w: index

// Error function approximation for analytical integration
float erf(float x) {
    float s = sign(x), a = abs(x);
    x = 1.0 + (0.278393 + (0.230389 + (0.000972 + 0.078108 * a) * a) * a) * a;
    x *= x;
    return s - s / (x * x);
}

void main(void) {
    float len = uvl.z;
    vec2 xy = vec2((len / 2.0 + uSize) * uvl.x + len / 2.0, uSize * uvl.y);
    float sigma = uSize / 4.0;
    
    // Calculate alpha based on line length
    float alpha;
    if(len < EPS) {
        // Point case
        alpha = exp(-pow(length(xy), 2.0) / (2.0 * sigma * sigma)) / 2.0 / sqrt(uSize);
    } else {
        // Line segment case
        alpha = erf((len - xy.x) / SQRT2 / sigma) + erf(xy.x / SQRT2 / sigma);
        alpha *= exp(-xy.y * xy.y / (2.0 * sigma * sigma)) / 2.0 / len * uSize;
    }
    
    // Apply afterglow effect
    float afterglow = smoothstep(0.0, 0.33, uvl.w / 2048.0);
    alpha *= afterglow * uIntensity;
    
    // Final color (always applying the color as-is since invert is always enabled)
    gl_FragColor = vec4(vec3(uColor), uColor.a * alpha);
}
`;

// Define the shader material using drei/shaderMaterial
const WoscopeShaderMaterial = shaderMaterial(
	{
		// Uniforms
		uSize: 0.012, // Line thickness - adjust as needed
		uIntensity: 1.0,
		uColor: new THREE.Vector4(0.0, 1.0, 0.0, 1.0), // Green, RGBA
	},
	vsLineCode,
	fsLineCode
);

// Apply default material properties
WoscopeShaderMaterial.prototype.transparent = true;
WoscopeShaderMaterial.prototype.blending = THREE.AdditiveBlending;
WoscopeShaderMaterial.prototype.depthWrite = false;

// Extend R3F to recognize this material
extend({ WoscopeShaderMaterial });

// Type definitions for the material
export interface WoscopeShaderMaterialProps
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
		woscopeShaderMaterial: WoscopeShaderMaterialProps;
	}
}

export { WoscopeShaderMaterial };
