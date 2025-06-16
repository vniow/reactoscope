import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { type NodeProps } from '@xyflow/react';
import type { Mesh } from 'three';
import { Vector3 } from 'three';

import { BaseNode } from '../shared/components/BaseNode';
import { GridBlock } from '../shared/components/GridBlock';
import { useNodeOperations } from '../flow/hooks/useNodeOperations';
import type { ThreeFiberDemoNode } from './types';

/**
 * Three.js Demo Node - Simple triangle display with rotation controls
 */

// Grid configuration for three fiber demo node
const THREEJS_DEMO_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

// Triangle points array - defining vertices of a triangle
const TRIANGLE_POINTS = [
	new Vector3(0, 1, 0), // Top vertex
	new Vector3(-1, -1, 0), // Bottom left vertex
	new Vector3(1, -1, 0), // Bottom right vertex
];

// Simple triangle component drawn with lines
function Triangle() {
	const meshRef = useRef<Mesh>(null);

	// Create geometry from triangle points
	const vertices = new Float32Array([
		...TRIANGLE_POINTS[0].toArray(),
		...TRIANGLE_POINTS[1].toArray(),
		...TRIANGLE_POINTS[2].toArray(),
	]);

	// Indices to define the triangle edges (lines)
	const indices = new Uint16Array([
		0,
		1, // First edge: top to bottom-left
		1,
		2, // Second edge: bottom-left to bottom-right
		2,
		0, // Third edge: bottom-right to top
	]);

	return (
		<lineSegments ref={meshRef}>
			<bufferGeometry>
				<bufferAttribute
					attach='attributes-position'
					args={[vertices, 3]}
				/>
				<bufferAttribute
					attach='index'
					args={[indices, 1]}
				/>
			</bufferGeometry>
			<lineBasicMaterial
				color={'#ff6b6b'}
				linewidth={2}
			/>
		</lineSegments>
	);
}

export function ThreeFiberDemoNode({
	id,
	data,
	selected,
}: NodeProps<ThreeFiberDemoNode>) {
	// Use custom hook for node operations
	const { deleteNode } = useNodeOperations();

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
			title={data.label || 'Triangle Demo'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Three.js Display */}
				<GridBlock
					gridWidth={12}
					gridHeight={13}
					gridX={0}
					gridY={1.5}
					showDimensions={false}
				>
					<div className='w-full h-full p-1'>
						<div className='flex justify-center items-center w-full h-full'>
							{/* Three.js canvas container */}
							<div
								className='r3f-canvas-container bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600'
								style={{
									width: '100%',
									height: '100%',
								}}
							>
								<Canvas
									camera={{ position: [0, 0, 5], fov: 50 }}
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

									{/* Orbit Controls for camera interaction */}
									<OrbitControls
										enableDamping
										dampingFactor={0.05}
										enableZoom={true}
										enablePan={true}
										enableRotate={true}
										minDistance={2}
										maxDistance={10}
									/>

									{/* Simple lighting */}
									<ambientLight intensity={0.8} />

									{/* The triangle */}
									<Triangle />
								</Canvas>
							</div>
						</div>
					</div>
				</GridBlock>
			</div>
		</BaseNode>
	);
}
