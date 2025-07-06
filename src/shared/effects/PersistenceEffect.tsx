/**
 * Oscilloscope Persistence Effect
 *
 * Implements XYscope-style phosphor persistence (afterglow) effect
 * using React Three Fiber render targets and frame accumulation.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Simple persistence shader for frame blending
const persistenceVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const persistenceFragmentShader = `
precision highp float;
uniform sampler2D uCurrentFrame;
uniform sampler2D uPreviousFrame;
uniform float uPersistence;
uniform float uDecay;
varying vec2 vUv;

void main() {
    vec4 current = texture2D(uCurrentFrame, vUv);
    vec4 previous = texture2D(uPreviousFrame, vUv);
    
    // XYscope-style persistence: current + decayed previous
    vec4 result = current + previous * uPersistence * uDecay;
    
    // Prevent overflow
    result = min(result, vec4(1.0));
    
    gl_FragColor = result;
}
`;

interface PersistenceEffectProps {
	children: React.ReactNode;
	persistence?: number; // 0.0 = no persistence, 1.0 = full persistence
	decay?: number; // 0.0 = instant decay, 1.0 = no decay
	enabled?: boolean;
}

export function PersistenceEffect({
	children,
	persistence = 0.8,
	decay = 0.95,
	enabled = true,
}: PersistenceEffectProps) {
	const { gl, size, scene, camera } = useThree();

	// Double-buffered render targets
	const renderTargetA = useMemo(
		() =>
			new THREE.WebGLRenderTarget(size.width, size.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			}),
		[size.width, size.height]
	);

	const renderTargetB = useMemo(
		() =>
			new THREE.WebGLRenderTarget(size.width, size.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			}),
		[size.width, size.height]
	);

	// Persistence material
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: persistenceVertexShader,
				fragmentShader: persistenceFragmentShader,
				uniforms: {
					uCurrentFrame: { value: null },
					uPreviousFrame: { value: null },
					uPersistence: { value: persistence },
					uDecay: { value: decay },
				},
				transparent: true,
				blending: THREE.NormalBlending,
				depthWrite: false,
				depthTest: false,
			}),
		[persistence, decay]
	);

	// Full-screen quad for persistence effect
	const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

	// Scene for persistence pass
	const persistenceScene = useMemo(() => {
		const scene = new THREE.Scene();
		scene.add(new THREE.Mesh(geometry, material));
		return scene;
	}, [geometry, material]);

	// Orthographic camera for full-screen effect
	const orthoCamera = useMemo(
		() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
		[]
	);

	// Ping-pong between render targets
	const currentTarget = useRef(renderTargetA);
	const previousTarget = useRef(renderTargetB);
	const frameCount = useRef(0);

	// Update shader uniforms when props change
	useEffect(() => {
		material.uniforms.uPersistence.value = persistence;
		material.uniforms.uDecay.value = decay;
	}, [persistence, decay, material]);

	useFrame(() => {
		if (!enabled) {
			// Direct render without persistence
			gl.setRenderTarget(null);
			gl.render(scene, camera);
			return;
		}

		// Step 1: Render current frame to target
		gl.setRenderTarget(currentTarget.current);
		gl.clear();
		gl.render(scene, camera);

		// Step 2: Apply persistence effect (skip first frame)
		if (frameCount.current > 0) {
			material.uniforms.uCurrentFrame.value = currentTarget.current.texture;
			material.uniforms.uPreviousFrame.value = previousTarget.current.texture;

			// Render persistence result to screen
			gl.setRenderTarget(null);
			gl.render(persistenceScene, orthoCamera);
		} else {
			// First frame: direct copy
			gl.setRenderTarget(null);
			gl.render(scene, camera);
		}

		// Step 3: Swap targets for next frame
		const temp = currentTarget.current;
		currentTarget.current = previousTarget.current;
		previousTarget.current = temp;

		frameCount.current++;
	}, 1); // High priority

	// Render children normally - effect is applied in useFrame
	return <>{children}</>;
}

export default PersistenceEffect;
