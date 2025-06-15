import { useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { type NodeProps, Position } from '@xyflow/react';
import type { Mesh } from 'three';
import { Vector3 } from 'three';

import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridButton } from '../shared/components/ui/GridButton';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import { useCoordinateAudioWorklet } from '../audio/hooks/useCoordinateAudioWorklet';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import type { ThreeFiberDemoNode } from './types';

/**
 * Three.js Demo Node - Simple box outline display
 * Based on VisualizerNode structure but with 3D content
 */

// Grid configuration for three fiber demo node
const THREEJS_DEMO_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

// Configuration for high-fidelity audio worklet buffer
const AUDIO_BUFFER_CONFIG = {
	sampleCount: 512, // Common audio worklet buffer size
	edgeSamples: 32, // Samples per cube edge (12 edges × 32 = 384 samples)
	faceSamples: 16, // Additional face center samples (6 faces × 16 = 96 samples)
	temporalSmoothing: 0.1, // Smoothing factor for temporal interpolation
} as const;

// High-fidelity rotating box component with interpolated coordinate sampling
function RotatingBox({
	bufferRef,
	onBufferUpdate,
}: {
	bufferRef: React.MutableRefObject<Float32Array>;
	onBufferUpdate?: (buffer: Float32Array) => void;
}) {
	const meshRef = useRef<Mesh>(null);
	const { camera } = useThree();

	// Previous frame buffer for temporal smoothing
	const prevBufferRef = useRef(
		new Float32Array(AUDIO_BUFFER_CONFIG.sampleCount)
	);

	// Function to get normalized device coordinates (NDC) from world position
	const worldToNDC = useCallback(
		(worldPos: Vector3) => {
			const vector = worldPos.clone();
			vector.project(camera);
			return { x: vector.x, y: vector.y, z: vector.z };
		},
		[camera]
	);

	// Generate interpolated samples along cube edges and faces
	const generateHighFidelitySamples = useCallback((mesh: Mesh) => {
		const samples: Vector3[] = [];

		// Cube vertices in local space (standard cube vertices)
		const vertices = [
			new Vector3(-1, -1, -1),
			new Vector3(1, -1, -1), // bottom face
			new Vector3(1, 1, -1),
			new Vector3(-1, 1, -1),
			new Vector3(-1, -1, 1),
			new Vector3(1, -1, 1), // top face
			new Vector3(1, 1, 1),
			new Vector3(-1, 1, 1),
		];

		// Define cube edges (pairs of vertex indices)
		const edges = [
			// Bottom face edges
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 0],
			// Top face edges
			[4, 5],
			[5, 6],
			[6, 7],
			[7, 4],
			// Vertical edges
			[0, 4],
			[1, 5],
			[2, 6],
			[3, 7],
		];

		// Sample points along each edge using linear interpolation
		edges.forEach(([startIdx, endIdx]) => {
			const startVertex = vertices[startIdx];
			const endVertex = vertices[endIdx];

			for (let i = 0; i < AUDIO_BUFFER_CONFIG.edgeSamples; i++) {
				const t = i / (AUDIO_BUFFER_CONFIG.edgeSamples - 1);
				const interpolatedPoint = new Vector3();
				interpolatedPoint.lerpVectors(startVertex, endVertex, t);

				// Transform to world space
				const worldPoint = interpolatedPoint.clone();
				mesh.localToWorld(worldPoint);
				samples.push(worldPoint);
			}
		});

		// Add face center samples for additional fidelity
		const faceCenters = [
			new Vector3(0, 0, -1), // front
			new Vector3(0, 0, 1), // back
			new Vector3(-1, 0, 0), // left
			new Vector3(1, 0, 0), // right
			new Vector3(0, -1, 0), // bottom
			new Vector3(0, 1, 0), // top
		];

		faceCenters.forEach((center) => {
			for (let i = 0; i < AUDIO_BUFFER_CONFIG.faceSamples; i++) {
				// Create slight variations around face centers
				const angle = (i / AUDIO_BUFFER_CONFIG.faceSamples) * Math.PI * 2;
				const radius = 0.3;
				const offset = new Vector3(
					Math.cos(angle) * radius,
					Math.sin(angle) * radius,
					0
				);

				const facePoint = center.clone().add(offset);
				const worldPoint = facePoint.clone();
				mesh.localToWorld(worldPoint);
				samples.push(worldPoint);
			}
		});

		return samples;
	}, []);

	// Apply temporal smoothing between frames
	const applySmoothingToBuffer = useCallback(
		(newBuffer: Float32Array) => {
			const smoothing = AUDIO_BUFFER_CONFIG.temporalSmoothing;

			for (let i = 0; i < newBuffer.length; i++) {
				// Linear interpolation: newValue = (1-α) * oldValue + α * newValue
				const smoothedValue =
					(1 - smoothing) * prevBufferRef.current[i] + smoothing * newBuffer[i];
				bufferRef.current[i] = smoothedValue;
				prevBufferRef.current[i] = smoothedValue;
			}
		},
		[bufferRef]
	);

	// Rotate the box every frame and generate high-fidelity coordinate buffer
	useFrame((_, delta) => {
		if (meshRef.current) {
			// Rotate the box
			meshRef.current.rotation.x += delta * 0.005;
			meshRef.current.rotation.y += delta * 0.008;

			// Update world matrix to get current transformations
			meshRef.current.updateMatrixWorld();

			// Generate high-fidelity interpolated samples
			const worldSamples = generateHighFidelitySamples(meshRef.current);

			// Create temporary buffer for new frame data
			const tempBuffer = new Float32Array(AUDIO_BUFFER_CONFIG.sampleCount);

			// Convert world positions to NDC and store in buffer
			worldSamples.forEach((worldPos, index) => {
				if (index * 2 + 1 < AUDIO_BUFFER_CONFIG.sampleCount) {
					const ndcPos = worldToNDC(worldPos);
					tempBuffer[index * 2] = ndcPos.x; // x coordinate
					tempBuffer[index * 2 + 1] = ndcPos.y; // y coordinate
				}
			});

			// Apply temporal smoothing
			applySmoothingToBuffer(tempBuffer);

			// Notify parent component of buffer update for worklet
			if (onBufferUpdate) {
				onBufferUpdate(bufferRef.current);
			}

			// Optional: Log buffer info occasionally for debugging
			// if (Math.floor(performance.now() / 16) % 300 === 0) {
			// 	console.log('🎲 High-Fidelity Buffer Info:', {
			// 		sampleCount: AUDIO_BUFFER_CONFIG.sampleCount,
			// 		edgeSamples: AUDIO_BUFFER_CONFIG.edgeSamples * 12, // 12 edges
			// 		faceSamples: AUDIO_BUFFER_CONFIG.faceSamples * 6, // 6 faces
			// 		totalSamples: worldSamples.length,
			// 		bufferUtilization:
			// 			(worldSamples.length * 2) / AUDIO_BUFFER_CONFIG.sampleCount,
			// 	});
			// }
		}
	});

	return (
		<mesh ref={meshRef}>
			<boxGeometry args={[2, 2, 2]} />
			<meshBasicMaterial
				color={'#ff6b6b'}
				wireframe={true}
			/>
		</mesh>
	);
}

