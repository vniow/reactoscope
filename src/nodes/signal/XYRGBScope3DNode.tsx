/**
 * 3D XYRGB Scope Node Component
 *
 * Real-time XY coordinate visualization with RGB color mapping using React Three Fiber.
 * Accepts five inputs: X, Y coordinates and R, G, B color channels.
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

interface XYRGBScopeNodeData extends BaseNodeData {
	/** Time window in seconds (0.01 - 1.0) */
	timeWindow?: number;
	/** Resolution (number of samples, default 512) */
	resolution?: number;
	/** Node ID for X input (for registry lookup) */
	inputX?: string;
	/** Node ID for Y input (for registry lookup) */
	inputY?: string;
	/** Node ID for R input (for registry lookup) */
	inputR?: string;
	/** Node ID for G input (for registry lookup) */
	inputG?: string;
	/** Node ID for B input (for registry lookup) */
	inputB?: string;
}

function XYRGBWaveform3D({
	nodeIdX,
	nodeIdY,
	nodeIdR,
	nodeIdG,
	nodeIdB,
	resolution = 512,
}: {
	nodeIdX: string;
	nodeIdY: string;
	nodeIdR: string;
	nodeIdG: string;
	nodeIdB: string;
	resolution?: number;
}): React.ReactElement {
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	const [points, setPoints] = useState<[number, number, number][]>(() =>
		Array.from({ length: resolution }, () => [0, 0, 0])
	);
	const [colors, setColors] = useState<[number, number, number][]>(() =>
		Array.from({ length: resolution }, () => [0.5, 0.5, 0.5])
	);

	const dataRefX = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefY = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefR = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefG = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefB = useRef<Float32Array>(new Float32Array(resolution));

	useFrame(() => {
		const analyzerX = (
			getAudioNode(nodeIdX) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		const analyzerY = (
			getAudioNode(nodeIdY) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		const analyzerR = (
			getAudioNode(nodeIdR) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		const analyzerG = (
			getAudioNode(nodeIdG) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;
		const analyzerB = (
			getAudioNode(nodeIdB) as Tone.ToneAudioNode[] | null
		)?.[1] as Tone.Analyser | undefined;

		// Check if all analyzers are available
		if (!analyzerX || !analyzerY || !analyzerR || !analyzerG || !analyzerB) {
			// Clear data if any analyzer is missing
			if (
				dataRefX.current.some((v) => v !== 0) ||
				dataRefY.current.some((v) => v !== 0) ||
				dataRefR.current.some((v) => v !== 0) ||
				dataRefG.current.some((v) => v !== 0) ||
				dataRefB.current.some((v) => v !== 0)
			) {
				dataRefX.current.fill(0);
				dataRefY.current.fill(0);
				dataRefR.current.fill(0);
				dataRefG.current.fill(0);
				dataRefB.current.fill(0);
				setPoints(Array.from({ length: resolution }, () => [0, 0, 0]));
				setColors(Array.from({ length: resolution }, () => [0.5, 0.5, 0.5]));
			}
			return;
		}

		try {
			const xData = analyzerX.getValue() as Float32Array;
			const yData = analyzerY.getValue() as Float32Array;
			const rData = analyzerR.getValue() as Float32Array;
			const gData = analyzerG.getValue() as Float32Array;
			const bData = analyzerB.getValue() as Float32Array;

			const len = Math.min(
				xData.length,
				yData.length,
				rData.length,
				gData.length,
				bData.length,
				resolution
			);

			// Check if any data has changed significantly
			const hasChanged =
				xData.some((v, i) => Math.abs(v - dataRefX.current[i]) > 0.01) ||
				yData.some((v, i) => Math.abs(v - dataRefY.current[i]) > 0.01) ||
				rData.some((v, i) => Math.abs(v - dataRefR.current[i]) > 0.01) ||
				gData.some((v, i) => Math.abs(v - dataRefG.current[i]) > 0.01) ||
				bData.some((v, i) => Math.abs(v - dataRefB.current[i]) > 0.01);

			if (hasChanged) {
				// Update reference data
				dataRefX.current.set(xData.subarray(0, len));
				dataRefY.current.set(yData.subarray(0, len));
				dataRefR.current.set(rData.subarray(0, len));
				dataRefG.current.set(gData.subarray(0, len));
				dataRefB.current.set(bData.subarray(0, len));

				// Update positions (XY coordinates)
				setPoints(
					Array.from({ length: len }, (_, i) => [
						xData[i] * 2, // X: -2 to 2
						yData[i] * 2, // Y: -2 to 2
						0, // Z: flat plane
					])
				);

				// Update colors (RGB values mapped from -1,1 to 0,1)
				setColors(
					Array.from({ length: len }, (_, i) => [
						Math.max(0, Math.min(1, (rData[i] + 1) / 2)), // R: 0 to 1
						Math.max(0, Math.min(1, (gData[i] + 1) / 2)), // G: 0 to 1
						Math.max(0, Math.min(1, (bData[i] + 1) / 2)), // B: 0 to 1
					])
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
			{/* Render colored line segments */}
			{points.length > 1 && (
				<>
					{points.slice(0, -1).map((point, i) => {
						const nextPoint = points[i + 1];
						const color = colors[i];
						const nextColor = colors[i + 1];
						// Average the colors for smooth transitions
						const avgColor = [
							(color[0] + nextColor[0]) / 2,
							(color[1] + nextColor[1]) / 2,
							(color[2] + nextColor[2]) / 2,
						];

						return (
							<Line
								key={i}
								points={[point, nextPoint]}
								color={`rgb(${Math.floor(avgColor[0] * 255)}, ${Math.floor(avgColor[1] * 255)}, ${Math.floor(avgColor[2] * 255)})`}
								lineWidth={2}
							/>
						);
					})}
				</>
			)}
		</group>
	);
}

export function XYRGBScope3DNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: XYRGBScopeNodeData }): React.ReactElement {
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);

	useEffect(() => {
		// Register 5 independent analyzers for X, Y, R, G, B
		registerAudioNode(id + ':x', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':y', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':r', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':g', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':b', 'oscilloscope', {
			timeWindow: data.timeWindow ?? 0.1,
			resolution: data.resolution ?? 512,
		});
		setIsPlaying(true);

		return () => {
			unregisterAudioNode(id + ':x');
			unregisterAudioNode(id + ':y');
			unregisterAudioNode(id + ':r');
			unregisterAudioNode(id + ':g');
			unregisterAudioNode(id + ':b');
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
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
			audioParams: { timeWindow, resolution },
		});
	}, [
		id,
		timeWindow,
		resolution,
		data.inputX,
		data.inputY,
		data.inputR,
		data.inputG,
		data.inputB,
		updateNode,
	]);

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='XYRGB Scope'
			variant='signal'
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
						<XYRGBWaveform3D
							nodeIdX={data.inputX || id + ':x'}
							nodeIdY={data.inputY || id + ':y'}
							nodeIdR={data.inputR || id + ':r'}
							nodeIdG={data.inputG || id + ':g'}
							nodeIdB={data.inputB || id + ':b'}
							resolution={resolution}
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
							{isPlaying ? 'XYRGB SIGNAL' : 'NO INPUT'}
						</span>
					</div>
					<span className='text-node-secondary opacity-70'>
						{(timeWindow * 1000).toFixed(0)}ms
					</span>
				</div>
			</div>

			{/* Controls */}
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

			{/* Input Handles - Left side for coordinates */}
			<NodeHandle
				id='inputX'
				type='target'
				position={Position.Left}
				label='X'
				style={{ top: '25%' }}
			/>
			<NodeHandle
				id='inputY'
				type='target'
				position={Position.Left}
				label='Y'
				style={{ top: '40%' }}
			/>

			{/* Input Handles - Right side for colors */}
			<NodeHandle
				id='inputR'
				type='target'
				position={Position.Right}
				label='R'
				style={{ top: '25%' }}
			/>
			<NodeHandle
				id='inputG'
				type='target'
				position={Position.Right}
				label='G'
				style={{ top: '40%' }}
			/>
			<NodeHandle
				id='inputB'
				type='target'
				position={Position.Right}
				label='B'
				style={{ top: '55%' }}
			/>

			{/* Output Handle */}
			<NodeHandle
				id='output'
				type='source'
				position={Position.Bottom}
				label='Out'
				style={{ left: '50%' }}
			/>
		</BaseNode>
	);
}
