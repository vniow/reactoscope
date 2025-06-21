import { useCallback, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { type NodeProps, useReactFlow, Position } from '@xyflow/react';
import * as THREE from 'three';

import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GeometricScene } from './GeometricScene'; // Re-using the scene for visuals
import { useSonifierStore } from '../audio/stores/sonifierStore';
import { useSonifierWorklet } from '../audio/hooks/useSonifierWorklet';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridButton } from '../shared/components/ui/GridButton';
import { GridSelect } from '../shared/components/ui/GridSelect';

// Configuration
const NODE_GRID_WIDTH = 8;
const NODE_GRID_HEIGHT = 15; // Increased to accommodate audio controls

// Handle configuration for improved maintainability (matches SonifierWorkletNode properties)
const HANDLE_CONFIG = {
	OUTPUT_X: { id: 'outputX', label: 'X' },
	OUTPUT_Y: { id: 'outputY', label: 'Y' },
	OUTPUT_R: { id: 'outputR', label: 'R' },
	OUTPUT_G: { id: 'outputG', label: 'G' },
	OUTPUT_B: { id: 'outputB', label: 'B' },
} as const;

interface SonifierDebugInfo {
	rawVertexCount: number;
	processedVertexCount: number;
	bufferCapacity: number;
	firstVertexData: number[];
	meshCount: number;
	dataWriteTime: number;
	objectDetails: Array<{
		type: string;
		pointCount: number;
		interpolatedPointCount: number;
		firstVertex: number[];
		lastVertex: number[];
		materialColor: string;
	}>;
}

interface AudioOutputSample {
	vertexX: number;
	vertexY: number;
	colorR: number;
	colorG: number;
	colorB: number;
	timestamp: number;
	vertexIndex: number;
}

interface InterpolationControls {
	enabled: boolean;
	density: number; // Multiplier for point density (1.0 = original, 2.0 = double points)
	smoothing: number; // Smoothing factor for lerp (0.0 = no smoothing, 1.0 = maximum smoothing)
	type: 'linear' | 'smooth' | 'cosine' | 'cubic'; // Interpolation method
}

/**
 * A component running inside the R3F canvas to traverse the scene
 * and write vertex data to the SharedArrayBuffer.
 */