export function ThreeFiberDemoNode({
	id,
	data,
	selected,
}: NodeProps<ThreeFiberDemoNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

	// Audio playing state
	const [isPlaying, setIsPlaying] = useState(false);

	// High-fidelity coordinate buffer for audio worklet (512 samples)
	const coordinateBufferRef = useRef<Float32Array>(
		new Float32Array(AUDIO_BUFFER_CONFIG.sampleCount)
	);

	// Initialize coordinate audio worklets for X and Y axes
	const xAxisWorklet = useCoordinateAudioWorklet({
		axis: 'x',
		gain: 0.3,
		frequency: 1.0,
		nodeId: `${id}-x`,
	});

	const yAxisWorklet = useCoordinateAudioWorklet({
		axis: 'y',
		gain: 0.3,
		frequency: 1.0,
		nodeId: `${id}-y`,
	});

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Handle buffer updates from the rotating box
	const handleBufferUpdate = useCallback(
		(buffer: Float32Array) => {
			// Only send updated buffer to worklets if audio is playing
			if (isPlaying) {
				if (xAxisWorklet.isReady) xAxisWorklet.updateBuffer(buffer);
				if (yAxisWorklet.isReady) yAxisWorklet.updateBuffer(buffer);
			}
		},
		[xAxisWorklet, yAxisWorklet, isPlaying]
	);

	// Play/Stop functionality
	const handlePlayToggle = useCallback(() => {
		setIsPlaying(!isPlaying);
		console.log(
			`🎲 ${isPlaying ? 'Stopped' : 'Started'} Three.js audio for node ${id}`
		);
	}, [isPlaying, id]);

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	return (
		<BaseNode
			variant='component'
			gridWidth={THREEJS_DEMO_NODE_CONFIG.gridWidth}
			gridHeight={THREEJS_DEMO_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={data.label || 'Three.js Demo'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Three.js Display */}
				<GridBlock
					gridWidth={12}
					gridHeight={12}
					gridX={0}
					gridY={1.5}
					showDimensions={false}
				>
					<div className='w-full h-full p-1'>
						<div className='flex justify-center items-center w-full h-full'>
							{/* Three.js canvas container - matching AudioVisualizer pattern */}
							<div
								className='r3f-canvas-container bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600'
								style={{
									width: '100%',
									height: '100%',
								}}
							>
								<Canvas
									camera={{ position: [5, 5, 5], fov: 50 }}
									gl={{
										antialias: true,
										alpha: false,
										pixelRatio: Math.min(window.devicePixelRatio, 2),
									}}
								>
									<color
										attach='background'
										args={[0, 0, 0]}
									/>

									{/* Simple lighting */}
									<ambientLight intensity={0.6} />

									{/* The rotating box outline */}
									<RotatingBox
										bufferRef={coordinateBufferRef}
										onBufferUpdate={handleBufferUpdate}
									/>
								</Canvas>
							</div>
						</div>
					</div>
				</GridBlock>

				{/* Status Display and Play Button */}
				<GridBlock
					gridWidth={6}
					gridHeight={2}
					gridX={6}
					gridY={13}
					showDimensions={false}
				>
					<div className='w-full h-full flex flex-col justify-center items-center space-y-1'>
						{/* Status Indicator */}
						<div className='text-center'>
							<div className='text-sm font-medium'>
								{xAxisWorklet.isReady && yAxisWorklet.isReady ? (
									<span className='text-green-600 dark:text-green-400'>
										🎲 Worklets Ready
									</span>
								) : (
									<span className='text-yellow-600 dark:text-yellow-400'>
										⏳ Loading Worklets...
									</span>
								)}
							</div>
						</div>

						{/* Play/Stop Button */}
						<GridButton
							gridWidth={4}
							gridHeight={1}
							gridX={1}
							gridY={0}
							buttonLabel={isPlaying ? '⏹️ Stop' : '▶️ Play'}
							variant={isPlaying ? 'secondary' : 'node-variant'}
							size='sm'
							layout='fill'
							onClick={handlePlayToggle}
							disabled={!xAxisWorklet.isReady || !yAxisWorklet.isReady}
							aria-label={
								isPlaying ? 'Stop coordinate audio' : 'Start coordinate audio'
							}
						/>
					</div>
				</GridBlock>
			</div>

			{/* X-axis audio output handle */}
			<GridNodeHandle
				id='audio-out-X'
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={8}
				size='md'
			/>

			{/* Y-axis audio output handle */}
			<GridNodeHandle
				id='audio-out-Y'
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={10}
				size='md'
			/>
		</BaseNode>
	);
}
