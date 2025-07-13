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
import type { SceneData } from './sceneTypes';
import { useSceneTraversal } from './useSceneTraversal';
import type { BaseNodeData } from '../types';
import { RGBTriangleComponent } from './shapes';

interface ReactoscopeAudioProcessorNodeData extends BaseNodeData {
	/** Scan rate in Hz (1-60) */
	scanRate?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
	/** Scale factor for triangle size */
	triangleScale?: number;
	/** Audio processor enabled */
	audioEnabled?: boolean;
	/** Audio smoothing */
	audioSmoothing?: number;
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
	segmentDensity,
}: {
	triangleScale: number;
	onSceneData?: (data: SceneData) => void;
	scanRate?: number;
	segmentDensity: number;
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

			{/* RGB Triangle Component for static rendering */}
			<RGBTriangleComponent
				segmentDensity={segmentDensity}
				scale={triangleScale}
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
	// Segment density state for triangle
	const [segmentDensity, setSegmentDensity] = useState<number>(16);

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

	const [audioSmoothing] = useAudioNodeParam<number>(
		nodeId,
		'audioSmoothing',
		nodeData.audioSmoothing ?? 0.1,
		{ min: 0, max: 1 }
	);

	// Reactoscope Audio Processor
	const processor = useReactoscopeAudioProcessor(audioEnabled);

	// Register the audio processor with the audio system when ready
	useEffect(() => {
		const appStore = useAppStore.getState();

		if (audioEnabled && processor.isReady && processor.node) {
			// Register this as a custom audio node type with the audio registry
			appStore.registerAudioNode(nodeId, 'custom-xyrgb', {
				node: processor.node,
				outputs: processor.node.outputs, // Pass the 5-channel outputs
			});

			console.log(`🎵 Registered XYRGB audio node: ${nodeId}`);
		} else if (!audioEnabled) {
			// Unregister when disabled
			appStore.unregisterAudioNode(nodeId);
		}

		return () => {
			// Cleanup on unmount
			if (audioEnabled) {
				appStore.unregisterAudioNode(nodeId);
			}
		};
	}, [nodeId, audioEnabled, processor.isReady, processor.node]);

	// Update processor when scene data changes
	useEffect(() => {
		if (audioEnabled && processor.isReady && sceneData.vertices.length > 0) {
			processor.updateVertices(sceneData.vertices);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sceneData, audioEnabled, processor.isReady]);

	// Sync all processor controls when they change
	useEffect(() => {
		if (processor.isReady) {
			processor.setScanRate(scanRate);
			processor.setSmoothing(audioSmoothing);

			// Start/stop based on audioEnabled
			if (audioEnabled) {
				processor.start();
			} else {
				processor.stop();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [audioEnabled, scanRate, audioSmoothing, processor.isReady]);

	// Update node data
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			scanRate,

			triangleScale,
			audioEnabled,
			audioSmoothing,
			audioParams: {
				scanRate,

				triangleScale,
				audioEnabled,
				audioSmoothing,
			},
		});
	}, [
		nodeId,
		updateNode,
		scanRate,

		triangleScale,
		audioEnabled,
		audioSmoothing,
	]);

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
							segmentDensity={segmentDensity}
						/>
					</Canvas>
				</div>

				{/* Debug Panel */}
				{/* <DebugPanel sceneData={sceneData} /> */}

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

			<div className='mb-4'>
				<GridControl
					type='slider'
					label='Segment Density'
					value={segmentDensity}
					min={3}
					max={512}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => `${val}`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setSegmentDensity(Number(e.target.value))
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
