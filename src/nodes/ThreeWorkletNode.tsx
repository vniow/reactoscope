/**
 * ThreeWorkletNode - React Flow node component for scene-based coordinate audio generator
 *
 * This component provides a user interface for controlling a scene-based coordinate audio generator
 * that extracts coordinates from animated geometric objects (square and circle) in a Three.js scene
 * and converts them into stereo audio output. Features coordinate smoothing, buffering, and real-time
 * visualization with animated 3D geometry.
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector2 } from 'three';

import { GridBlock } from '../shared/components/GridBlock';
import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridButton } from '../shared/components/ui/GridButton';
import { GridSelect } from '../shared/components/ui/GridSelect';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import { useThreeWorklet } from '../audio/hooks/useThreeWorklet';
import type { ThreeWorkletNode } from './types';
import type { CoordinatePoint } from '../audio/worklets';
import { GeometricScene } from './GeometricScene';
import { SceneCoordinateTracker } from './SceneCoordinateTracker';
import { useThreeWorkletDebug } from './hooks/useThreeWorkletDebug';
import {
	THREE_WORKLET_NODE_CONFIG,
	COORDINATE_BUFFER_CONFIG,
	BUFFER_SIZE_OPTIONS,
} from './ThreeWorkletNodeConfig';

/**
 * ThreeWorkletNode - React Flow node component for scene-based coordinate audio generator
 *
 * This component provides a user interface for controlling a scene-based coordinate audio generator
 * that extracts coordinates from animated geometric objects in a Three.js scene and converts them
 * into stereo audio output. Features coordinate smoothing, buffering, and real-time visualization
 * with animated square and circle geometry.
 *
 * @param props - React Flow node properties
 * @returns JSX element representing the scene-based coordinate audio generator node
 */
