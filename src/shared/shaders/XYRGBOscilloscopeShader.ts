/**
 * XYRGB Oscilloscope Shader
 *
 * Advanced Three.js shader material for realistic oscilloscope line rendering
 * with XY coordinates and RGB color mapping. Adapted from woscope-r3f-ts
 * approach but enhanced for full RGB color support.
 *
 * Features:
 * - Realistic analytical Gaussian line rendering
 * - XY coordinate mapping with RGB color channels
 * - Anti-aliased line segments with proper thickness
 * - Additive blending for authentic CRT glow
 * - Error function integration for smooth line profiles
 */

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Vertex shader: Creates quads from line segments with proper orientation
export const xyrgbVertexShader = `
precision highp float;
#define EPS 1E-6

uniform float uSize;       // Line thickness
uniform float uGain;       // Scale factor for coordinates

attribute vec2 aStart, aEnd;    // Line segment endpoints (XY coordinates)
attribute vec3 aColorStart, aColorEnd;  // RGB colors at endpoints
attribute float aIdx;       // Vertex index for quad generation

// Varying outputs to fragment shader
varying vec4 uvl;          // .xy: quad orientation, .z: segment length, .w: segment index
varying vec3 vColor;       // Interpolated RGB color

void main() {
    float idx = mod(aIdx, 4.0);
    
    // Determine position and tangent from vertex index
    vec2 current = (idx >= 2.0) ? aEnd : aStart;
    vec3 color = (idx >= 2.0) ? aColorEnd : aColorStart;
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
    
    // Apply gain to coordinates and invert Y for oscilloscope convention
    vec2 position = current * uGain;
    position.y = -position.y;  // Invert Y-axis for oscilloscope display
    
    // Calculate final position with line thickness
    position += (tang * dir + norm * side) * uSize;
    
    // Pass color to fragment shader
    vColor = color;
    
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Fragment shader: Anti-aliased line rendering with RGB color support
export const xyrgbFragmentShader = `
precision highp float;

#define EPS 1E-6
#define SQRT2 1.4142135623730951

uniform float uSize;       // Line thickness
uniform float uIntensity;  // Line brightness/intensity
uniform float uExposure;   // Exposure adjustment

varying vec4 uvl;          // .xy: orientation, .z: length, .w: index
varying vec3 vColor;       // RGB color from vertex shader

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
    float sigma = uSize / 4.0;  // Gaussian width parameter
    
    // Calculate alpha based on line length using analytical integration
    float alpha;
    if(len < EPS) {
        // Point case: simple circular Gaussian
        alpha = exp(-pow(length(xy), 2.0) / (2.0 * sigma * sigma)) / 2.0 / sqrt(uSize);
    } else {
        // Line segment case: analytical Gaussian integral along line
        alpha = erf((len - xy.x) / SQRT2 / sigma) + erf(xy.x / SQRT2 / sigma);
        alpha *= exp(-xy.y * xy.y / (2.0 * sigma * sigma)) / 2.0 / len * uSize;
    }
    
    // Apply afterglow effect based on segment age
    float afterglow = smoothstep(0.0, 0.33, uvl.w / 512.0);
    alpha *= afterglow * uIntensity * uExposure;
    
    // Output RGB color with analytical alpha
    gl_FragColor = vec4(vColor * alpha, alpha);
}
`;

/**
 * Shader material for XYRGB oscilloscope rendering
 * Combines woscope-style realistic rendering with RGB color support
 */
const XYRGBOscilloscopeShaderMaterial = shaderMaterial(
	{
		// Uniforms with sensible defaults
		uSize: 0.012, // Line thickness
		uGain: 0.8, // Coordinate scale
		uIntensity: 1.0, // Brightness
		uExposure: 1.0, // Exposure adjustment
	},
	xyrgbVertexShader,
	xyrgbFragmentShader
);

// Apply material properties for proper blending
XYRGBOscilloscopeShaderMaterial.prototype.transparent = true;
XYRGBOscilloscopeShaderMaterial.prototype.blending = THREE.AdditiveBlending;
XYRGBOscilloscopeShaderMaterial.prototype.depthWrite = false;
XYRGBOscilloscopeShaderMaterial.prototype.depthTest = false;

// Extend R3F to recognize this material
extend({ XYRGBOscilloscopeShaderMaterial });

// TypeScript interface for material properties
export interface XYRGBOscilloscopeShaderMaterialProps
	extends THREE.ShaderMaterialParameters {
	uSize?: number;
	uGain?: number;
	uIntensity?: number;
	uExposure?: number;
	attach?: string;
	key?: React.Key;
	ref?: React.RefObject<THREE.ShaderMaterial>;
}

// Add type declaration for JSX
declare module '@react-three/fiber' {
	interface ThreeElements {
		xYRGBOscilloscopeShaderMaterial: XYRGBOscilloscopeShaderMaterialProps;
	}
}

export { XYRGBOscilloscopeShaderMaterial };
