/**
 * XYRGB Generator Node Component
 *
 * Generates XYRGB audio signals from a 3D scene using vertex traversal.
 * Contains a simple triangle with red, green, and blue vertices.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling, robust audio node registration.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface XYRGBGeneratorNodeData extends BaseNodeData {
	/** Scan rate in Hz (1-60) */
	scanRate?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
	/** Scale factor for triangle size */
	triangleScale?: number;
}

/**
 * Vertex data structure for audio generation
 */
interface VertexInfo {
	/** Screen coordinates (0-1 normalized) */
	screen: { x: number; y: number };
	/** Color values (0-1) */
	color: { r: number; g: number; b: number };
	/** Original world position */
	world: { x: number; y: number; z: number };
}

/**
 * Scene traversal result
 */
interface SceneData {
	vertices: VertexInfo[];
	timestamp: number;
}

/**
 * Debug Panel Component
 * Shows extracted vertex data for verification
 */
function DebugPanel({ sceneData }: { sceneData: SceneData }) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className='mt-2 border border-gray-600 rounded bg-gray-800 text-xs'>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className='w-full p-2 text-left hover:bg-gray-700 flex justify-between items-center'
			>
				<span>Debug: Scene Data ({sceneData.vertices.length} vertices)</span>
				<span>{isExpanded ? '▼' : '▶'}</span>
			</button>

			{isExpanded && (
				<div className='p-2 border-t border-gray-600 overflow-y-auto'>
					<div className='mb-2 text-gray-400'>
						Last updated: {new Date(sceneData.timestamp).toLocaleTimeString()}
					</div>

					<div className='mb-2 text-sm'>
						<span className='text-blue-400'>Total vertices:</span>{' '}
						{sceneData.vertices.length}
					</div>

					{sceneData.vertices.length === 0 ? (
						<div className='text-gray-500'>No vertices found</div>
					) : (
						<div className='space-y-1'>
							<div className='text-xs text-gray-500 mb-1'>
								Vertex Data (showing first 5):
							</div>
							{sceneData.vertices.slice(0, 6).map((vertex, i) => (
								<div
									key={i}
									className='font-mono text-xs bg-gray-900 p-1 rounded'
								>
									<div className='flex justify-between'>
										<span className='text-yellow-400'>V{i}:</span>
										<span>
											Screen({vertex.screen.x.toFixed(3)},{' '}
											{vertex.screen.y.toFixed(3)})
										</span>
									</div>
									<div className='flex justify-between text-gray-400 ml-4'>
										<span>RGB:</span>
										<span>
											<span className='text-red-400'>
												{vertex.color.r.toFixed(3)}
											</span>
											,{' '}
											<span className='text-green-400'>
												{vertex.color.g.toFixed(3)}
											</span>
											,{' '}
											<span className='text-blue-400'>
												{vertex.color.b.toFixed(3)}
											</span>
										</span>
									</div>
									<div className='flex justify-between text-gray-500 ml-4 text-xs'>
										<span>World:</span>
										<span>
											({vertex.world.x.toFixed(1)}, {vertex.world.y.toFixed(1)},{' '}
											{vertex.world.z.toFixed(1)})
										</span>
									</div>
								</div>
							))}
							{sceneData.vertices.length > 5 && (
								<div className='text-gray-500 text-center'>
									... and {sceneData.vertices.length - 6} more vertices
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * RGB Triangle Component
 * Creates a triangle with red, green, and blue vertices using Line from drei
 */
function RGBTriangle({
	scale = 1,
	rotationSpeed = 1,
}: {
	scale?: number;
	rotationSpeed?: number;
}): React.ReactElement {
	const groupRef = useRef<THREE.Group>(null);

	// Define triangle vertices (equilateral triangle)
	const vertices = React.useMemo(
		() =>
			[
				[0.0, 1.0 * scale, 0.0] as [number, number, number], // Top vertex (Red)
				[-0.866 * scale, -0.5 * scale, 0.0] as [number, number, number], // Bottom left vertex (Green)
				[0.866 * scale, -0.5 * scale, 0.0] as [number, number, number], // Bottom right vertex (Blue)
				[0.0, 1.0 * scale, 0.0] as [number, number, number], // Back to top to close the triangle
			] as const,
		[scale]
	);

	// Animate rotation
	useFrame((_, delta) => {
		if (groupRef.current) {
			groupRef.current.rotation.z += rotationSpeed * delta;
		}
	});

	return (
		<group ref={groupRef}>
			{/* Triangle outline with colored vertices */}
			<Line
				points={vertices}
				vertexColors={[
					[1, 0, 0], // Red (top)
					[0, 1, 0], // Green (bottom left)
					[0, 0, 1], // Blue (bottom right)
					[1, 0, 0], // Red (back to top to close)
				]}
				lineWidth={3}
			/>
		</group>
	);
}

/**
 * Scene Traversal Component
 * Analyzes the scene and reports vertex data
 */
function SceneTraversal({
	onSceneData,
	scanRate = 30,
}: {
	onSceneData: (data: SceneData) => void;
	scanRate?: number;
}) {
	const { scene, camera } = useThree();
	const lastUpdateRef = useRef(0);

	useFrame(() => {
		// Update at scan rate frequency
		const now = Date.now();
		const updateInterval = 1000 / (scanRate || 30); // Convert Hz to ms

		if (now - lastUpdateRef.current > updateInterval) {
			const vertices: VertexInfo[] = [];
			const tempVector = new THREE.Vector3();

			// Debug: log what objects we find
			// console.log('=== Scene Traversal Debug ===');
			// let objectCount = 0;

			scene.traverse((object) => {
				// objectCount++;
				// console.log(
				// 	`Object ${objectCount}: type=${object.type}, name="${object.name}", constructor=${object.constructor.name}`
				// );

				// Check if it's a Mesh or Line with geometry
				if (
					object instanceof THREE.Mesh ||
					object instanceof THREE.Line ||
					object instanceof THREE.LineSegments
				) {
					const meshOrLine = object as
						| THREE.Mesh
						| THREE.Line
						| THREE.LineSegments;
					const geometry = meshOrLine.geometry as THREE.BufferGeometry;

					if (geometry && geometry.attributes && geometry.attributes.position) {
						// console.log(
						// 	`Found geometry object: ${object.type} with ${geometry.attributes.position.count} vertices`
						// );

						const positions = geometry.attributes.position;
						const colors = geometry.attributes.color;

						// Define our expected triangle vertex colors based on the vertex order
						const triangleColors = [
							{ r: 1, g: 0, b: 0 }, // Red (top)
							{ r: 0, g: 1, b: 0 }, // Green (bottom left)
							{ r: 0, g: 0, b: 1 }, // Blue (bottom right)
						];

						// Only process the first 3 vertices (ignore the 4th which closes the triangle)
						const vertexCount = Math.min(positions.count, 3);
						// console.log(`Processing ${vertexCount} vertices`);

						for (let i = 0; i < vertexCount; i++) {
							// Get local position
							tempVector.fromBufferAttribute(positions, i);
							// console.log(`Vertex ${i} local position:`, tempVector.clone());

							// Apply all transformations to get world position
							const worldPos = tempVector.clone();
							object.localToWorld(worldPos);
							// console.log(`Vertex ${i} world position:`, worldPos.clone());

							// Convert to screen coordinates
							const screenPos = worldPos.clone();
							screenPos.project(camera);

							// Normalize screen coordinates to 0-1
							const screenX = (screenPos.x + 1) / 2;
							const screenY = (-screenPos.y + 1) / 2; // Flip Y for standard screen coords

							// Get vertex color - use our known triangle colors
							let color = triangleColors[i] || { r: 1, g: 1, b: 1 };

							// If geometry has color attributes, use those instead
							if (colors && colors.count > i) {
								color = {
									r: colors.getX(i),
									g: colors.getY(i),
									b: colors.getZ(i),
								};
								// console.log(`Vertex ${i} has geometry color:`, color);
							} else {
								// console.log(`Vertex ${i} using predefined color:`, color);
							}

							vertices.push({
								screen: { x: screenX, y: screenY },
								color,
								world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
							});
						}
					}
				}
			});

			// console.log(`Total objects in scene: ${objectCount}`);
			// console.log(`Total vertices extracted: ${vertices.length}`);
			// console.log('=== End Debug ===');

			onSceneData({ vertices, timestamp: now });
			lastUpdateRef.current = now;
		}
	});

	return null;
}

/**
 * 3D Scene Component
 */
function Scene3D({
	triangleScale,
	rotationSpeed,
	onSceneData,
	scanRate,
}: {
	triangleScale: number;
	rotationSpeed: number;
	onSceneData?: (data: SceneData) => void;
	scanRate?: number;
}): React.ReactElement {
	return (
		<>
			{/* Scene Traversal - only if callback provided */}
			{onSceneData && (
				<SceneTraversal
					onSceneData={onSceneData}
					scanRate={scanRate}
				/>
			)}

			{/* Ambient light for visibility */}
			<ambientLight intensity={0.8} />

			{/* Grid helper for reference */}
			<gridHelper
				args={[4, 8]}
				rotation={[0, 0, 0]}
				material-opacity={0.2}
				material-transparent
			/>

			{/* RGB Triangle */}
			<RGBTriangle
				scale={triangleScale}
				rotationSpeed={rotationSpeed}
			/>
		</>
	);
}

export function XYRGBGeneratorNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: XYRGBGeneratorNodeData }): React.ReactElement {
	const [isActive, setIsActive] = useState<boolean>(false);
	const [sceneData, setSceneData] = useState<SceneData>({
		vertices: [],
		timestamp: 0,
	});

	// Audio node registration (placeholder for now)
	useEffect(() => {
		// TODO: Register 5 audio output channels when audio generation is implemented
		// registerAudioNode(id + ':x', 'xyrgbGenerator', { channel: 'x' });
		// registerAudioNode(id + ':y', 'xyrgbGenerator', { channel: 'y' });
		// registerAudioNode(id + ':r', 'xyrgbGenerator', { channel: 'r' });
		// registerAudioNode(id + ':g', 'xyrgbGenerator', { channel: 'g' });
		// registerAudioNode(id + ':b', 'xyrgbGenerator', { channel: 'b' });

		setIsActive(true);

		return () => {
			// unregisterAudioNode(id + ':x');
			// unregisterAudioNode(id + ':y');
			// unregisterAudioNode(id + ':r');
			// unregisterAudioNode(id + ':g');
			// unregisterAudioNode(id + ':b');
		};
	}, [id]);

	// Controls
	const [scanRate, setScanRate] = useAudioNodeParam<number>(
		id,
		'scanRate',
		data.scanRate ?? 30,
		{ min: 1, max: 60 }
	);

	const [rotationSpeed, setRotationSpeed] = useAudioNodeParam<number>(
		id,
		'rotationSpeed',
		data.rotationSpeed ?? 1,
		{ min: 0, max: 5 }
	);

	const [triangleScale, setTriangleScale] = useAudioNodeParam<number>(
		id,
		'triangleScale',
		data.triangleScale ?? 1,
		{ min: 0.1, max: 2 }
	);

	// Update node data
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(id, {
			scanRate,
			rotationSpeed,
			triangleScale,
			audioParams: { scanRate, rotationSpeed, triangleScale },
		});
	}, [id, scanRate, rotationSpeed, triangleScale, updateNode]);

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='XYRGB Generator'
			variant='source'
		>
			<div className='bg-node-secondary rounded overflow-hidden border border-node'>
				{/* Canvas Container with grid-aligned sizing */}
				<div
					className='bg-black r3f-canvas-container'
					style={{
						width: 'var(--spacing-grid-8)',
						height: 'var(--spacing-grid-8)',
					}}
				>
					<Canvas
						style={{ width: '100%', height: '100%' }}
						camera={{ position: [0, 0, 5], fov: 50 }}
						dpr={Math.min(window.devicePixelRatio || 1, 2)}
						frameloop='always'
						onCreated={({ gl, camera }) => {
							gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
							camera.updateProjectionMatrix();
						}}
					>
						<Scene3D
							triangleScale={triangleScale}
							rotationSpeed={rotationSpeed}
							onSceneData={setSceneData}
							scanRate={scanRate}
						/>
					</Canvas>
				</div>

				{/* Debug Panel */}
				<DebugPanel sceneData={sceneData} />

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
							}`}
							aria-label={isActive ? 'Generator active' : 'Inactive'}
						/>
						<span className='text-node-secondary'>
							{isActive ? 'GENERATING' : 'INACTIVE'}
						</span>
					</div>
					<span className='text-node-secondary opacity-70'>{scanRate}Hz</span>
				</div>
			</div>

			{/* Controls */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Scan Rate'
					value={scanRate}
					min={1}
					max={60}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => `${val}Hz`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setScanRate(Number(e.target.value))
					}
					className='h-12'
				/>
			</div>

			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Rotation Speed'
					value={rotationSpeed}
					min={0}
					max={5}
					step={0.1}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => `${val.toFixed(1)}x`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setRotationSpeed(Number(e.target.value))
					}
					className='h-12'
				/>
			</div>

			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Triangle Scale'
					value={triangleScale}
					min={0.1}
					max={2}
					step={0.1}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => `${val.toFixed(1)}x`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setTriangleScale(Number(e.target.value))
					}
					className='h-12'
				/>
			</div>

			{/* Output Handles - 5 channels for X, Y, R, G, B */}
			<NodeHandle
				id='outputX'
				type='source'
				position={Position.Right}
				label='X'
				style={{ top: '20%' }}
			/>
			<NodeHandle
				id='outputY'
				type='source'
				position={Position.Right}
				label='Y'
				style={{ top: '35%' }}
			/>
			<NodeHandle
				id='outputR'
				type='source'
				position={Position.Bottom}
				label='R'
				style={{ left: '25%' }}
			/>
			<NodeHandle
				id='outputG'
				type='source'
				position={Position.Bottom}
				label='G'
				style={{ left: '50%' }}
			/>
			<NodeHandle
				id='outputB'
				type='source'
				position={Position.Bottom}
				label='B'
				style={{ left: '75%' }}
			/>
		</BaseNode>
	);
}
