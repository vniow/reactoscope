/**
 * 3D XYscope Node Component
 *
 * Real-time XY (Lissajous) visualization using React Three Fiber.
 * Accepts two inputs (X and Y), each with its own analyzer.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling, robust audio node registration.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface XYscopeNodeData extends BaseNodeData {
	/** Time window in seconds (0.01 - 1.0) */
	timeWindow?: number;
	/** Resolution (number of samples, default 512) */
	resolution?: number;
	/** Node ID for X input (for registry lookup) */
	inputX?: string;
	/** Node ID for Y input (for registry lookup) */
	inputY?: string;
}

function XYWaveform3D({
	nodeIdX,
	nodeIdY,
	isSelected,
	resolution = 512,
}: {
	nodeIdX: string;
	nodeIdY: string;
	isSelected: boolean;
	resolution?: number;
}): React.ReactElement {
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	const [points, setPoints] = useState<[number, number, number][]>(() =>
		Array.from({ length: resolution }, () => [0, 0, 0])
	);
	const dataRefX = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefY = useRef<Float32Array>(new Float32Array(resolution));

	useFrame(() => {
		const analyzerX = (
			getAudioNode(nodeIdX) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		const analyzerY = (
			getAudioNode(nodeIdY) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		if (!analyzerX || !analyzerY) {
			if (
				dataRefX.current.some((v) => v !== 0) ||
				dataRefY.current.some((v) => v !== 0)
			) {
				dataRefX.current.fill(0);
				dataRefY.current.fill(0);
				setPoints(Array.from({ length: resolution }, () => [0, 0, 0]));
			}
			return;
		}
		try {
			const xData = analyzerX.getValue() as Float32Array;
			const yData = analyzerY.getValue() as Float32Array;
			const len = Math.min(xData.length, yData.length, resolution);
			if (
				xData.some((v, i) => Math.abs(v - dataRefX.current[i]) > 0.01) ||
				yData.some((v, i) => Math.abs(v - dataRefY.current[i]) > 0.01)
			) {
				dataRefX.current.set(xData.subarray(0, len));
				dataRefY.current.set(yData.subarray(0, len));
				setPoints(
					Array.from({ length: len }, (_, i) => [xData[i] * 2, yData[i] * 2, 0])
				);
			}
		} catch (e) {
			console.warn('Error reading analyzer data:', e);
		}
	});

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
		</group>
	);
}

export function XYscope3DNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: XYscopeNodeData }): React.ReactElement {
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);

	useEffect(() => {
		registerAudioNode(id + ':x', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':y', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		setIsPlaying(true);
		return () => {
			unregisterAudioNode(id + ':x');
			unregisterAudioNode(id + ':y');
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, registerAudioNode, unregisterAudioNode]);

	const [timeWindow, setTimeWindow] = useAudioNodeParam<number>(
		id,
		'timeWindow',
		data.timeWindow ?? 0.1,
		{ min: 0.01, max: 1.0 }
	);
	const [resolution, setResolution] = useAudioNodeParam<number>(
		id,
		'resolution',
		data.resolution ?? 512,
		{ min: 128, max: 2048 }
	);

	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(id, {
			timeWindow,
			resolution,
			inputX: data.inputX,
			inputY: data.inputY,
			audioParams: { timeWindow, resolution },
		});
	}, [id, timeWindow, resolution, data.inputX, data.inputY, updateNode]);

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='3D XYscope'
			variant='signal'
		>
			{' '}
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
						orthographic
						camera={{ position: [0, 0, 5], zoom: 80, near: 0.1, far: 1000 }}
						dpr={Math.min(window.devicePixelRatio || 1, 2)}
						frameloop='always'
						onCreated={({ gl, camera }) => {
							gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
							camera.updateProjectionMatrix();
						}}
					>
						<ambientLight intensity={1.0} />
						<XYWaveform3D
							nodeIdX={data.inputX || id + ':x'}
							nodeIdY={data.inputY || id + ':y'}
							isSelected={selected}
							resolution={resolution}
						/>{' '}
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
							{isPlaying ? 'XY SIGNAL' : 'NO INPUT'}
						</span>
					</div>
					<span className='text-node-secondary opacity-70'>
						{(timeWindow * 1000).toFixed(0)}ms
					</span>
				</div>
			</div>
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
			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Resolution'
					value={resolution}
					min={128}
					max={2048}
					step={1}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => `${val} samples`}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setResolution(Number(e.target.value))
					}
					className='h-12'
				/>
			</div>
			<NodeHandle
				id='inputX'
				type='target'
				position={Position.Left}
				label='X'
				style={{ top: '35%' }}
			/>
			<NodeHandle
				id='inputY'
				type='target'
				position={Position.Left}
				label='Y'
				style={{ top: '65%' }}
			/>
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
