
import { useEffect, useMemo, useRef } from 'react';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import {
	createLineMaterial,
	createCopyMaterial,
	createBlurMaterial,
	createOutputMaterial,
	whiteTexture,
} from './materials';
import { makeVertexIndexArray } from './utils';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { LanczosUpsampler } from './lanczos';


export const N_SAMPLES         = DEFAULT_AUDIO_SETTINGS.nSamples;
export const MAX_LANCZOS_STEPS = 8;
export const MAX_POINTS        = N_SAMPLES * MAX_LANCZOS_STEPS + 1;
export const MAX_VERTS         = MAX_POINTS * 4;
export const FADE_AMOUNT       = 0.4;


export const VS_QUAD = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const FS_FADE = /* glsl */`
  precision highp float;
  uniform float uAlpha;
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
  }
`;


export interface RenderTargets {
	lineRT:  THREE.WebGLRenderTarget;
	blur1RT: THREE.WebGLRenderTarget;
	blur2RT: THREE.WebGLRenderTarget;
	blur3RT: THREE.WebGLRenderTarget;
	blur4RT: THREE.WebGLRenderTarget;
}

export function useRenderTargets(): RenderTargets {
	const fboOpts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false } as const;
	const lineRT  = useFBO(1024, 1024, fboOpts);
	const blur1RT = useFBO(256,  256,  fboOpts);
	const blur2RT = useFBO(256,  256,  fboOpts);
	const blur3RT = useFBO(32,   32,   fboOpts);
	const blur4RT = useFBO(32,   32,   fboOpts);

	// useFBO from @react-three/drei handles disposal internally, but explicit
	// cleanup here guards against React Strict Mode double-mounts and HMR.
	// Calling dispose() on an already-disposed target is a no-op.
	useEffect(() => () => {
		lineRT.dispose();
		blur1RT.dispose();
		blur2RT.dispose();
		blur3RT.dispose();
		blur4RT.dispose();
	}, [lineRT, blur1RT, blur2RT, blur3RT, blur4RT]);

	return { lineRT, blur1RT, blur2RT, blur3RT, blur4RT };
}


export interface FadePass {
	fadeScene: THREE.Scene;
	fadeMat:   THREE.ShaderMaterial;
}

export function useFadePass(): FadePass {
	const [fadeScene, fadeMat, fadeGeo] = useMemo(() => {
		const geo = new THREE.PlaneGeometry(2, 2);
		const mat = new THREE.ShaderMaterial({
			vertexShader:   VS_QUAD,
			fragmentShader: FS_FADE,
			uniforms:    { uAlpha: { value: FADE_AMOUNT } },
			transparent: true,
			blending:    THREE.NormalBlending,
			depthTest:   false,
			depthWrite:  false,
		});
		const quad = new THREE.Mesh(geo, mat);
		quad.frustumCulled = false;
		const scene = new THREE.Scene();
		scene.add(quad);
		return [scene, mat, geo] as const;
	}, []);

	useEffect(() => () => { fadeMat.dispose(); fadeGeo.dispose(); }, [fadeMat, fadeGeo]);

	return { fadeScene, fadeMat };
}


export interface LineMesh {
	geometry:    THREE.BufferGeometry;
	lineMat:     THREE.Material;
	lineScene:   THREE.Scene;
	startArray:  Float32Array;
	endArray:    Float32Array;
	aIdxArray:   Float32Array;
	aColorArray: Float32Array;  // vec4 per vertex: r, g, b, a
}

export function useLineMesh(): LineMesh {
	const startArray  = useMemo(() => new Float32Array(MAX_VERTS * 2), []);
	const endArray    = useMemo(() => new Float32Array(MAX_VERTS * 2), []);
	const aIdxArray   = useMemo(() => new Float32Array(MAX_VERTS), []);
	const aColorArray = useMemo(() => new Float32Array(MAX_VERTS * 4), []);
	const indexArray  = useMemo(() => makeVertexIndexArray(MAX_POINTS), []);

	const geometry = useMemo(() => {
		const geom = new THREE.BufferGeometry();
		const sa = new THREE.BufferAttribute(startArray,  2); sa.usage = THREE.DynamicDrawUsage;
		const ea = new THREE.BufferAttribute(endArray,    2); ea.usage = THREE.DynamicDrawUsage;
		const ia = new THREE.BufferAttribute(aIdxArray,   1); ia.usage = THREE.DynamicDrawUsage;
		const ca = new THREE.BufferAttribute(aColorArray, 4); ca.usage = THREE.DynamicDrawUsage;
		geom.setAttribute('aStart', sa);
		geom.setAttribute('aEnd',   ea);
		geom.setAttribute('aIdx',   ia);
		geom.setAttribute('aColor', ca);
		geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
		geom.setDrawRange(0, 0);
		return geom;
	}, [startArray, endArray, aIdxArray, aColorArray, indexArray]);

	const lineMat = useMemo(() => createLineMaterial(), []);

	const lineScene = useMemo(() => {
		const mesh = new THREE.Mesh(geometry, lineMat);
		mesh.frustumCulled = false;
		const scene = new THREE.Scene();
		scene.add(mesh);
		return scene;
	}, [geometry, lineMat]);

	useEffect(() => () => { geometry.dispose(); lineMat.dispose(); }, [geometry, lineMat]);

	return { geometry, lineMat, lineScene, startArray, endArray, aIdxArray, aColorArray };
}


