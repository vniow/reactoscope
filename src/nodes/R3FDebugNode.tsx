import { Position, type NodeProps } from '@xyflow/react';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { BaseNode } from '../components/BaseNode';
import { NodeHandle } from '../components/NodeHandle';
import { useHandlePosition } from '../hooks/useHandlePositions';
import { useNodes } from '../hooks/useAppStore';
import type { R3FDebugNode } from './types';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

// Rotating Box Component
function RotatingBox() {
	const meshRef = useRef<THREE.Mesh>(null!);

	useFrame((_, delta) => {
		if (meshRef.current) {
			meshRef.current.rotation.x += delta * 0.5;
			meshRef.current.rotation.y += delta * 0.3;
		}
	});

	return (
		<mesh ref={meshRef}>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial color='#ff6b6b' />
		</mesh>
	);
}

export function R3FDebugNode({ id, data, selected }: NodeProps<R3FDebugNode>) {
	// Handle positions from the Zustand store
	const inputPosition = useHandlePosition(id, 'input', Position.Top);
	const outputPosition = useHandlePosition(id, 'output', Position.Bottom);

	// Get the removeNode function from the store
	const { removeNode } = useNodes();

	return (
		<BaseNode
			variant='secondary'
			gridWidth={data.gridWidth ?? 4}
			gridHeight={data.gridHeight ?? 4}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'R3F Debug'}
		>
			<div className='flex flex-col h-full space-y-2'>
				{/* R3F Canvas Container */}
				<div className='flex-1 min-h-0 flex items-center justify-center p-2'>
					{/* This is the new r3f-canvas-container */}
					<div
						className='r3f-canvas-container relative bg-gray-900 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600'
						style={{
							width: '100%', // Ensure it takes full width of its flex parent
							height: '100%', // Ensure it takes full height of its flex parent
							minWidth: '120px',
							maxWidth: '200px',
							aspectRatio: '1 / 1',
							// position, overflow, isolation are handled by CSS class now
						}}
					>
						<Canvas
							style={
								{
									/* Styles for direct canvas are now in CSS */
								}
							}
							gl={{
								preserveDrawingBuffer: true,
								antialias: true,
							}}
							camera={{
								position: [0, 0, 2.5], // Adjusted camera for a 1x1x1 box
								fov: 50,
							}}
							dpr={[1, 2]}
						>
							<ambientLight intensity={0.6} />
							<pointLight position={[5, 5, 5]} />
							<RotatingBox />
							<OrbitControls
								enableZoom={false}
								enablePan={false}
								makeDefault
							/>
						</Canvas>
					</div>
				</div>

				{/* Info Display */}
				<div className='px-2 pb-2'>
					<div className='text-center'>
						<div className='text-xs text-gray-600 dark:text-gray-400'>
							<span className='text-blue-600 dark:text-blue-400'>
								🎲 Three.js Canvas
							</span>
						</div>
						<div className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
							Rotating Box Demo
						</div>
					</div>
				</div>
			</div>

			{/* Node Handles */}
			<NodeHandle
				id='input'
				type='target'
				position={inputPosition}
				variant='debug'
			/>
			<NodeHandle
				id='output'
				type='source'
				position={outputPosition}
				variant='debug'
			/>
		</BaseNode>
	);
}
