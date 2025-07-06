/**
 * 3D XYRGB Scope Node Component
 *
 * Renders RGB-coloured waveform lines in 3D using custom GPU shaders.
 * Registers five Tone.Analyser nodes (X, Y, R, G, B) and displays
 * geometry with positions driven by X/Y and colour by R/G/B.
 */

import React, { useEffect, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import * as Tone from 'tone';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { useAppStore } from '../../shared/stores/appStore';
import RGBWaveformLines from './RGBWaveformLines';
import type { BaseNodeData } from '../types';

interface XYRGBScopeNodeData extends BaseNodeData {
	inputX?: string;
	inputY?: string;
	inputR?: string;
	inputG?: string;
	inputB?: string;
}

export const XYRGBScope3DNode: React.FC<
	NodeProps & { data: XYRGBScopeNodeData }
> = ({ id, data, selected = false }) => {
	const registerAudioNode = useAppStore((s) => s.registerAudioNode);
	const unregisterAudioNode = useAppStore((s) => s.unregisterAudioNode);
	const updateNode = useAppStore((s) => s.updateNode);
	const getAudioNode = useAppStore((s) => s.getAudioNode);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		['x', 'y', 'r', 'g', 'b'].forEach((ch) =>
			registerAudioNode(`${id}:${ch}`, 'oscilloscope', { resolution: 512 })
		);
		setIsPlaying(true);
		return () => {
			['x', 'y', 'r', 'g', 'b'].forEach((ch) =>
				unregisterAudioNode(`${id}:${ch}`)
			);
		};
	}, [id, registerAudioNode, unregisterAudioNode]);

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

	// Safely extract the Analyser node from the stored ToneAudioNode array
	const audioX = getAudioNode(data.inputX || `${id}:x`);
	const analyserX = Array.isArray(audioX)
		? (audioX[1] as Tone.Analyser)
		: undefined;
	const audioY = getAudioNode(data.inputY || `${id}:y`);
	const analyserY = Array.isArray(audioY)
		? (audioY[1] as Tone.Analyser)
		: undefined;
	const audioR = getAudioNode(data.inputR || `${id}:r`);
	const analyserR = Array.isArray(audioR)
		? (audioR[1] as Tone.Analyser)
		: undefined;
	const audioG = getAudioNode(data.inputG || `${id}:g`);
	const analyserG = Array.isArray(audioG)
		? (audioG[1] as Tone.Analyser)
		: undefined;
	const audioB = getAudioNode(data.inputB || `${id}:b`);
	const analyserB = Array.isArray(audioB)
		? (audioB[1] as Tone.Analyser)
		: undefined;

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='XYRGB Scope'
			variant='signal'
		>
			<div className='bg-node-secondary rounded overflow-hidden border border-node'>
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
						<RGBWaveformLines
							analyserX={analyserX}
							analyserY={analyserY}
							analyserR={analyserR}
							analyserG={analyserG}
							analyserB={analyserB}
							isPlaying={isPlaying}
						/>
					</Canvas>
				</div>
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
							aria-label={isPlaying ? 'Signal active' : 'No input'}
						/>
						<span className='text-node-secondary'>
							{isPlaying ? 'XYRGB SIGNAL' : 'NO INPUT'}
						</span>
					</div>
				</div>
			</div>
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
			<NodeHandle
				id='output'
				type='source'
				position={Position.Bottom}
				label='Out'
				style={{ left: '50%' }}
			/>
		</BaseNode>
	);
};
