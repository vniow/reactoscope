/**
 * 3D XYRGB Scope Node Component
 *
 * Real-time XY coordinate visualization with RGB color mapping using React Three Fiber.
 * Accepts five inputs: X, Y coordinates and R, G, B color channels.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling, robust audio node registration.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { GridControl } from '../../shared/components/ui/GridControl';
import { useAudioNodeParam } from '../../audio/hooks/useAudioNodeParam';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface XYRGBScopeNodeData extends BaseNodeData {
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

const XYRGBWaveform3D = React.memo(function XYRGBWaveform3D({
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

	// Pre-allocate buffers for better performance
	const positionsRef = useRef(new Float32Array(resolution * 3));
	const colorsRef = useRef(new Float32Array(resolution * 3));
	const dataRefX = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefY = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefR = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefG = useRef<Float32Array>(new Float32Array(resolution));
	const dataRefB = useRef<Float32Array>(new Float32Array(resolution));

	// Create geometry and material once
	const geometry = useMemo(() => {
		const geom = new THREE.BufferGeometry();
		geom.setAttribute(
			'position',
			new THREE.BufferAttribute(positionsRef.current, 3)
		);
		geom.setAttribute('color', new THREE.BufferAttribute(colorsRef.current, 3));
		return geom;
	}, []);

	const material = useMemo(() => {
		return new THREE.LineBasicMaterial({
			vertexColors: true,
			linewidth: 2,
		});
	}, []);

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

		// Early exit if any analyzer is missing
		if (!analyzerX || !analyzerY || !analyzerR || !analyzerG || !analyzerB) {
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

			// Quick change detection - check a few sample points instead of entire arrays
			const hasChanged =
				Math.abs(xData[0] - dataRefX.current[0]) > 0.01 ||
				Math.abs(xData[len >> 1] - dataRefX.current[len >> 1]) > 0.01 ||
				Math.abs(xData[len - 1] - dataRefX.current[len - 1]) > 0.01;

			if (hasChanged) {
				// Update reference data
				dataRefX.current.set(xData.subarray(0, len));
				dataRefY.current.set(yData.subarray(0, len));
				dataRefR.current.set(rData.subarray(0, len));
				dataRefG.current.set(gData.subarray(0, len));
				dataRefB.current.set(bData.subarray(0, len));

				// Update positions and colors in-place for maximum performance
				const positions = positionsRef.current;
				const colors = colorsRef.current;

				for (let i = 0; i < len; i++) {
					const i3 = i * 3;

					// Positions
					positions[i3] = xData[i] * 2; // X
					positions[i3 + 1] = yData[i] * 2; // Y
					positions[i3 + 2] = 0; // Z

					// Colors (mapped from -1,1 to 0,1)
					colors[i3] = Math.max(0, Math.min(1, (rData[i] + 1) * 0.5)); // R
					colors[i3 + 1] = Math.max(0, Math.min(1, (gData[i] + 1) * 0.5)); // G
					colors[i3 + 2] = Math.max(0, Math.min(1, (bData[i] + 1) * 0.5)); // B
				}

				// Update geometry attributes
				geometry.attributes.position.needsUpdate = true;
				geometry.attributes.color.needsUpdate = true;
				geometry.setDrawRange(0, len);
			}
		} catch (e) {
			console.warn('Error reading analyzer data:', e);
		}
	});

	return <primitive object={new THREE.Line(geometry, material)} />;
});

export const XYRGBScope3DNode = React.memo(function XYRGBScope3DNode({
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
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':y', 'oscilloscope', {
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':r', 'oscilloscope', {
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':g', 'oscilloscope', {
			resolution: data.resolution ?? 512,
		});
		registerAudioNode(id + ':b', 'oscilloscope', {
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
	}, [id, registerAudioNode, unregisterAudioNode, data.resolution]);

	const [resolution, setResolution] = useAudioNodeParam<number>(
		id,
		'resolution',
		data.resolution ?? 512,
		{ min: 128, max: 2048 }
	);

	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(id, {
			resolution,
			inputX: data.inputX,
			inputY: data.inputY,
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
			audioParams: { resolution },
		});
	}, [
		id,
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
						camera={{ position: [0, 0, 5], fov: 50 }}
						dpr={Math.min(window.devicePixelRatio || 1, 2)}
						frameloop={isPlaying ? 'always' : 'demand'}
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
				</div>
			</div>

			{/* Controls */}
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
});
