/**
 * Oscilloscope Line Shader
 *
 * Custom Three.js shader material for rendering oscilloscope-style lines
 * with gaussian glow effects, inspired by XYscope.js implementation.
 *
 * Features:
 * - Gaussian line rendering with analytical glow
 * - Configurable line thickness and intensity
 * - RGB color channel support
 * - Additive blending for authentic CRT appearance
 */

import * as THREE from 'three';

// Vertex shader: Creates quads for each line segment with gaussian distribution
export const oscilloscopeVertexShader = `
#define EPS 1E-6

uniform float uGain;
uniform float uThickness;
uniform float uIntensity;

attribute vec2 aStart;
attribute vec2 aEnd;
attribute float aIndex;
attribute vec3 aColorStart;
attribute vec3 aColorEnd;

varying vec2 vUV;
varying vec3 vColor;
varying float vLength;
varying float vThickness;

void main() {
    // Map audio coordinates directly - audio data is already in [-1,1] range
    // Apply gain for size scaling but keep Y-axis as-is
    vec2 startPos = aStart * uGain;
    vec2 endPos = aEnd * uGain;
    
    // Calculate line direction and length
    vec2 direction = endPos - startPos;
    float lineLength = length(direction);
    
    if (lineLength > EPS) {
        direction = direction / lineLength;
    } else {
        direction = vec2(1.0, 0.0);
        lineLength = EPS;
    }
    
    // Calculate normal vector (perpendicular to line)
    vec2 normal = vec2(-direction.y, direction.x);
    
    // Determine quad vertex position based on aIndex
    float quadIndex = mod(aIndex, 4.0);
    vec2 position;
    vec3 color;
    
    if (quadIndex < 2.0) {
        // First two vertices at start of line
        position = startPos;
        color = aColorStart;
        vUV.x = 0.0;
    } else {
        // Last two vertices at end of line
        position = endPos;
        color = aColorEnd;
        vUV.x = 1.0;
    }
    
    // Offset vertices to create quad width
    float side = (mod(quadIndex, 2.0) - 0.5) * 2.0; // -1 or 1
    position += normal * side * uThickness;
    vUV.y = side * 0.5 + 0.5; // 0 to 1
    
    // Pass values to fragment shader
    vColor = color;
    vLength = lineLength;
    vThickness = uThickness;
    
    // Transform to clip space
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
}
`;

// Fragment shader: Gaussian intensity calculation for smooth line glow
export const oscilloscopeFragmentShader = `
#define EPS 1E-6
#define SQRT2 1.4142135623730951
#define TAU 6.283185307179586
#define TAUR 2.5066282746310002

precision highp float;

uniform float uIntensity;
uniform float uExposure;

varying vec2 vUV;
varying vec3 vColor;
varying float vLength;
varying float vThickness;

// Gaussian function for smooth line profile
float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma)) / (TAUR * sigma);
}

// Error function approximation for gaussian integral
float erf(float x) {
    float s = sign(x);
    float a = abs(x);
    x = 1.0 + (0.278393 + (0.230389 + 0.078108 * (a * a)) * a) * a;
    x *= x;
    return s - s / (x * x);
}

void main() {
    // Calculate distance from line center in UV space
    vec2 lineCoord = vUV - vec2(0.5, 0.5);
    
    // Sigma for gaussian calculation (similar to XYscope.js)
    float sigma = vThickness / 5.0;
    float brightness;
    
    if (vLength < EPS) {
        // Point-like segment: simple gaussian
        brightness = gaussian(length(lineCoord) * vThickness, sigma);
    } else {
        // Line segment: analytical gaussian integral (XYscope.js approach)
        float x = lineCoord.x * vLength;
        float y = lineCoord.y * vThickness;
        
        // Analytical integration along line length
        brightness = (erf(x / SQRT2 / sigma) - erf((x - vLength) / SQRT2 / sigma));
        brightness *= exp(-y * y / (2.0 * sigma * sigma)) / 2.0 / vLength;
    }
    
    // Apply intensity and exposure (similar to XYscope controls)
    brightness *= uIntensity * uExposure;
    
    // Output with RGB color and gaussian alpha for additive blending
    gl_FragColor = vec4(vColor * brightness, brightness);
}
`;

/**
 * Custom shader material for oscilloscope line rendering
 */
export class OscilloscopeLineMaterial extends THREE.ShaderMaterial {
	constructor(
		options: {
			gain?: number;
			thickness?: number;
			intensity?: number;
			exposure?: number;
		} = {}
	) {
		super({
			vertexShader: oscilloscopeVertexShader,
			fragmentShader: oscilloscopeFragmentShader,
			uniforms: {
				uGain: { value: options.gain ?? 1.0 },
				uThickness: { value: options.thickness ?? 0.02 },
				uIntensity: { value: options.intensity ?? 0.01 },
				uExposure: { value: options.exposure ?? 1.0 },
			},
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			depthTest: false,
		});
	}

	// Convenience setters for real-time parameter updates
	set gain(value: number) {
		this.uniforms.uGain.value = value;
	}

	set thickness(value: number) {
		this.uniforms.uThickness.value = value;
	}

	set intensity(value: number) {
		this.uniforms.uIntensity.value = value;
	}

	set exposure(value: number) {
		this.uniforms.uExposure.value = value;
	}
}