export interface CRTTexture {
	whiteTex:         THREE.Texture;
	screenTextureRef: React.RefObject<THREE.Texture | null>;
}

export function useCRTTexture(): CRTTexture {
	const whiteTex         = whiteTexture();
	const screenTextureRef = useRef<THREE.Texture | null>(null);

	useEffect(() => {
		let mounted = true;
		const loader = new THREE.TextureLoader();
		loader.load('/noise.jpg', (tex) => {
			if (!mounted) { tex.dispose(); return; }
			tex.minFilter = THREE.LinearMipmapLinearFilter;
			tex.magFilter = THREE.LinearFilter;
			tex.generateMipmaps = true;
			tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
			screenTextureRef.current = tex;
		});
		return () => {
			mounted = false;
			screenTextureRef.current?.dispose();
			screenTextureRef.current = null;
		};
	}, []);

	return { whiteTex, screenTextureRef };
}


export interface PassPipeline {
	passScene: THREE.Scene;
	passQuad:  THREE.Mesh;
	copyMat:   THREE.ShaderMaterial;
	blurMat:   THREE.ShaderMaterial;
	outputMat: THREE.ShaderMaterial;
}

export function usePassPipeline(): PassPipeline {
	const { passScene, passQuad, copyMat, blurMat, outputMat, passGeo } = useMemo(() => {
		const geo       = new THREE.PlaneGeometry(2, 2);
		const copyMat   = createCopyMaterial();
		const blurMat   = createBlurMaterial();
		const outputMat = createOutputMaterial();
		const quad = new THREE.Mesh(geo, copyMat);
		quad.frustumCulled = false;
		const scene = new THREE.Scene();
		scene.add(quad);
		return { passScene: scene, passQuad: quad, copyMat, blurMat, outputMat, passGeo: geo };
	}, []);

	useEffect(() => () => {
		copyMat.dispose();
		blurMat.dispose();
		outputMat.dispose();
		passGeo.dispose();
	}, [copyMat, blurMat, outputMat, passGeo]);

	return { passScene, passQuad, copyMat, blurMat, outputMat };
}


export interface LanczosResources {
	upsamplerRef: React.RefObject<LanczosUpsampler>;
	smoothedX:    React.RefObject<Float32Array>;
	smoothedY:    React.RefObject<Float32Array>;
	smoothedR:    React.RefObject<Float32Array>;
	smoothedG:    React.RefObject<Float32Array>;
	smoothedB:    React.RefObject<Float32Array>;
	smoothedA:    React.RefObject<Float32Array>;
	nPointsRef:   React.RefObject<number>;
}

export function useLanczos(steps: number, nSamples: number): LanczosResources {
	const upsamplerRef = useRef(new LanczosUpsampler(nSamples, steps));
	const smoothedX    = useRef(new Float32Array(MAX_POINTS));
	const smoothedY    = useRef(new Float32Array(MAX_POINTS));
	const smoothedR    = useRef(new Float32Array(MAX_POINTS));
	const smoothedG    = useRef(new Float32Array(MAX_POINTS));
	const smoothedB    = useRef(new Float32Array(MAX_POINTS));
	const smoothedA    = useRef(new Float32Array(MAX_POINTS));
	const nPointsRef   = useRef<number>(nSamples);

	useEffect(() => {
		upsamplerRef.current = new LanczosUpsampler(nSamples, steps);
		return () => { upsamplerRef.current.dispose(); };
	}, [steps, nSamples]);

	return { upsamplerRef, smoothedX, smoothedY, smoothedR, smoothedG, smoothedB, smoothedA, nPointsRef };
}
