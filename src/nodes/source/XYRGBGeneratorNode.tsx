/**
 * XYRGB Generator Node Component
 *
 * Generates XYRGB audio signals from a 3D scene using vertex traversal.
 * Contains a simple triangle with red, green, and blue vertices.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling, robust audio node registration.
 */

import React, { useEffect, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import { RGBTriangle } from './RGBTriangle';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import { DebugPanel, type SceneData } from './DebugPanel';
import { useSceneTraversal } from './useSceneTraversal';
import { EXCLUDE_HELPERS_FILTER } from './sceneTraversal';
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
 * Scene Traversal Component
 * Uses the scene traversal utility to extract vertex data
 */
function SceneTraversal({
	onSceneData,
	scanRate = 30,
}: {
	onSceneData: (data: SceneData) => void;
	scanRate?: number;
}) {
	// Use the scene traversal hook with helper exclusion filter
	useSceneTraversal(onSceneData, scanRate, {
		maxVerticesPerObject: 3,
		objectFilter: EXCLUDE_HELPERS_FILTER,
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
  // Type assertions for props
  const nodeId = id as string;
  const nodeData = data as XYRGBGeneratorNodeData;
  const isSelected = selected as boolean;
	const [sceneData, setSceneData] = useState<SceneData>({
		vertices: [],
		timestamp: 0,
	});

	// Controls
   const [scanRate, setScanRate] = useAudioNodeParam<number>(
	   nodeId,
	   'scanRate',
	   nodeData.scanRate ?? 30,
		{ min: 1, max: 60 }
	);

   const [rotationSpeed, setRotationSpeed] = useAudioNodeParam<number>(
	   nodeId,
	   'rotationSpeed',
	   nodeData.rotationSpeed ?? 1,
		{ min: 0, max: 5 }
	);

   const [triangleScale, setTriangleScale] = useAudioNodeParam<number>(
	   nodeId,
	   'triangleScale',
	   nodeData.triangleScale ?? 1,
		{ min: 0.1, max: 2 }
	);


	// Update node data
	const updateNode = useAppStore((state) => state.updateNode);
   useEffect(() => {
	   updateNode(nodeId, {
			scanRate,
			rotationSpeed,
			triangleScale,
			audioParams: { scanRate, rotationSpeed, triangleScale },
		});
	}, [nodeId, updateNode, scanRate, rotationSpeed, triangleScale]);

	return (
   <BaseNode
	   nodeId={nodeId}
	   selected={isSelected}
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

				{/* Status indicator (static, always inactive) */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className='w-2 h-2 rounded-full mr-2 bg-gray-500'
							aria-label='Inactive'
						/>
						<span className='text-node-secondary'>INACTIVE</span>
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