function SceneDataEmitter({
	onDebugInfoUpdate,
	interpolationControls,
}: {
	onDebugInfoUpdate: (info: SonifierDebugInfo) => void;
	interpolationControls: InterpolationControls;
}) {
	const sharedBuffer = useSonifierStore((s) => s.sharedBuffer);
	const isPlaying = useSonifierStore((s) => s.isPlaying);

	useFrame(({ scene, camera }) => {
		if (!sharedBuffer) {
			onDebugInfoUpdate({
				rawVertexCount: 0,
				processedVertexCount: 0,
				bufferCapacity: 0,
				firstVertexData: [],
				meshCount: 0,
				dataWriteTime: 0,
				objectDetails: [],
			});
			return;
		}

		const startTime = performance.now();
		const vertices: THREE.Vector3[] = [];
		const colors: THREE.Color[] = [];
		let meshCount = 0;
		const objectDetails: Array<{
			type: string;
			pointCount: number;
			interpolatedPointCount: number;
			firstVertex: number[];
			lastVertex: number[];
			materialColor: string;
		}> = [];

		// Helper function to interpolate vertices using different methods
		const interpolateVertices = (
			vertices: THREE.Vector3[],
			colors: THREE.Color[],
			density: number
		) => {
			if (
				!interpolationControls.enabled ||
				density <= 1.0 ||
				vertices.length < 2
			) {
				return { vertices, colors };
			}

			const interpolatedVertices: THREE.Vector3[] = [];
			const interpolatedColors: THREE.Color[] = [];

			// Helper function for different interpolation methods
			const getInterpolationValue = (t: number): number => {
				switch (interpolationControls.type) {
					case 'linear':
						return t;
					case 'smooth':
						// Smoothstep interpolation
						return t * t * (3 - 2 * t);
					case 'cosine':
						// Cosine interpolation
						return (1 - Math.cos(t * Math.PI)) / 2;
					case 'cubic':
						// Cubic ease-in-out
						return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
					default:
						return t;
				}
			};

			for (let i = 0; i < vertices.length - 1; i++) {
				const currentVertex = vertices[i];
				const nextVertex = vertices[i + 1];
				const currentColor = colors[i];
				const nextColor = colors[i + 1];

				// Add the current vertex
				interpolatedVertices.push(currentVertex.clone());
				interpolatedColors.push(currentColor.clone());

				// Add interpolated points between current and next
				const steps = Math.floor(density);
				for (let step = 1; step < steps; step++) {
					const t = step / steps;
					const interpolatedT = getInterpolationValue(t);

					// Interpolate vertex position using the selected method
					const interpolatedVertex = new THREE.Vector3();
					interpolatedVertex.lerpVectors(
						currentVertex,
						nextVertex,
						interpolatedT
					);

					// Apply smoothing if enabled
					if (interpolationControls.smoothing > 0) {
						const smoothingFactor = interpolationControls.smoothing * 0.5;
						interpolatedVertex.lerp(currentVertex, smoothingFactor);
					}

					// Interpolate color
					const interpolatedColor = new THREE.Color();
					interpolatedColor.lerpColors(currentColor, nextColor, interpolatedT);

					interpolatedVertices.push(interpolatedVertex);
					interpolatedColors.push(interpolatedColor);
				}
			}

			// Add the last vertex
			if (vertices.length > 0) {
				interpolatedVertices.push(vertices[vertices.length - 1].clone());
				interpolatedColors.push(colors[colors.length - 1].clone());
			}

			return {
				vertices: interpolatedVertices,
				colors: interpolatedColors,
			};
		};

		// Debug: Log when we start traversing
		// console.log(
		// 	'Scene traversal starting, isPlaying:',
		// 	isPlaying,
		// 	'sharedBuffer:',
		// 	!!sharedBuffer
		// );

		scene.traverse((object) => {
			// Handle both Mesh and Line objects
			if (
				(object instanceof THREE.Mesh || object instanceof THREE.Line) &&
				object.geometry
			) {
				meshCount++;
				// console.log(
				// 	'Found object:',
				// 	object.type,
				// 	'with geometry, vertex count:',
				// 	object.geometry.attributes.position?.count
				// );
				const geometry = object.geometry;
				const positionAttribute = geometry.attributes.position;
				const colorAttribute = geometry.attributes.color;

				if (positionAttribute && positionAttribute.count > 0) {
					const objectVertices: THREE.Vector3[] = [];
					const objectColors: THREE.Color[] = [];
					let materialColor = '#ffffff';

					// Extract material color for this object
					if (object.material) {
						if (Array.isArray(object.material)) {
							const firstMaterial = object.material[0];
							if (firstMaterial && 'color' in firstMaterial) {
								materialColor =
									'#' +
									(
										firstMaterial as
											| THREE.LineBasicMaterial
											| THREE.MeshStandardMaterial
									).color.getHexString();
							}
						} else if ('color' in object.material) {
							materialColor =
								'#' +
								(
									object.material as
										| THREE.LineBasicMaterial
										| THREE.MeshStandardMaterial
								).color.getHexString();
						}
					}

					// Extract all vertices from this object (mesh or line)
					for (let i = 0; i < positionAttribute.count; i++) {
						const vertex = new THREE.Vector3();
						vertex.fromBufferAttribute(positionAttribute, i);

						// Transform to world coordinates
						vertex.applyMatrix4(object.matrixWorld);
						objectVertices.push(vertex.clone());

						// Extract or derive color for this vertex
						let vertexColor = new THREE.Color(1, 1, 1); // Default white

						if (colorAttribute && i < colorAttribute.count) {
							// Use per-vertex color if available
							vertexColor.fromBufferAttribute(colorAttribute, i);
						} else if (object.material) {
							// Use material color as fallback
							if (Array.isArray(object.material)) {
								// Multi-material object - use first material
								const firstMaterial = object.material[0];
								if (firstMaterial && 'color' in firstMaterial) {
									vertexColor = (
										firstMaterial as
											| THREE.LineBasicMaterial
											| THREE.MeshStandardMaterial
									).color.clone();
								}
							} else {
								// Single material
								if ('color' in object.material) {
									vertexColor = (
										object.material as
											| THREE.LineBasicMaterial
											| THREE.MeshStandardMaterial
									).color.clone();
								} else if ('map' in object.material && object.material.map) {
									// If it's a textured material, use a default color
									vertexColor = new THREE.Color(0.8, 0.8, 0.8);
								}
							}
						}

						objectColors.push(vertexColor.clone());
					}

					// Apply interpolation to this object's vertices if enabled
					let finalVertices = objectVertices;
					let finalColors = objectColors;

					if (
						interpolationControls.enabled &&
						interpolationControls.density > 1
					) {
						const interpolated = interpolateVertices(
							objectVertices,
							objectColors,
							interpolationControls.density
						);
						finalVertices = interpolated.vertices;
						finalColors = interpolated.colors;
					}

					// Add final vertices to the global arrays
					vertices.push(...finalVertices);
					colors.push(...finalColors);

					// Calculate first and last vertex data for this object (using final data)
					const calculateVertexData = (
						vertex: THREE.Vector3,
						color: THREE.Color
					) => {
						const screenCoords = vertex.clone().project(camera);
						const normalizedX = Math.max(-1, Math.min(1, screenCoords.x));
						const normalizedY = Math.max(-1, Math.min(1, screenCoords.y));
						const audioR = (color.r - 0.5) * 2;
						const audioG = (color.g - 0.5) * 2;
						const audioB = (color.b - 0.5) * 2;
						return [
							normalizedX,
							normalizedY,
							Math.max(-1, Math.min(1, audioR)),
							Math.max(-1, Math.min(1, audioG)),
							Math.max(-1, Math.min(1, audioB)),
						];
					};

					const firstVertex = calculateVertexData(
						finalVertices[0],
						finalColors[0]
					);
					const lastVertex = calculateVertexData(
						finalVertices[finalVertices.length - 1],
						finalColors[finalColors.length - 1]
					);

					objectDetails.push({
						type: object.type,
						pointCount: objectVertices.length,
						interpolatedPointCount: finalVertices.length,
						firstVertex,
						lastVertex,
						materialColor,
					});
				}
			}
		});

		const dataView = new Float32Array(sharedBuffer);
		const bufferCapacity = Math.floor((dataView.length - 1) / 5);
		const rawVertexCount = vertices.length;
		const processedVertexCount = Math.min(rawVertexCount, bufferCapacity);

		// Only write to SharedArrayBuffer when playing, but always calculate debug info
		if (isPlaying) {
			// Write vertex count at index 0 for the audio worklet
			dataView[0] = processedVertexCount;

			// Process and write vertex data to SharedArrayBuffer
			for (let i = 0; i < processedVertexCount; i++) {
				const vertex = vertices[i];
				const color = colors[i] || new THREE.Color(1, 1, 1);

				// Project vertex to screen coordinates (normalized -1 to 1)
				const screenCoords = vertex.clone().project(camera);

				// Ensure screen coordinates are clamped to valid audio range
				const normalizedX = Math.max(-1, Math.min(1, screenCoords.x));
				const normalizedY = Math.max(-1, Math.min(1, screenCoords.y));

				// Color values are already in 0-1 range, map to -1 to 1 for audio
				const audioR = (color.r - 0.5) * 2;
				const audioG = (color.g - 0.5) * 2;
				const audioB = (color.b - 0.5) * 2;

				const offset = 1 + i * 5;
				dataView[offset + 0] = normalizedX;
				dataView[offset + 1] = normalizedY;
				dataView[offset + 2] = Math.max(-1, Math.min(1, audioR));
				dataView[offset + 3] = Math.max(-1, Math.min(1, audioG));
				dataView[offset + 4] = Math.max(-1, Math.min(1, audioB));
			}
		}

		// Get first vertex data for debug display (calculate regardless of playing state)
		const firstVertexData =
			processedVertexCount > 0
				? (() => {
						if (isPlaying) {
							// If playing, get data from SharedArrayBuffer
							return Array.from(dataView.slice(1, 6));
						} else {
							// If not playing, calculate the data without writing to SAB
							const vertex = vertices[0];
							const color = colors[0] || new THREE.Color(1, 1, 1);
							const screenCoords = vertex.clone().project(camera);
							const normalizedX = Math.max(-1, Math.min(1, screenCoords.x));
							const normalizedY = Math.max(-1, Math.min(1, screenCoords.y));
							const audioR = (color.r - 0.5) * 2;
							const audioG = (color.g - 0.5) * 2;
							const audioB = (color.b - 0.5) * 2;
							return [
								normalizedX,
								normalizedY,
								Math.max(-1, Math.min(1, audioR)),
								Math.max(-1, Math.min(1, audioG)),
								Math.max(-1, Math.min(1, audioB)),
							];
						}
					})()
				: [];

		// Debug: Log final counts
		// console.log('Scene traversal complete:', {
		// 	meshCount,
		// 	rawVertexCount: vertices.length,
		// 	processedVertexCount,
		// 	bufferCapacity,
		// });

		const endTime = performance.now();
		const dataWriteTime = endTime - startTime;

		onDebugInfoUpdate({
			rawVertexCount,
			processedVertexCount,
			bufferCapacity,
			firstVertexData,
			meshCount,
			dataWriteTime,
			objectDetails,
		});

		// In a full implementation, this would be an atomic operation to notify the worker.
		// Atomics.notify(new Int32Array(sharedBuffer), 0, 1);
	});

	return null; // This component does not render anything itself
}

