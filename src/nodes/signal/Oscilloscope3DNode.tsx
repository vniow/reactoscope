/**
 * 3D Oscilloscope Node Component
 *
 * Real-time 3D waveform visualization using React Three Fiber.
 * Acts as a pass-through node with visualization - signal flows in and out.
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface OscilloscopeNodeData extends BaseNodeData {
	timeWindow?: number;
	triggerLevel?: number;
	resolution?: number;
}

// Component to manage OrbitControls based on React Flow interactions
function ResponsiveOrbitControls({
	isReactFlowInteracting,
}: {
	isReactFlowInteracting: boolean;
}) {
	return (
		<OrbitControls
			enabled={!isReactFlowInteracting}
			enableRotate={false}
			enableZoom={true}
			enablePan={true}
			minZoom={50}
			maxZoom={150}
			zoomSpeed={0.3}
			panSpeed={0.5}
		/>
	);
}

// 3D Waveform component that runs inside the Canvas
function Waveform3D({
	nodeId,
	triggerLevel,
	isSelected,
}: {
	nodeId: string;
	triggerLevel: number;
	isSelected: boolean;
}) {
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	const waveformMeshRef = useRef<THREE.Line>(null);
	const triggerMeshRef = useRef<THREE.Line>(null);

	// Create geometry for the waveform line
	const waveformGeometry = useMemo(() => {
		const geometry = new THREE.BufferGeometry();
		const points = new Float32Array(512 * 3); // 512 points * 3 coordinates

		// Initialize with flat line
		for (let i = 0; i < 512; i++) {
			points[i * 3] = (i / 511) * 4 - 2; // x from -2 to 2
			points[i * 3 + 1] = 0; // y
			points[i * 3 + 2] = 0; // z
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
		return geometry;
	}, []);

	// Create geometry for trigger line
	const triggerGeometry = useMemo(() => {
		const geometry = new THREE.BufferGeometry();
		const points = new Float32Array(6); // 2 points * 3 coordinates

		points[0] = -2;
		points[1] = 0;
		points[2] = 0; // first point
		points[3] = 2;
		points[4] = 0;
		points[5] = 0; // second point

		geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
		return geometry;
	}, []);

	// Materials
	const waveformMaterial = useMemo(
		() =>
			new THREE.LineBasicMaterial({
				color: isSelected ? 0x10b981 : 0x00ff41, // Classic oscilloscope green
			}),
		[isSelected]
	);

	const triggerMaterial = useMemo(
		() =>
			new THREE.LineDashedMaterial({
				color: 0xffa500,
				dashSize: 0.1,
				gapSize: 0.05,
			}),
		[]
	);

	// Create THREE.Line objects
	const waveformLine = useMemo(
		() => new THREE.Line(waveformGeometry, waveformMaterial),
		[waveformGeometry, waveformMaterial]
	);

	const triggerLine = useMemo(
		() => new THREE.Line(triggerGeometry, triggerMaterial),
		[triggerGeometry, triggerMaterial]
	);

	useFrame(() => {
		// Get the analyzer audio node (index 1 in the array: [passThrough, analyzer])
		const audioNodes = getAudioNode(nodeId) as Tone.ToneAudioNode[];
		const analyzer = audioNodes?.[1] as Tone.Analyser;

		let waveformData: Float32Array;

		if (!analyzer) {
			// Create a flat line at zero level
			waveformData = new Float32Array(512).fill(0);
		} else {
			// Get waveform data from analyzer
			waveformData = analyzer.getValue() as Float32Array;
		}

		// Update the waveform line geometry
		if (waveformMeshRef.current) {
			const positions = waveformMeshRef.current.geometry.attributes.position
				.array as Float32Array;

			for (let i = 0; i < waveformData.length; i++) {
				const x = (i / (waveformData.length - 1)) * 4 - 2; // x from -2 to 2
				const y = waveformData[i] * 2; // Scale amplitude
				const z = 0;

				positions[i * 3] = x;
				positions[i * 3 + 1] = y;
				positions[i * 3 + 2] = z;
			}

			waveformMeshRef.current.geometry.attributes.position.needsUpdate = true;
		}

		// Update trigger line
		if (triggerMeshRef.current && Math.abs(triggerLevel) > 0.01) {
			const positions = triggerMeshRef.current.geometry.attributes.position
				.array as Float32Array;
			const y = triggerLevel * 2;

			positions[1] = y; // first point y
			positions[4] = y; // second point y

			triggerMeshRef.current.geometry.attributes.position.needsUpdate = true;
		}
	});

	return (
		<group>
			{/* 2D Oscilloscope screen grid - flat on XY plane */}
			<gridHelper
				args={[4, 8]}
				rotation={[0, 0, 0]} // No rotation - keep flat
				material-opacity={0.3}
				material-transparent={true}
			/>

			{/* Horizontal grid lines for oscilloscope appearance */}
			<gridHelper
				args={[4, 4]}
				rotation={[Math.PI / 2, 0, 0]} // Rotate to create horizontal lines
				material-opacity={0.2}
				material-transparent={true}
			/>

			{/* Waveform line */}
			<primitive
				object={waveformLine}
				ref={waveformMeshRef}
			/>

			{/* Trigger level line */}
			{Math.abs(triggerLevel) > 0.01 && (
				<primitive
					object={triggerLine}
					ref={triggerMeshRef}
				/>
			)}
		</group>
	);
}

