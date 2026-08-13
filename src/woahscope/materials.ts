import { ShaderMaterial, AdditiveBlending, DataTexture, RGBAFormat, UnsignedByteType, Vector2 } from 'three';
import vsLine from '../shaders/vsLine.glsl';
import fsLine from '../shaders/fsLine.glsl';
import vsBlur from '../shaders/vsBlur.glsl';
import fsBlur from '../shaders/fsBlur.glsl';
import fsCopy from '../shaders/fsCopy.glsl';
import vsOutput from '../shaders/vsOutput.glsl';
import fsOutput from '../shaders/fsOutput.glsl';

let _whiteTex: DataTexture | null = null;
export function whiteTexture(): DataTexture {
	if (!_whiteTex) {
		_whiteTex = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
		_whiteTex.needsUpdate = true;
	}
	return _whiteTex;
}

/** Dispose module-scope textures. Safe to call more than once. */
export function disposeSharedTextures(): void {
	_whiteTex?.dispose();
	_whiteTex = null;
}

// _whiteTex is a page-lifetime singleton shared by every material this module
// creates (across both canvases), so it's freed on unload here rather than
// from any one component's unmount — no single component owns it.
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', disposeSharedTextures, { once: true });
}

export function createLineMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: vsLine,
		fragmentShader: fsLine,
		uniforms: {
			uInvert:     { value: 1 },
			uSize:       { value: 0.012 },
			uGain:       { value: 1 },
			uNEdges:     { value: 1 },
			uFadeAmount: { value: 0.4 },
			uIntensity:  { value: 0.005 },
			uScreen:     { value: whiteTexture() },
		},
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		depthTest:  false,
	});
}

export function createCopyMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: vsBlur,
		fragmentShader: fsCopy,
		uniforms: {
			uTexture0: { value: null },
		},
		depthTest:  false,
		depthWrite: false,
	});
}

export function createBlurMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: vsBlur,
		fragmentShader: fsBlur,
		uniforms: {
			uTexture0: { value: null },
			uOffset:   { value: new Vector2() },
		},
		depthTest:  false,
		depthWrite: false,
	});
}

export function createOutputMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: vsOutput,
		fragmentShader: fsOutput,
		uniforms: {
			uTexture0:       { value: null },   // lineRT
			uTexture1:       { value: null },   // blur1RT (tight glow)
			uTexture2:       { value: null },   // blur3RT (scatter)
			uTexture3:       { value: null },   // screenTexture (CRT noise)
			uExposure:       { value: 1.0 },
			uGlowStrength:   { value: 1.5 },
			uScatterStrength:{ value: 0.4 },
			uScatterBias:    { value: 0.35 },   // ambient scatter floor
			uWhitePoint:     { value: 0.3 },    // base colour-to-white mix offset
		},
		depthTest:  false,
		depthWrite: false,
	});
}
