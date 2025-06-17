/**
 * ThreeWorkletNode - React Flow node component for coordinate-based stereo audio generator
 *
 * This component provides a user interface for controlling a coordinate-based stereo audio generator
 * that converts static triangle NDC coordinates into stereo audio output within the React Flow canvas.
 * Features coordinate smoothing, buffering, and real-time visualization of triangle vertices.
 */
import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, Vector2 } from 'three';

import { GridBlock } from '../shared/components/GridBlock';
import { useCallback } from 'react';
import { type NodeProps, useReactFlow, Position } from '@xyflow/react';

import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridSlider } from '../shared/components/ui/GridSlider';
import { GridButton } from '../shared/components/ui/GridButton';
import { useToneConnections } from '../audio/hooks/useToneConnections';
import { useThreeWorklet } from '../audio/hooks/useThreeWorklet';
import type { ThreeWorkletNode } from './types';
import type { CoordinatePoint } from '../audio/worklets';

// Grid configuration for three worklet node
const THREE_WORKLET_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 16,
} as const;

// Configuration for coordinate smoothing and buffering
const COORDINATE_BUFFER_CONFIG = {
	maxBufferSize: 4096, // Maximum number of coordinate points to buffer (increased from 512)
	updateInterval: 16, // Update interval in milliseconds (roughly 60fps)
	smoothingFactor: 0.1, // Interpolation factor for smoothing (0-1)
} as const;

// Triangle vertices for coordinate tracking (3 vertices with one much longer side)
const TRIANGLE_POINTS = [
	new Vector3(-1.5, -0.8, 0), // Bottom-left vertex
	new Vector3(1.5, -0.8, 0), // Bottom-right vertex (very long base)
	new Vector3(0.0, 1.2, 0), // Top vertex (centered, creating isosceles triangle with long base)
];

// Static triangle component with wireframe edges
function StaticTriangle() {
	const vertices = new Float32Array([
		// Triangle vertices from TRIANGLE_POINTS
		-1.5,
		-0.8,
		0, // Bottom-left
		1.5,
		-0.8,
		0, // Bottom-right
		0.0,
		1.2,
		0, // Top
	]);

	return (
		<mesh>
			<bufferGeometry>
				<bufferAttribute
					attach='attributes-position'
					array={vertices}
					count={3}
					itemSize={3}
				/>
			</bufferGeometry>
			{/* Wireframe material to show the triangle edges */}
			<meshBasicMaterial
				color={'#00ff00'}
				wireframe={true}
			/>
		</mesh>
	);
}

// Component to calculate and track triangle point screen coordinates
function TriangleCoordinateTracker({
	onCoordinatesUpdate,
}: {
	onCoordinatesUpdate: (coords: Vector2[]) => void;
}) {
	const { camera } = useThree();

	useFrame(() => {
		const screenCoords: Vector2[] = [];

		TRIANGLE_POINTS.forEach((point) => {
			// Clone the 3D point (no rotation needed for static triangle)
			const staticPoint = point.clone();

			// Project the point to screen space
			staticPoint.project(camera);

			// Store the normalized coordinates (NDC: -1 to +1)
			screenCoords.push(new Vector2(staticPoint.x, staticPoint.y));
		});

		onCoordinatesUpdate(screenCoords);
	});

	return null; // This component doesn't render anything
}

/**
 * ThreeWorkletNode - React Flow node component for coordinate-based stereo audio generator
 *
 * This component provides a user interface for controlling a coordinate-based stereo audio generator
 * that converts static triangle NDC coordinates into stereo audio output within the React Flow canvas.
 * Features coordinate smoothing, buffering, and real-time visualization of the 3 triangle vertices.
 *
 * @param props - React Flow node properties
 * @returns JSX element representing the coordinate-based audio generator node
 */
