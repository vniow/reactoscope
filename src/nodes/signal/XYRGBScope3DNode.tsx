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
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

interface XYRGBScopeNodeData extends BaseNodeData {
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
}: {
	nodeIdX: string;
	nodeIdY: string;
	nodeIdR: string;
	nodeIdG: string;
	nodeIdB: string;
}): React.ReactElement {
	const getAudioNode = useAppStore((state) => state.getAudioNode);

	// Dynamic buffer references - will resize based on analyzer data
	const positionsRef = useRef<Float32Array>(new Float32Array(0));
	const colorsRef = useRef<Float32Array>(new Float32Array(0));
	const geometryRef = useRef<THREE.BufferGeometry | null>(null);
	const currentPointCount = useRef<number>(0);

	// Create geometry and material once, update buffers dynamically
	const geometry = useMemo(() => {
		const geom = new THREE.BufferGeometry();
		geometryRef.current = geom;
		return geom;
	}, []);

	const material = useMemo(() => {
		return new THREE.PointsMaterial({
			vertexColors: true,
			size: 2,
			sizeAttenuation: false,
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

			// Use the full length of analyzer data - no artificial limits
			const len = Math.min(
				xData.length,
				yData.length,
				rData.length,
				gData.length,
				bData.length
			);

			// Resize buffers if needed
			if (positionsRef.current.length < len * 3) {
				positionsRef.current = new Float32Array(len * 3);
				colorsRef.current = new Float32Array(len * 3);
				currentPointCount.current = len;

				// Update geometry attributes with new buffers
				geometry.setAttribute(
					'position',
					new THREE.BufferAttribute(positionsRef.current, 3)
				);
				geometry.setAttribute(
					'color',
					new THREE.BufferAttribute(colorsRef.current, 3)
				);
			}

			// Update positions and colors for all analyzer samples
			const positions = positionsRef.current;
			const colors = colorsRef.current;

			for (let i = 0; i < len; i++) {
				const i3 = i * 3;

				// Positions - map analyzer data to 3D coordinates
				positions[i3] = xData[i] * 2; // X
				positions[i3 + 1] = yData[i] * 2; // Y
				positions[i3 + 2] = 0; // Z (keep flat for now)

				// Colors - map from [-1,1] to [0,1] range
				colors[i3] = Math.max(0, Math.min(1, (rData[i] + 1) * 0.5)); // R
				colors[i3 + 1] = Math.max(0, Math.min(1, (gData[i] + 1) * 0.5)); // G
				colors[i3 + 2] = Math.max(0, Math.min(1, (bData[i] + 1) * 0.5)); // B
			}

			// Update geometry attributes
			if (geometry.attributes.position) {
				geometry.attributes.position.needsUpdate = true;
			}
			if (geometry.attributes.color) {
				geometry.attributes.color.needsUpdate = true;
			}

			// Set draw range to current data length
			geometry.setDrawRange(0, len);
		} catch (e) {
			console.warn('Error reading analyzer data:', e);
		}
	});

	return <primitive object={new THREE.Points(geometry, material)} />;
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
			resolution: 512,
		});
		registerAudioNode(id + ':y', 'oscilloscope', {
			resolution: 512,
		});
		registerAudioNode(id + ':r', 'oscilloscope', {
			resolution: 512,
		});
		registerAudioNode(id + ':g', 'oscilloscope', {
			resolution: 512,
		});
		registerAudioNode(id + ':b', 'oscilloscope', {
			resolution: 512,
		});
		setIsPlaying(true);

		return () => {
			unregisterAudioNode(id + ':x');
			unregisterAudioNode(id + ':y');
			unregisterAudioNode(id + ':r');
			unregisterAudioNode(id + ':g');
			unregisterAudioNode(id + ':b');
		};
	}, [id, registerAudioNode, unregisterAudioNode]);

	const updateNode = useAppStore((state) => state.updateNode);
	useEffect(() => {
		updateNode(id, {
			inputX: data.inputX,
			inputY: data.inputY,
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
		});
	}, [
		id,
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
