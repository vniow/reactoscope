/**
 * 3D Oscilloscope Node Component
 *
 * Real-time 3D waveform visualization using React Three Fiber.
 * Acts as a pass-through node with visualization - signal flows in and out.
 */

import React from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

/**
 * Props for Oscilloscope3DNode.
 * Extends BaseNodeData for type safety and future extensibility.
 */
interface OscilloscopeNodeData extends BaseNodeData {
	/** Time window in seconds (0.01 - 1.0) */
	timeWindow?: number;
	/** Trigger level (-1 to 1) */
	triggerLevel?: number;
	/** Resolution (number of samples, default 512) */
	resolution?: number;
}

/**
 * Waveform3D
 *
 * Renders the oscilloscope waveform and trigger line in a Three.js scene.
 * Pure presentational component.
 */
function Waveform3D({
	nodeId,
	triggerLevel,
	isSelected,
}: {
	nodeId: string;
	triggerLevel: number;
	isSelected: boolean;
}): React.ReactElement {
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	const [points, setPoints] = useState<[number, number, number][]>(() =>
		Array.from({ length: 512 }, (_, i) => [(i / 511) * 4 - 2, 0, 0])
	);
	const dataRef = useRef<Float32Array>(new Float32Array(512));

	useFrame(() => {
		const audioNodes = getAudioNode(nodeId) as Tone.ToneAudioNode[] | null;
		const analyzer = audioNodes?.[1] as Tone.Analyser | undefined;
		if (!analyzer) {
			if (dataRef.current.some((v) => v !== 0)) {
				dataRef.current.fill(0);
				setPoints(
					Array.from({ length: 512 }, (_, i) => [(i / 511) * 4 - 2, 0, 0])
				);
			}
			return;
		}
		try {
			const current = analyzer.getValue() as Float32Array;
			if (current.some((v, i) => Math.abs(v - dataRef.current[i]) > 0.01)) {
				dataRef.current.set(current);
				setPoints(
					Array.from(current, (y, i) => [
						(i / (current.length - 1)) * 4 - 2,
						y * 2,
						0,
					])
				);
			}
		} catch (e) {
			console.warn('Error reading analyzer data:', e);
		}
	});

	const triggerPoints = useMemo<[number, number, number][]>(
		() => [
			[-2, triggerLevel * 2, 0],
			[2, triggerLevel * 2, 0],
		],
		[triggerLevel]
	);

	return (
		<group>
			<gridHelper
				args={[4, 8]}
				rotation={[0, 0, 0]}
				material-opacity={0.3}
				material-transparent
			/>
			<gridHelper
				args={[4, 4]}
				rotation={[Math.PI / 2, 0, 0]}
				material-opacity={0.2}
				material-transparent
			/>
			<Line
				points={points}
				color={isSelected ? 'var(--color-accent)' : 'var(--color-signal)'}
				lineWidth={1}
			/>
			{Math.abs(triggerLevel) > 0.01 && (
				<Line
					points={triggerPoints as [number, number, number][]}
					color='var(--color-trigger)'
					lineWidth={1}
					dashed
					dashSize={0.1}
					gapSize={0.05}
				/>
			)}
		</group>
	);
}

/**
 * Oscilloscope3DNode
 *
 * 3D oscilloscope node for Reactoscope. Visualizes real-time audio waveform using React Three Fiber.
 *
 * @remarks
 * - Follows composition, single responsibility, and container/presenter separation.
 * - Uses explicit types, JSDoc, and semantic Tailwind classes.
 * - Audio node lifecycle is managed via Zustand store.
 *
 * @param id - Node id (from React Flow)
 * @param data - Node data (timeWindow, triggerLevel, etc)
 * @param selected - Whether the node is selected
 */
export function Oscilloscope3DNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: OscilloscopeNodeData }): React.ReactElement {
	// Audio context state
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const getAudioNode = useAppStore((state) => state.getAudioNode);

	// Animation status
	const [isPlaying, setIsPlaying] = useState<boolean>(false);

	// Register/unregister audio node
	useEffect(() => {
		// Defensive: log registration
		console.log(`📊 Registering 3D oscilloscope audio node: ${id}`);
		registerAudioNode(id, 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			triggerLevel: data.triggerLevel ?? 0,
			resolution: data.resolution ?? 512,
		});
		setIsPlaying(true);
		return () => {
			console.log(`🧹 Unregistering 3D oscilloscope audio node: ${id}`);
			unregisterAudioNode(id);
		};
		// Only depend on id and the register/unregister functions
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, registerAudioNode, unregisterAudioNode]);

	// Audio parameter controls
	const [timeWindow, setTimeWindow] = useAudioNodeParam<number>(
		id,
		'timeWindow',
		data.timeWindow ?? 0.1,
		{ min: 0.01, max: 1.0 }
	);
	const [triggerLevel, setTriggerLevel] = useAudioNodeParam<number>(
		id,
		'triggerLevel',
		data.triggerLevel ?? 0,
		{ min: -1, max: 1 }
	);

	// Update node data when parameters change
	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(id, {
			timeWindow,
			triggerLevel,
			audioParams: { timeWindow, triggerLevel },
		});
	}, [id, timeWindow, triggerLevel, updateNode]);

	// Debug: check audio node registration
	useEffect(() => {
		const checkAudioNode = () => {
			const audioNodes = getAudioNode(id) as Tone.ToneAudioNode[];
			console.log(`🔍 Debug - Audio node check for ${id}:`, {
				exists: !!audioNodes,
				isArray: Array.isArray(audioNodes),
				length: audioNodes?.length,
				passThrough: audioNodes?.[0]?.constructor?.name,
				analyzer: audioNodes?.[1]?.constructor?.name,
			});
		};
		checkAudioNode();
		let checkCount = 0;
		const interval = setInterval(() => {
			checkCount++;
			checkAudioNode();
			if (checkCount >= 5) clearInterval(interval);
		}, 2000);
		return () => clearInterval(interval);
	}, [id, getAudioNode]);

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='3D Oscilloscope'
			variant='signal'
		>
			{' '}
			{/* 3D Waveform Display */}
			<div className='bg-node-secondary rounded overflow-hidden border border-node'>
				{/* Canvas Container with grid-aligned sizing */}
				<div
					className='bg-black r3f-canvas-container'
					style={{
						width: 'var(--spacing-grid-8)', // 512px
						height: 'var(--spacing-grid-8)', // 512px
					}}
				>
					<Canvas
						style={{ width: '100%', height: '100%' }}
						orthographic
						camera={{
							position: [0, 0, 5],
							zoom: 80,
							near: 0.1,
							far: 1000,
						}}
						dpr={Math.min(window.devicePixelRatio || 1, 2)}
						frameloop='always'
						onCreated={({ gl, camera }) => {
							gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
							camera.updateProjectionMatrix();
						}}
					>
						<ambientLight intensity={1.0} />
						<Waveform3D
							nodeId={id}
							triggerLevel={triggerLevel}
							isSelected={selected}
						/>
					</Canvas>
				</div>
				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
							}`}
							aria-label={isPlaying ? 'Signal active' : 'No input'}
						/>
						<span className='text-node-secondary'>
							{isPlaying ? '3D SIGNAL' : 'NO INPUT'}
						</span>
					</div>
					<span className='text-node-secondary opacity-70'>
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
					showValue
					formatValue={(val: number) => `${(val * 1000).toFixed(0)}ms`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setTimeWindow(Number(e.target.value))
					}
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
					showValue
					formatValue={(val: number) => `${(val * 100).toFixed(0)}%`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setTriggerLevel(Number(e.target.value))
					}
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