export function VertexSonifierNode({ id, data, selected = false }: NodeProps) {
	const reactFlowInstance = useReactFlow();
	const { init, cleanup, setPlaying, isPlaying, isReady } = useSonifierStore();
	const sharedBuffer = useSonifierStore((s) => s.sharedBuffer);

	// Audio worklet integration with central audio system
	const worklet = useSonifierWorklet(id);

	const [debugInfo, setDebugInfo] = useState<SonifierDebugInfo>({
		rawVertexCount: 0,
		processedVertexCount: 0,
		bufferCapacity: 0,
		firstVertexData: [],
		meshCount: 0,
		dataWriteTime: 0,
		objectDetails: [],
	});

	// State to track audio worklet output samples for debugging
	const [audioOutputSamples, setAudioOutputSamples] = useState<
		AudioOutputSample[]
	>([]);

	// State for interpolation controls
	const [interpolationControls, setInterpolationControls] =
		useState<InterpolationControls>({
			enabled: true,
			density: 2,
			smoothing: 0.5,
			type: 'linear',
		});

	const hasValidGeometry = debugInfo.objectDetails.length > 0;

	// Sample audio worklet inputs/outputs for debugging
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;

		if (worklet.isPlaying && worklet.isReady && sharedBuffer) {
			intervalId = setInterval(() => {
				try {
					// Read current vertex data from SharedArrayBuffer that's being fed to the worklet
					const dataView = new Float32Array(sharedBuffer);
					const vertexCount = dataView[0];

					if (vertexCount > 0) {
						// Sample the first few vertices to show what data is being processed
						const samples: AudioOutputSample[] = [];
						const samplesToTake = Math.min(5, vertexCount); // Show first 5 vertices

						for (let i = 0; i < samplesToTake; i++) {
							const offset = 1 + i * 5; // Skip count at index 0, each vertex is 5 floats
							const sample: AudioOutputSample = {
								vertexX: dataView[offset + 0] || 0,
								vertexY: dataView[offset + 1] || 0,
								colorR: dataView[offset + 2] || 0,
								colorG: dataView[offset + 3] || 0,
								colorB: dataView[offset + 4] || 0,
								timestamp: Date.now(),
								vertexIndex: i,
							};
							samples.push(sample);
						}

						setAudioOutputSamples(samples);
					} else {
						setAudioOutputSamples([]);
					}
				} catch (error) {
					console.warn('Error sampling vertex data for audio:', error);
				}
			}, 500); // Sample every 500ms (not too frequent)
		} else {
			// Clear samples when not playing
			setAudioOutputSamples([]);
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [worklet.isPlaying, worklet.isReady, sharedBuffer]);

	useEffect(() => {
		const sab = new SharedArrayBuffer(1024 * 5 * 4 + 4); // 1024 points, 5 floats each, plus a 4-byte lock
		init(sab);

		return () => {
			cleanup();
		};
	}, [init, cleanup]);

	const removeNode = useCallback(() => {
		reactFlowInstance.setNodes((nodes) =>
			nodes.filter((node) => node.id !== id)
		);
		reactFlowInstance.setEdges((edges) =>
			edges.filter((edge) => edge.source !== id && edge.target !== id)
		);
	}, [reactFlowInstance, id]);

	const handlePlayToggle = useCallback(async () => {
		if (!worklet.isPlaying) {
			// Start: Use the hook's start method which handles everything
			try {
				await worklet.start();
				setPlaying(true); // Update sonifier store state
			} catch (error) {
				console.error('Failed to start sonifier worklet:', error);
			}
		} else {
			// Stop: Use the hook's stop method which handles everything
			worklet.stop();
			setPlaying(false); // Update sonifier store state
		}
	}, [worklet, setPlaying]);

	return (
		<BaseNode
			variant='source'
			gridWidth={NODE_GRID_WIDTH}
			gridHeight={NODE_GRID_HEIGHT}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={typeof data.label === 'string' ? data.label : 'Vertex Sonifier'}
		>
			<GridBlock
				gridWidth={4}
				gridHeight={4}
				gridX={0}
				gridY={1}
			>
				<div className='w-full h-full bg-black rounded-lg overflow-hidden border border-gray-600'>
					<Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
						<color
							attach='background'
							args={[0, 0, 0]}
						/>
						<ambientLight intensity={0.8} />
						<GeometricScene />
						<SceneDataEmitter
							onDebugInfoUpdate={setDebugInfo}
							interpolationControls={interpolationControls}
						/>
					</Canvas>
				</div>
			</GridBlock>

			<GridButton
				gridWidth={4}
				gridHeight={1}
				gridX={4}
				gridY={1}
				buttonLabel={isPlaying ? '⏹️ Stop' : '▶️ Play'}
				onClick={handlePlayToggle}
				disabled={!hasValidGeometry}
				variant='primary'
			/>

			{/* Audio Activity Indicator */}
			{worklet.isPlaying && audioOutputSamples.length > 0 && (
				<GridBlock
					gridWidth={4}
					gridHeight={0.5}
					gridX={4}
					gridY={1.5}
				>
					<div className='flex items-center justify-center bg-green-900 bg-opacity-50 rounded-md h-full'>
						<div className='flex space-x-1'>
							<div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
							<div
								className='w-2 h-2 bg-green-400 rounded-full animate-pulse'
								style={{ animationDelay: '0.2s' }}
							></div>
							<div
								className='w-2 h-2 bg-green-400 rounded-full animate-pulse'
								style={{ animationDelay: '0.4s' }}
							></div>
						</div>
						<span className='ml-2 text-xs text-green-300'>Audio Active</span>
					</div>
				</GridBlock>
			)}

			{/* Interpolation Enable/Disable Toggle */}
			<GridBlock
				gridWidth={4}
				gridHeight={1}
				gridX={4}
				gridY={2.25}
			>
				<div className='p-2 bg-white rounded-md border flex items-center gap-2'>
					<input
						type='checkbox'
						id='interpolation-enabled'
						checked={interpolationControls.enabled}
						onChange={(e) =>
							setInterpolationControls((prev) => ({
								...prev,
								enabled: e.target.checked,
							}))
						}
						className='w-4 h-4'
					/>
					<label
						htmlFor='interpolation-enabled'
						className='text-sm text-gray-700 font-medium'
					>
						Enable Interpolation
					</label>
				</div>
			</GridBlock>

			{/* Interpolation Type Selector */}
			<GridSelect
				gridWidth={4}
				gridHeight={1}
				gridX={4}
				gridY={3}
				label='Type'
				layout='compact'
				showValue={false}
				textSize='xs'
				selectProps={{
					value: interpolationControls.type,
					options: [
						{ value: 'linear', label: 'Linear' },
						{ value: 'smooth', label: 'Smooth' },
						{ value: 'cosine', label: 'Cosine' },
						{ value: 'cubic', label: 'Cubic' },
					],
					onChange: (e) =>
						setInterpolationControls((prev) => ({
							...prev,
							type: e.target.value as 'linear' | 'smooth' | 'cosine' | 'cubic',
						})),
					disabled: !interpolationControls.enabled,
					'aria-label': 'Interpolation type selection',
				}}
			/>

			{/* Density Slider */}
			<GridSlider
				gridWidth={4}
				gridHeight={1.5}
				gridX={4}
				gridY={3.75}
				label='Density'
				layout='compact'
				showValue={true}
				textSize='xs'
				sliderProps={{
					value: interpolationControls.density,
					min: 1,
					max: 10,
					step: 1,
					onChange: (e) =>
						setInterpolationControls((prev) => ({
							...prev,
							density: parseInt(e.target.value),
						})),
					disabled: !interpolationControls.enabled,
					formatValue: (value) => `${value}x`,
					showMinMax: true,
					size: 'sm',
					'aria-label': 'Interpolation density control',
				}}
			/>

			{/* Smoothing Slider */}
			<GridSlider
				gridWidth={4}
				gridHeight={1.5}
				gridX={4}
				gridY={5}
				label='Smoothing'
				layout='compact'
				showValue={true}
				textSize='xs'
				sliderProps={{
					value: interpolationControls.smoothing,
					min: 0,
					max: 1,
					step: 0.01,
					onChange: (e) =>
						setInterpolationControls((prev) => ({
							...prev,
							smoothing: parseFloat(e.target.value),
						})),
					disabled: !interpolationControls.enabled,
					formatValue: (value) => value.toFixed(2),
					showMinMax: true,
					size: 'sm',
					'aria-label': 'Interpolation smoothing control',
				}}
			/>

			{/* Audio Volume Control */}
			<GridSlider
				gridWidth={4}
				gridHeight={1.5}
				gridX={0}
				gridY={5.5}
				label='Volume'
				layout='compact'
				showValue={true}
				textSize='xs'
				sliderProps={{
					value: worklet.params.volume,
					min: 0,
					max: 1,
					step: 0.01,
					onChange: (e) => {
						const newVolume = parseFloat(e.target.value);
						worklet.setVolume(newVolume);
					},
					formatValue: (value) => `${Math.round(value * 100)}%`,
					showMinMax: true,
					size: 'sm',
					'aria-label': 'Audio volume control',
				}}
			/>

			{/* Audio Playback Speed Control */}
			<GridSlider
				gridWidth={4}
				gridHeight={1.5}
				gridX={4}
				gridY={6.25}
				label='Speed'
				layout='compact'
				showValue={true}
				textSize='xs'
				sliderProps={{
					value: worklet.params.playbackSpeed,
					min: 0.1,
					max: 5.0,
					step: 0.1,
					onChange: (e) => {
						const newSpeed = parseFloat(e.target.value);
						worklet.setPlaybackSpeed(newSpeed);
					},
					formatValue: (value) => `${value.toFixed(1)}x`,
					showMinMax: true,
					size: 'sm',
					'aria-label': 'Audio playback speed control',
				}}
			/>

			<GridBlock
				gridWidth={8}
				gridHeight={8}
				gridX={0}
				gridY={7}
			>
				<div className='p-2 font-mono text-xs text-gray-300 w-full h-full overflow-y-auto'>
					<h4 className='font-bold text-white mb-1 border-b border-gray-600 pb-1'>
						Debug Info
					</h4>
					<div className='grid grid-cols-2 gap-x-4 gap-y-1 mt-2'>
						<span>Status:</span>
						<span className={isReady ? 'text-green-400' : 'text-yellow-400'}>
							{isReady ? 'Ready' : 'Initializing...'}
						</span>

						<span>Playing:</span>
						<span>{isPlaying || worklet.isPlaying ? 'Yes' : 'No'}</span>

						<span>SAB Size:</span>
						<span>{sharedBuffer?.byteLength || 0} bytes</span>

						<span>SAB Capacity:</span>
						<span>{debugInfo.bufferCapacity} points</span>

						<span>Object Count:</span>
						<span>{debugInfo.meshCount}</span>

						<span>Raw Vertices:</span>
						<span>{debugInfo.rawVertexCount}</span>

						<span>Processed Vertices:</span>
						<span>{debugInfo.processedVertexCount}</span>

						<span>Process Time:</span>
						<span>{debugInfo.dataWriteTime.toFixed(2)}ms</span>

						<span>Interpolation:</span>
						<span className='text-cyan-400'>
							{interpolationControls.enabled
								? `${interpolationControls.type} (${interpolationControls.density}x)`
								: 'Disabled'}
						</span>

						<span>Worklet Ready:</span>
						<span
							className={worklet.isReady ? 'text-green-400' : 'text-yellow-400'}
						>
							{worklet.isReady ? 'Yes' : 'No'}
						</span>

						<span>Worklet Playing:</span>
						<span
							className={worklet.isPlaying ? 'text-green-400' : 'text-red-400'}
						>
							{worklet.isPlaying ? 'Yes' : 'No'}
						</span>

						<span>Audio Data:</span>
						<span className='text-purple-400'>
							{worklet.isPlaying && audioOutputSamples.length > 0
								? `${audioOutputSamples.length} samples`
								: 'No data'}
						</span>
					</div>

					{/* Audio Worklet Sample Data */}
					{worklet.isPlaying && audioOutputSamples.length > 0 && (
						<div className='mt-2 pt-1 border-t border-gray-600'>
							<p className='font-bold text-white mb-1'>
								Audio Worklet Input (First 5 Vertices):
							</p>
							<div className='space-y-1'>
								{audioOutputSamples.map((sample) => (
									<div
										key={sample.vertexIndex}
										className='text-xs bg-gray-800 p-1 rounded'
									>
										<div className='flex justify-between items-center'>
											<span className='text-purple-300'>
												V{sample.vertexIndex}
											</span>
											<span className='text-xs text-gray-400'>
												{new Date(sample.timestamp).toLocaleTimeString()}
											</span>
										</div>
										<div className='grid grid-cols-5 gap-1 mt-1 text-xs'>
											<div>
												<span className='text-red-300'>X:</span>
												<span className='ml-1'>
													{sample.vertexX.toFixed(3)}
												</span>
											</div>
											<div>
												<span className='text-green-300'>Y:</span>
												<span className='ml-1'>
													{sample.vertexY.toFixed(3)}
												</span>
											</div>
											<div>
												<span className='text-red-400'>R:</span>
												<span className='ml-1'>{sample.colorR.toFixed(3)}</span>
											</div>
											<div>
												<span className='text-green-400'>G:</span>
												<span className='ml-1'>{sample.colorG.toFixed(3)}</span>
											</div>
											<div>
												<span className='text-blue-400'>B:</span>
												<span className='ml-1'>{sample.colorB.toFixed(3)}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Per-Object Details */}
					<div className='mt-2 pt-1 border-t border-gray-600'>
						<p className='font-bold text-white mb-1'>Objects in Scene:</p>
						{debugInfo.objectDetails.length > 0 ? (
							debugInfo.objectDetails.map((obj, index) => (
								<div
									key={index}
									className='mb-2 p-1 bg-gray-800 rounded text-xs'
								>
									<div className='flex justify-between items-center mb-1'>
										<span className='text-yellow-300'>{obj.type}</span>
										<span className='text-blue-300'>
											{obj.pointCount} →{' '}
											{obj.interpolatedPointCount || obj.pointCount} pts
										</span>
									</div>
									<div className='flex items-center mb-1'>
										<span className='mr-2'>Color:</span>
										<div
											className='w-3 h-3 rounded border border-gray-500 mr-1'
											style={{ backgroundColor: obj.materialColor }}
										></div>
										<span className='text-xs'>{obj.materialColor}</span>
									</div>
									<div className='text-indigo-300'>
										<div>
											First: [
											{obj.firstVertex.map((n) => n.toFixed(2)).join(', ')}]
										</div>
										<div>
											Last: [
											{obj.lastVertex.map((n) => n.toFixed(2)).join(', ')}]
										</div>
									</div>
								</div>
							))
						) : (
							<span className='text-gray-500'>No objects found</span>
						)}
					</div>
				</div>
			</GridBlock>

			{/* Output Handles for the 5 channels */}
			{/* Audio connections are handled centrally by the audio store */}
			{/* The store's syncWithReactFlowEdges method maps these handles to worklet outputs */}
			{/* outputX -> worklet.outputX, outputY -> worklet.outputY, etc. */}
			<GridNodeHandle
				id={HANDLE_CONFIG.OUTPUT_X.id}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={0.5}
				label={HANDLE_CONFIG.OUTPUT_X.label}
			/>
			<GridNodeHandle
				id={HANDLE_CONFIG.OUTPUT_Y.id}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={1.5}
				label={HANDLE_CONFIG.OUTPUT_Y.label}
			/>
			<GridNodeHandle
				id={HANDLE_CONFIG.OUTPUT_R.id}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={2.5}
				label={HANDLE_CONFIG.OUTPUT_R.label}
			/>
			<GridNodeHandle
				id={HANDLE_CONFIG.OUTPUT_G.id}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={3.5}
				label={HANDLE_CONFIG.OUTPUT_G.label}
			/>
			<GridNodeHandle
				id={HANDLE_CONFIG.OUTPUT_B.id}
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={4.5}
				label={HANDLE_CONFIG.OUTPUT_B.label}
			/>
		</BaseNode>
	);
}
