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
import { Line } from '@react-three/drei';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useXYRGBInterpolator } from '../../audio/hooks/useXYRGBInterpolator';
import { useAppStore } from '../../shared/stores/appStore';
import { DebugPanel } from './DebugPanel';
import type { SceneData } from './sceneTypes';
import { useSceneTraversal } from './useSceneTraversal';
import type { BaseNodeData } from '../types';

interface XYRGBGeneratorNodeData extends BaseNodeData {
	/** Scan rate in Hz (1-60) */
	scanRate?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
	/** Scale factor for triangle size */
	triangleScale?: number;
	/** Audio interpolator enabled */
	audioEnabled?: boolean;
	/** Audio interpolation mode */
	interpolationMode?: 'linear' | 'cubic' | 'circular';
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

			{/* Simple horizontal white line using drei Line */}
			{/* <Line
				points={[
					[-0.8, 0, 0],
					[0.8, 0, 0],
				]}
				color='white'
				lineWidth={2}
			/> */}

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

	// Visual controls
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

	// Audio controls
	const [audioEnabled, setAudioEnabled] = useAudioNodeParam<boolean>(
		nodeId,
		'audioEnabled',
		nodeData.audioEnabled ?? false
	);

	const [interpolationMode, setInterpolationMode] = useAudioNodeParam<
		'linear' | 'cubic' | 'circular'
	>(nodeId, 'interpolationMode', nodeData.interpolationMode ?? 'linear');

	const [audioSmoothing, setAudioSmoothing] = useAudioNodeParam<number>(
		nodeId,
		'audioSmoothing',
		nodeData.audioSmoothing ?? 0.1,
		{ min: 0, max: 1 }
	);

	// XYRGB Audio Interpolator
	const interpolator = useXYRGBInterpolator(audioEnabled);

	// Register the audio interpolator with the audio system when ready
	useEffect(() => {
		const appStore = useAppStore.getState();

		if (audioEnabled && interpolator.isReady && interpolator.node) {
			// Register this as a custom audio node type with the audio registry
			appStore.registerAudioNode(nodeId, 'custom-xyrgb', {
				node: interpolator.node,
				outputs: interpolator.node.outputs, // Pass the 5-channel outputs
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
	}, [nodeId, audioEnabled, interpolator.isReady, interpolator.node]);

	// Update interpolator when scene data changes
	useEffect(() => {
		if (audioEnabled && interpolator.isReady && sceneData.vertices.length > 0) {
			interpolator.updateVertices(sceneData.vertices);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sceneData, audioEnabled, interpolator.isReady]);

	// Sync all interpolator controls when they change
	useEffect(() => {
		if (interpolator.isReady) {
			interpolator.setScanRate(scanRate);
			interpolator.setInterpolationMode(interpolationMode);
			interpolator.setSmoothing(audioSmoothing);

			// Start/stop based on audioEnabled
			if (audioEnabled) {
				interpolator.start();
			} else {
				interpolator.stop();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		audioEnabled,
		scanRate,
		interpolationMode,
		audioSmoothing,
		interpolator.isReady,
	]);

	// Update node data
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			scanRate,
			rotationSpeed,
			triangleScale,
			audioEnabled,
			interpolationMode,
			audioSmoothing,
			audioParams: {
				scanRate,
				rotationSpeed,
				triangleScale,
				audioEnabled,
				interpolationMode,
				audioSmoothing,
			},
		});
	}, [
		nodeId,
		updateNode,
		scanRate,
		rotationSpeed,
		triangleScale,
		audioEnabled,
		interpolationMode,
		audioSmoothing,
	]);

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
				{/* <DebugPanel sceneData={sceneData} /> */}

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								audioEnabled && interpolator.isPlaying
									? 'bg-green-500'
									: audioEnabled
										? 'bg-yellow-500'
										: 'bg-gray-500'
							}`}
							aria-label={
								audioEnabled && interpolator.isPlaying
									? 'Active'
									: audioEnabled
										? 'Ready'
										: 'Inactive'
							}
						/>
						<span className='text-node-secondary'>
							{audioEnabled && interpolator.isPlaying
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
				{audioEnabled && (
					<>
						<div className='mb-3'>
							<GridControl
								type='select'
								label='Interpolation'
								value={interpolationMode}
								variant='node-variant'
								layout='stacked'
								onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
									setInterpolationMode(
										e.target.value as 'linear' | 'cubic' | 'circular'
									)
								}
								className='h-12'
								options={[
									{ value: 'linear', label: 'Linear' },
									{ value: 'cubic', label: 'Cubic' },
									{ value: 'circular', label: 'Circular' },
								]}
							/>
						</div>

						<div className='mb-3'>
							<GridControl
								type='slider'
								label='Smoothing'
								value={audioSmoothing}
								min={0}
								max={1}
								step={0.01}
								variant='node-variant'
								layout='stacked'
								showValue
								formatValue={(val: number) => `${Math.round(val * 100)}%`}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setAudioSmoothing(Number(e.target.value))
								}
								className='h-12'
							/>
						</div>
					</>
				)}
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