export function ThreeWorkletNode({
	id,
	data,
	selected = false,
}: NodeProps<ThreeWorkletNode>) {
	// State to track scene coordinates from geometric objects
	const [sceneCoords, setSceneCoords] = useState<Vector2[]>([]);

	// Dynamic sample rate control (0.1 = 10%, 1.0 = 100%)
	const [sampleRate, setSampleRate] = useState<number>(1);

	// Dynamic buffer size control
	const [bufferSize, setBufferSize] = useState<number>(128);

	// Use custom debug hook to separate concerns
	const {
		debugMetrics,
		frameRate,
		bufferStats,
		handleDebugUpdate,
		updateBufferStats,
	} = useThreeWorkletDebug();

	// Memoize buffer size options to prevent recreation
	const bufferSizeOptions = useMemo(() => BUFFER_SIZE_OPTIONS, []);

	// Coordinate buffer for smoothing
	const coordinateBufferRef = useRef<CoordinatePoint[]>([]);
	const lastUpdateTimeRef = useRef<number>(0);

	// Simplified refs - debug tracking moved to custom hook
	const throttleHitCountRef = useRef<number>(0);
	const bufferCreationTimeRef = useRef<Map<number, number>>(new Map());

	// Hooks must be called first, before any conditional logic
	const {
		start,
		stop,
		setVolume,
		setPlaybackSpeed,
		setInterpolationStep,
		setCoordinates,
		isPlaying,
		isReady,
		params,
	} = useThreeWorklet(id);

	// Handle audio connections to other nodes
	useToneConnections(id);

	// Get the React Flow instance for node management
	const reactFlowInstance = useReactFlow();

	const removeNode = useCallback((): void => {
		reactFlowInstance.setNodes((nodes) =>
			nodes.filter((node) => node.id !== id)
		);
		reactFlowInstance.setEdges((edges) =>
			edges.filter((edge) => edge.source !== id && edge.target !== id)
		);
	}, [reactFlowInstance, id]);

	// Toggle playback
	const handlePlayToggle = useCallback((): void => {
		if (isPlaying) {
			stop();
		} else {
			start();
		}
	}, [isPlaying, stop, start]);

	// Memoize formatters to prevent recreation
	const formatVolume = useCallback(
		(value: number): string => `${Math.round(value * 100)}%`,
		[]
	);

	const formatPlaybackSpeed = useCallback(
		(value: number): string => `${value.toFixed(1)}x`,
		[]
	);

	const formatSampleRate = useCallback(
		(value: number): string => `${Math.round(value * 100)}%`,
		[]
	);

	// Format interpolation step value
	const formatInterpolationStep = useCallback(
		(value: number): string => `${value.toFixed(3)}`,
		[]
	);

	// Smoothing and buffer management function with debug tracking
	const smoothAndBufferCoordinates = useCallback(
		(newCoords: Vector2[]) => {
			if (newCoords.length === 0) return;

			const now = Date.now();

			// Throttle updates based on update interval
			if (
				now - lastUpdateTimeRef.current <
				COORDINATE_BUFFER_CONFIG.updateInterval
			) {
				throttleHitCountRef.current++;
				return;
			}

			lastUpdateTimeRef.current = now;

			// Convert Vector2 to CoordinatePoint format with timestamps
			// Optimize: Pre-allocate array and reuse objects where possible
			const newPoints: CoordinatePoint[] = [];
			newPoints.length = newCoords.length; // Pre-allocate

			for (let i = 0; i < newCoords.length; i++) {
				const coord = newCoords[i];
				const pointId = now * 1000 + i; // Unique ID for tracking
				bufferCreationTimeRef.current.set(pointId, now);
				newPoints[i] = {
					x: coord.x,
					y: coord.y,
				};
			}

			// Add to buffer with more efficient approach
			const currentBuffer = coordinateBufferRef.current;
			const totalLength = currentBuffer.length + newPoints.length;

			if (totalLength > bufferSize) {
				// Efficient buffer trimming - avoid multiple array operations
				const keepCount = Math.max(0, bufferSize - newPoints.length);
				const trimmedBuffer = currentBuffer.slice(-keepCount);
				coordinateBufferRef.current = trimmedBuffer.concat(newPoints);

				// Clean up old timestamps more efficiently
				const removeCount = currentBuffer.length - keepCount;
				if (removeCount > 0) {
					const oldKeys = Array.from(
						bufferCreationTimeRef.current.keys()
					).slice(0, removeCount);
					oldKeys.forEach((key) => bufferCreationTimeRef.current.delete(key));
				}
			} else {
				// Simple append when under buffer limit
				coordinateBufferRef.current = currentBuffer.concat(newPoints);
			}

			// Calculate buffer stats (moved outside hot path when possible)
			const buffer = coordinateBufferRef.current;
			const fillPercentage = (buffer.length / bufferSize) * 100;
			const timestamps = Array.from(bufferCreationTimeRef.current.values());
			const oldestPointAge =
				timestamps.length > 0 ? now - Math.min(...timestamps) : 0;

			// Update buffer stats using the debug hook
			updateBufferStats({
				fillPercentage,
				oldestPointAge,
				lastSendTime: now,
				throttleHits: throttleHitCountRef.current,
			});

			// Send updated coordinates to worklet if ready and playing
			if (isReady && buffer.length > 0) {
				// Avoid unnecessary array copying
				setCoordinates(buffer);
			}
		},
		[isReady, setCoordinates, bufferSize, updateBufferStats]
	);

	// Update coordinates when scene coordinates change
	useEffect(() => {
		if (sceneCoords.length > 0) {
			smoothAndBufferCoordinates(sceneCoords);
		}
	}, [sceneCoords, smoothAndBufferCoordinates]);

	// Handle coordinate updates from the scene tracker
	const handleCoordinatesUpdate = useCallback((coords: Vector2[]) => {
		setSceneCoords(coords);
	}, []);

	// Input validation after hooks
	if (!id || typeof id !== 'string') {
		console.error('🚨 ThreeWorkletNode: Invalid id provided', { id });
		return <div>Error: Invalid node ID</div>;
	}

	return (
		<BaseNode
			variant={data.variant || 'source'} // Use variant from data, default to source
			gridWidth={THREE_WORKLET_NODE_CONFIG.gridWidth}
			gridHeight={THREE_WORKLET_NODE_CONFIG.gridHeight}
			nodeId={id}
			selected={selected}
			onDelete={removeNode}
			title={data.label || 'Three Worklet'}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Three.js Display */}
				<GridBlock
					gridWidth={8}
					gridHeight={8}
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

									{/* Simple lighting */}
									<ambientLight intensity={0.8} />

									{/* Geometric scene with square and circle */}
									<GeometricScene />

									{/* Scene coordinate tracker */}
									<SceneCoordinateTracker
										onCoordinatesUpdate={handleCoordinatesUpdate}
										onDebugUpdate={handleDebugUpdate}
										sampleRate={sampleRate}
									/>
								</Canvas>
							</div>
						</div>
					</div>
				</GridBlock>
				<div className='relative w-full h-full overflow-visible'>
					{/* Play/Stop Button */}
					<GridButton
						gridWidth={3}
						gridHeight={1}
						gridX={8}
						gridY={3}
						buttonLabel={isPlaying ? '⏹️ Stop' : '▶️ Start'}
						variant={isPlaying ? 'secondary' : 'node-variant'}
						size='sm'
						layout='fill'
						onClick={handlePlayToggle}
						disabled={!isReady}
						aria-label={
							isPlaying
								? 'Stop three worklet generation'
								: 'Start three worklet generation'
						}
					/>

					{/* Readiness Status Indicator */}
					<div
						className={`absolute text-xs font-mono ${
							isReady ? 'text-green-500' : 'text-yellow-500'
						}`}
						style={{
							left: '0.25rem',
							top: '0.25rem',
						}}
					>
						{isReady ? '●' : '○'}
					</div>

					{/* Debug Panel */}
					<GridBlock
						gridWidth={8}
						gridHeight={5}
						gridX={0}
						gridY={10}
						showDimensions={true}
					>
						<div className='w-full h-full p-1'>
							<div className='w-full h-full'>
								<div className='text-xs font-mono text-blue-400 mb-1'>
									🔍 Debug Panel (FPS: {frameRate})
								</div>

								{debugMetrics && (
									<div className='grid grid-cols-3 gap-1 text-xs font-mono overflow-y-auto h-full'>
										{/* Performance Metrics */}
										<div className='space-y-0.5'>
											<div className='text-yellow-400 font-semibold'>
												Performance:
											</div>
											<div className='text-green-400'>
												Process: {debugMetrics.processingTime.toFixed(2)}ms
											</div>
											<div className='text-green-400'>
												Throttle Hits: {bufferStats.throttleHits}
											</div>
											<div className='text-green-400'>
												Sample Step: {debugMetrics.sampleStep}
											</div>
										</div>

										{/* Scene Analysis */}
										<div className='space-y-0.5'>
											<div className='text-yellow-400 font-semibold'>
												Scene:
											</div>
											<div className='text-blue-400'>
												Objects: {debugMetrics.meshCount}
											</div>
											<div className='text-blue-400'>
												Vertices: {debugMetrics.totalVertices}
											</div>
											<div className='text-blue-400'>
												Centers: +{debugMetrics.centerPointsAdded}
											</div>
										</div>

										{/* Buffer Statistics */}
										<div className='space-y-0.5'>
											<div className='text-yellow-400 font-semibold'>
												Buffer:
											</div>
											<div className='text-purple-400'>
												Fill: {bufferStats.fillPercentage.toFixed(1)}%
											</div>
											<div className='text-purple-400'>
												Age: {bufferStats.oldestPointAge}ms
											</div>
											<div className='text-purple-400'>
												Size: {coordinateBufferRef.current.length}/{bufferSize}
											</div>
										</div>

										{/* Coordinate Quality */}
										<div className='space-y-0.5'>
											<div className='text-yellow-400 font-semibold'>
												Quality:
											</div>
											<div className='text-orange-400'>
												Extracted: {debugMetrics.extractedPoints}
											</div>
											<div className='text-orange-400'>
												Dupes: {debugMetrics.duplicatesFiltered}
											</div>
											<div className='text-orange-400'>
												Range: X[{debugMetrics.coordinateRange.xMin.toFixed(2)},{' '}
												{debugMetrics.coordinateRange.xMax.toFixed(2)}]
											</div>
										</div>

										{/* Per-Object Breakdown */}
										<div className='space-y-0.5 col-span-3'>
											<div className='text-yellow-400 font-semibold'>
												Per Object:
											</div>
											<div className='flex flex-wrap gap-2'>
												{Object.entries(debugMetrics.pointsPerObject).map(
													([name, count]) => (
														<span
															key={name}
															className='text-cyan-400 text-xs'
														>
															{name}: {count}
														</span>
													)
												)}
											</div>
										</div>

										{/* Worklet Status */}
										<div className='space-y-0.5 col-span-3'>
											<div className='text-yellow-400 font-semibold'>
												Worklet:
											</div>
											<div className='flex gap-4'>
												<span
													className={`text-xs ${isReady ? 'text-green-400' : 'text-red-400'}`}
												>
													Ready: {isReady ? 'YES' : 'NO'}
												</span>
												<span
													className={`text-xs ${isPlaying ? 'text-green-400' : 'text-gray-400'}`}
												>
													Playing: {isPlaying ? 'YES' : 'NO'}
												</span>
												<span className='text-xs text-gray-400'>
													Last Send: {Date.now() - bufferStats.lastSendTime}ms
													ago
												</span>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</GridBlock>

					{/* Scene Coordinates Display */}
					{/* <GridBlock
						gridWidth={5}
						gridHeight={1.5}
						gridX={0}
						gridY={14.5}
						showDimensions={false}
					>
						<div className='w-full h-full p-1 flex flex-col justify-center'>
							<div className='text-xs text-gray-300 mb-1'>
								Scene: {sceneCoords.length} | Buffer:{' '}
								{coordinateBufferRef.current.length}
							</div>
							<div className='space-y-0.5 max-h-16 overflow-y-auto'>
								{sceneCoords.slice(0, 6).map((coord, index) => (
									<div
										key={index}
										className='text-xs text-green-400 font-mono'
									>
										P{index + 1}: ({coord.x.toFixed(3)}, {coord.y.toFixed(3)})
									</div>
								))}
								{sceneCoords.length > 6 && (
									<div className='text-xs text-gray-500 font-mono'>
										... +{sceneCoords.length - 6} more
									</div>
								)}
							</div>
						</div>
					</GridBlock> */}

					{/* Volume Control */}
					<GridSlider
						gridWidth={3}
						gridHeight={2}
						gridX={0}
						gridY={9}
						label='Volume'
						sliderProps={{
							value: params.volume,
							min: 0,
							max: 1,
							step: 0.01,
							onChange: (e) => setVolume(parseFloat(e.target.value)),
							formatValue: formatVolume,
							disabled: !isReady,
							'aria-label': 'Volume control',
						}}
						layout='compact'
						showValue={true}
					/>

					{/* Playback Speed Control */}
					<GridSlider
						gridWidth={3}
						gridHeight={2}
						gridX={3}
						gridY={9}
						label='Speed'
						sliderProps={{
							value: params.playbackSpeed || 1.0,
							min: 0.1,
							max: 100.0,
							step: 0.1,
							onChange: (e) => setPlaybackSpeed(parseFloat(e.target.value)),
							formatValue: formatPlaybackSpeed,
							disabled: !isReady,
							'aria-label': 'Playback speed control',
						}}
						layout='compact'
						showValue={true}
					/>

					{/* Sample Rate Control */}
					<GridSlider
						gridWidth={3}
						gridHeight={2}
						gridX={0}
						gridY={11}
						label='Sample'
						sliderProps={{
							value: sampleRate,
							min: 0.01,
							max: 1.0,
							step: 0.01,
							onChange: (e) => setSampleRate(parseFloat(e.target.value)),
							formatValue: formatSampleRate,
							'aria-label': 'Vertex sampling rate control',
						}}
						layout='compact'
						showValue={true}
					/>

					{/* Interpolation Step Control */}
					<GridSlider
						gridWidth={3}
						gridHeight={2}
						gridX={3}
						gridY={11}
						label='Interp'
						sliderProps={{
							value: params.interpolationStep || 0.1,
							min: 0.001,
							max: 1.0,
							step: 0.001,
							onChange: (e) => setInterpolationStep(parseFloat(e.target.value)),
							formatValue: formatInterpolationStep,
							disabled: !isReady,
							'aria-label': 'Interpolation step control',
						}}
						layout='compact'
						showValue={true}
					/>

					{/* Buffer Size Control */}
					<GridSelect
						gridWidth={3}
						gridHeight={2}
						gridX={6}
						gridY={9}
						label='Buffer'
						selectProps={{
							value: bufferSize.toString(),
							onChange: (e) => setBufferSize(parseInt(e.target.value)),
							options: bufferSizeOptions,
							'aria-label': 'Coordinate buffer size',
						}}
						layout='compact'
					/>

					{/* Coordinate Buffer Info */}
					<div
						className='absolute text-xs text-gray-400 font-mono'
						style={{
							right: '0.25rem',
							top: '0.25rem',
						}}
					>
						Buf: {coordinateBufferRef.current.length}
					</div>

					{/* Coordinate System Indicator */}
					<div
						className='absolute text-xs text-blue-400 font-mono'
						style={{
							right: '0.25rem',
							top: '2rem',
						}}
						title={`Coordinate system: X-axis ${COORDINATE_BUFFER_CONFIG.flipXAxis ? 'flipped' : 'normal'}, Y-axis ${COORDINATE_BUFFER_CONFIG.flipYAxis ? 'flipped' : 'normal'}`}
					>
						X: {COORDINATE_BUFFER_CONFIG.flipXAxis ? '⟲' : '→'} Y:{' '}
						{COORDINATE_BUFFER_CONFIG.flipYAxis ? '⟲' : '↑'}
					</div>
				</div>
			</div>

			{/* Output Handles */}
			<GridNodeHandle
				id='outputX'
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={0.5}
				label='X'
			/>
			<GridNodeHandle
				id='outputY'
				type='source'
				mode='static'
				position={Position.Right}
				gridX={0}
				gridY={1.5}
				label='Y'
			/>
		</BaseNode>
	);
}