export function Oscilloscope3DNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: OscilloscopeNodeData }) {
	// Get audio context state
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

	// Type assertions for props
	const nodeId = id as string;
	const nodeData = data as OscilloscopeNodeData;
	const isSelected = selected as boolean;

	// Container ref for responsive sizing
	const containerRef = useRef<HTMLDivElement>(null);

	// State for animation status and React Flow interaction tracking
	const [isPlaying, setIsPlaying] = useState(false);
	const [isReactFlowInteracting, setIsReactFlowInteracting] = useState(false);

	// Track React Flow interaction state
	useEffect(() => {
		const handlePointerDown = () => setIsReactFlowInteracting(true);
		const handlePointerUp = () => setIsReactFlowInteracting(false);
		const handleWheel = () => {
			setIsReactFlowInteracting(true);
			// Reset interaction state after wheel event
			setTimeout(() => setIsReactFlowInteracting(false), 100);
		};

		const reactFlowPane = document.querySelector('.react-flow__pane');
		if (reactFlowPane) {
			reactFlowPane.addEventListener('pointerdown', handlePointerDown);
			reactFlowPane.addEventListener('pointerup', handlePointerUp);
			reactFlowPane.addEventListener('wheel', handleWheel);

			return () => {
				reactFlowPane.removeEventListener('pointerdown', handlePointerDown);
				reactFlowPane.removeEventListener('pointerup', handlePointerUp);
				reactFlowPane.removeEventListener('wheel', handleWheel);
			};
		}
	}, []);

	// Register audio node on mount (only once)
	useEffect(() => {
		console.log(`📊 Registering 3D oscilloscope audio node: ${nodeId}`);

		registerAudioNode(nodeId, 'oscilloscope', {
			timeWindow: nodeData.timeWindow || 0.1,
			triggerLevel: nodeData.triggerLevel || 0,
			resolution: nodeData.resolution || 512,
		});

		setIsPlaying(true);

		// Cleanup on unmount
		return () => {
			console.log(`🧹 Unregistering 3D oscilloscope audio node: ${nodeId}`);
			unregisterAudioNode(nodeId);
		};
		// Only depend on nodeId and the register/unregister functions
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeId, registerAudioNode, unregisterAudioNode]);

	// Set up controls using our custom hook
	const [timeWindow, setTimeWindow] = useAudioNodeParam<number>(
		nodeId,
		'timeWindow',
		nodeData.timeWindow || 0.1,
		{
			min: 0.01,
			max: 1.0,
		}
	);

	const [triggerLevel, setTriggerLevel] = useAudioNodeParam<number>(
		nodeId,
		'triggerLevel',
		nodeData.triggerLevel || 0,
		{
			min: -1,
			max: 1,
		}
	);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(nodeId, {
			timeWindow,
			triggerLevel,
			audioParams: { timeWindow, triggerLevel },
		});
	}, [nodeId, timeWindow, triggerLevel, updateNode]);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='3D Oscilloscope'
			variant='signal'
		>
			{/* 3D Waveform Display */}
			<div className='mb-4 p-3 bg-black rounded-lg border border-node-accent/20'>
				{/* Responsive Canvas Container */}
				<div className='relative w-[280px] h-[200px] overflow-hidden'>
					<div
						ref={containerRef}
						className='absolute inset-0 w-full h-full'
					>
						<Canvas
							orthographic
							camera={{
								position: [0, 0, 5], // Front-facing view
								zoom: 80,
								near: 0.1,
								far: 1000,
							}}
							style={{
								background: '#000',
								width: '100%',
								height: '100%',
								display: 'block',
							}}
							dpr={window.devicePixelRatio || 1}
							onCreated={({ gl, size }) => {
								// Set proper canvas size based on container
								gl.setSize(size.width, size.height);
							}}
						>
						{/* Simple lighting for 2D oscilloscope screen appearance */}
						<ambientLight intensity={1.0} />

						<Waveform3D
							nodeId={nodeId}
							triggerLevel={triggerLevel}
							isSelected={isSelected}
						/>

						{/* Responsive controls that disable during React Flow interactions */}
						<ResponsiveOrbitControls
							isReactFlowInteracting={isReactFlowInteracting}
						/>
					</Canvas>
					</div>
				</div>

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
							}`}
						/>
						<span className='text-node-text/70'>
							{isPlaying ? '3D SIGNAL' : 'NO INPUT'}
						</span>
					</div>
					<span className='text-node-text/50'>
						{(timeWindow * 1000).toFixed(0)}ms
					</span>
				</div>
			</div>

			{/* Time Window Control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Time Window'
					value={timeWindow}
					min={0.01}
					max={1.0}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${(val * 1000).toFixed(0)}ms`}
					onChange={(e) => setTimeWindow(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Trigger Level Control */}
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Trigger Level'
					value={triggerLevel}
					min={-1}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue={true}
					formatValue={(val) => `${(val * 100).toFixed(0)}%`}
					onChange={(e) => setTriggerLevel(Number(e.target.value))}
					className='h-12'
				/>
			</div>

			{/* Audio Input Handle */}
			<NodeHandle
				id='input'
				type='target'
				position={Position.Left}
				label='In'
				style={{ top: '50%' }}
			/>

			{/* Audio Output Handle - pass-through */}
			<NodeHandle
				id='output'
				type='source'
				position={Position.Right}
				label='Out'
				style={{ top: '50%' }}
			/>
		</BaseNode>
	);
}