export function ThreeWorkletNode({
	id,
	data,
	selected = false,
}: NodeProps<ThreeWorkletNode>) {
	// State to track triangle point coordinates
	const [triangleCoords, setTriangleCoords] = useState<Vector2[]>([]);

	// Coordinate buffer for smoothing
	const coordinateBufferRef = useRef<CoordinatePoint[]>([]);
	const lastUpdateTimeRef = useRef<number>(0);

	// Hooks must be called first, before any conditional logic
	const {
		start,
		stop,
		setVolume,
		setPlaybackSpeed,
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

	// Format volume value as percentage
	const formatVolume = useCallback(
		(value: number): string => `${Math.round(value * 100)}%`,
		[]
	);

	// Format playback speed value
	const formatPlaybackSpeed = useCallback(
		(value: number): string => `${value.toFixed(1)}x`,
		[]
	);

	// Smoothing and buffer management function
	const smoothAndBufferCoordinates = useCallback(
		(newCoords: Vector2[]) => {
			if (newCoords.length === 0) return;

			const now = Date.now();

			// Throttle updates based on update interval
			if (
				now - lastUpdateTimeRef.current <
				COORDINATE_BUFFER_CONFIG.updateInterval
			) {
				return;
			}

			lastUpdateTimeRef.current = now;

			// Convert Vector2 to CoordinatePoint format
			const newPoints: CoordinatePoint[] = newCoords.map((coord) => ({
				x: coord.x,
				y: coord.y,
			}));

			// Add to buffer
			coordinateBufferRef.current.push(...newPoints);

			// Trim buffer if it exceeds max size
			if (
				coordinateBufferRef.current.length >
				COORDINATE_BUFFER_CONFIG.maxBufferSize
			) {
				coordinateBufferRef.current = coordinateBufferRef.current.slice(
					-COORDINATE_BUFFER_CONFIG.maxBufferSize
				);
			}

			// Send updated coordinates to worklet if ready and playing
			if (isReady && coordinateBufferRef.current.length > 0) {
				setCoordinates([...coordinateBufferRef.current]);
			}
		},
		[isReady, setCoordinates]
	);

	// Update coordinates when triangle coordinates change
	useEffect(() => {
		if (triangleCoords.length > 0) {
			smoothAndBufferCoordinates(triangleCoords);
		}
	}, [triangleCoords, smoothAndBufferCoordinates]);

	// Handle coordinate updates from the triangle tracker
	const handleCoordinatesUpdate = useCallback((coords: Vector2[]) => {
		setTriangleCoords(coords);
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

									{/* Simple lighting */}
									<ambientLight intensity={0.8} />

									{/* The static triangle */}
									<StaticTriangle />

									{/* Coordinate tracker */}
									<TriangleCoordinateTracker
										onCoordinatesUpdate={handleCoordinatesUpdate}
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
						gridX={4}
						gridY={15}
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

					{/* Triangle Coordinates Display */}
					<GridBlock
						gridWidth={5}
						gridHeight={1.5}
						gridX={0}
						gridY={14.5}
						showDimensions={false}
					>
						<div className='w-full h-full p-1 flex flex-col justify-center'>
							<div className='text-xs text-gray-300 mb-1'>Triangle NDC:</div>
							<div className='space-y-0.5 max-h-16 overflow-y-auto'>
								{triangleCoords.map((coord, index) => (
									<div
										key={index}
										className='text-xs text-green-400 font-mono'
									>
										V{index + 1}: ({coord.x.toFixed(3)}, {coord.y.toFixed(3)})
									</div>
								))}
							</div>
						</div>
					</GridBlock>

					{/* Volume Control */}
					<GridSlider
						gridWidth={3}
						gridHeight={0.8}
						gridX={8}
						gridY={14.5}
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
						gridHeight={0.8}
						gridX={8}
						gridY={15.3}
						label='Speed'
						sliderProps={{
							value: params.playbackSpeed || 1.0,
							min: 0.1,
							max: 4.0,
							step: 0.1,
							onChange: (e) => setPlaybackSpeed(parseFloat(e.target.value)),
							formatValue: formatPlaybackSpeed,
							disabled: !isReady,
							'aria-label': 'Playback speed control',
						}}
						layout='compact'
						showValue={true}
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
