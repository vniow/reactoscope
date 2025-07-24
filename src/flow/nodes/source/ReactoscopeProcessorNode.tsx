/**
 * Reactoscope Viewer Node Component
 *
 * Generates XYRGB audio signals from a 3D scene using vertex traversal.
 * Contains a simple triangle with red, green, and blue vertices.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling, robust audio node registration.
 */

import React, { useEffect, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../../audio/hooks/useAudioNodeParam';
import { useReactoscopeAudioProcessor } from '../../../audio/hooks/useReactoscopeAudioProcessor';
import { useAppStore } from '../../../shared/stores/appStore';
import type { SceneData, VertexInfo } from './sceneTypes';
import { DebugPanel } from './DebugPanel';
import { useSceneTraversal } from './useSceneTraversal';
import type { BaseNodeData } from '../types';
import {
	RGBTriangleComponent,
	GreenSquareComponent,
} from '../../../shared/shapes';

interface ReactoscopeAudioProcessorNodeData extends BaseNodeData {
	/** Scan rate in Hz (1-60) */
	scanRate?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
	/** Scale factor for triangle size */
	triangleScale?: number;
	/** Audio processor enabled */
	audioEnabled?: boolean;
	/** Interpolation steps between object chunks */
	interpolationSteps?: number;
}

/**
 * Scene Traversal Component
 * Uses the scene traversal utility to extract vertex data
 */
function SceneTraversal({
	onSceneData,
	scanRate = 60,
}: {
	onSceneData: (data: SceneData) => void;
	scanRate?: number;
}) {
	// Use the scene traversal hook with helper exclusion filter
	useSceneTraversal(onSceneData, scanRate, {
		// objectFilter: EXCLUDE_HELPERS_FILTER,
	});

	return null;
}

/**
 * 3D Scene Component
 */
function Scene3D({
	triangleScale,
	onSceneData,
	scanRate,
}: {
	triangleScale: number;
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

			{/* RGB Triangle Component */}
			<RGBTriangleComponent
				scale={triangleScale}
				position={[-0.5, 0, 0]}
			/>

			{/* Green Square Component */}
			<GreenSquareComponent
				scale={triangleScale}
				position={[0.5, 0, 0]}
			/>
		</>
	);
}

export function ReactoscopeProcessorNode({
	id,
	data,
	selected = false,
}: NodeProps & {
	data: ReactoscopeAudioProcessorNodeData;
}): React.ReactElement {
	const nodeId = id as string;
	const nodeData = data as ReactoscopeAudioProcessorNodeData;
	const isSelected = selected as boolean;
	const [sceneData, setSceneData] = useState<SceneData>({
		vertices: [],
		timestamp: 0,
	});
	// Processed (interpolated) vertices for debug
	const [processedVertices, setProcessedVertices] = useState<VertexInfo[]>([]);

	// Visual controls
	const [scanRate, setScanRate] = useAudioNodeParam<number>(
		nodeId,
		'scanRate',
		nodeData.scanRate ?? 30,
		{ min: 1, max: 120 }
	);

	const [triangleScale, setTriangleScale] = useAudioNodeParam<number>(
		nodeId,
		'triangleScale',
		nodeData.triangleScale ?? 1,
		{ min: 0.1, max: 2 }
	);

	// Audio controls
	const [audioEnabled, setAudioEnabled] = useAudioNodeParam<boolean>(
		nodeId,
		'audioEnabled',
		nodeData.audioEnabled ?? false
	);

	// Reactoscope Audio Processor
	const processor = useReactoscopeAudioProcessor();
	// Interpolation steps control
	const [interpolationSteps, setInterpolationSteps] = useAudioNodeParam<number>(
		nodeId,
		'interpolationSteps',
		nodeData.interpolationSteps ?? 1,
		{ min: 0, max: 10 }
	);

	// Register the audio processor with the audio system when ready
	useEffect(() => {
		const appStore = useAppStore.getState();

		if (audioEnabled && processor.isReady && processor.node) {
			// Register this as a custom audio node type with the audio registry
			appStore.registerAudioNode(nodeId, 'custom-xyrgb', {
				node: processor.node,
				outputs: processor.node.outputs,
			});
			console.log(`🎵 Registered XYRGB audio node: ${nodeId}`);
		}

		return () => {
			// Cleanup on unmount
			if (audioEnabled) {
				appStore.unregisterAudioNode(nodeId);
			}
		};
	}, [nodeId, audioEnabled, processor.isReady, processor.node]);

	// Update processor and processed vertices when scene data changes
	useEffect(() => {
		if (audioEnabled && processor.isReady && sceneData.vertices.length > 0) {
			processor.setInterpolationSteps(interpolationSteps);
			processor.updateVertices(sceneData.vertices);
			// Read back interpolated vertices
			const verts = processor.node?.vertices || [];
			setProcessedVertices(verts);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sceneData, audioEnabled, processor.isReady, interpolationSteps]);

	// Sync all processor controls when they change
	useEffect(() => {
		processor.setScanRate(scanRate);
		processor.setInterpolationSteps(interpolationSteps);
		// Start or stop based on audioEnabled
		if (audioEnabled) {
			processor.start();
		} else {
			// Only stop worklet; keep splitter and gains intact so it can restart cleanly
			processor.stop();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [audioEnabled, scanRate, interpolationSteps]);

	// Update node data
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			scanRate,
			triangleScale,
			audioEnabled,
			interpolationSteps,

			audioParams: {
				scanRate,
				triangleScale,
				audioEnabled,
				interpolationSteps,
			},
		});
	}, [
		nodeId,
		updateNode,
		scanRate,
		triangleScale,
		audioEnabled,
		interpolationSteps,
	]);

	// Connection status for output handles
	const edges = useAppStore((state) => state.edges);
	const getConnectionStatus = (handleId: string): 'default' | 'connected' =>
		edges.some(
			(edge) => edge.source === nodeId && edge.sourceHandle === handleId
		)
			? 'connected'
			: 'default';

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Reactoscope Processor'
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
							onSceneData={setSceneData}
							scanRate={scanRate}
						/>
					</Canvas>
				</div>

				{/* Debug Panel (show processed/interpolated vertices) */}
				<DebugPanel
					sceneData={{ vertices: processedVertices, timestamp: Date.now() }}
				/>

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								audioEnabled && processor.isPlaying
									? 'bg-green-500'
									: audioEnabled
										? 'bg-yellow-500'
										: 'bg-gray-500'
							}`}
							aria-label={
								audioEnabled && processor.isPlaying
									? 'Active'
									: audioEnabled
										? 'Ready'
										: 'Inactive'
							}
						/>
						<span className='text-node-secondary'>
							{audioEnabled && processor.isPlaying
								? 'ACTIVE'
								: audioEnabled
									? 'READY'
									: 'INACTIVE'}
						</span>
					</div>
					<span className='text-node-secondary opacity-70'>{scanRate}Hz</span>
				</div>
			</div>

			{/* Visual Controls */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Scan Rate'
					value={scanRate}
					min={1}
					max={120}
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

			{/* Interpolation Steps Control */}
			<div className='mb-4'>
				<GridControl
					type='slider'
					label='Interpolation Steps'
					value={interpolationSteps}
					min={0}
					max={10}
					variant='node-variant'
					layout='stacked'
					showValue
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setInterpolationSteps(Number(e.target.value))
					}
					className='h-12'
				/>
			</div>

			<div className='mb-4'>
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

			{/* Audio Controls Section */}
			<div className='border-t border-node pt-3 mb-3'>
				<h4 className='text-sm font-medium text-node-primary mb-2'>
					Audio Output
				</h4>

				{/* Audio Enable Toggle */}
				<div className='mb-3'>
					<GridControl
						type='toggle'
						label='Enable Audio'
						checked={audioEnabled}
						variant='node-variant'
						layout='stacked'
						onChange={(checked: boolean) => setAudioEnabled(checked)}
						className='h-8'
					/>
				</div>

				{/* Audio controls - only show when enabled */}
				{audioEnabled && <></>}
			</div>

			{/* Output Handles - 5 channels for X, Y, R, G, B */}
			<NodeHandle
				id='outputX'
				type='source'
				position={Position.Right}
				label='X'
				style={{ top: '20%' }}
				connectionStatus={getConnectionStatus('outputX')}
			/>
			<NodeHandle
				id='outputY'
				type='source'
				position={Position.Right}
				label='Y'
				style={{ top: '35%' }}
				connectionStatus={getConnectionStatus('outputY')}
			/>
			<NodeHandle
				id='outputZ'
				type='source'
				position={Position.Right} // Or Position.Bottom, depending on desired layout
				label='Z'
				style={{ top: '65%' }} // Adjust position as needed
				connectionStatus={getConnectionStatus('outputZ')}
			/>
			<NodeHandle
				id='outputR'
				type='source'
				position={Position.Bottom}
				label='R'
				style={{ left: '25%' }}
				connectionStatus={getConnectionStatus('outputR')}
			/>
			<NodeHandle
				id='outputG'
				type='source'
				position={Position.Bottom}
				label='G'
				style={{ left: '50%' }}
				connectionStatus={getConnectionStatus('outputG')}
			/>
			<NodeHandle
				id='outputB'
				type='source'
				position={Position.Bottom}
				label='B'
				style={{ left: '75%' }}
				connectionStatus={getConnectionStatus('outputB')}
			/>
		</BaseNode>
	);
}
