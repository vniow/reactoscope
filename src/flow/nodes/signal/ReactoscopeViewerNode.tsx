/**
 * 3D XYRGB Scope Node Component
 *
 * Renders RGB-coloured waveform lines in 3D using custom GPU shaders.
 * Registers five Tone.Analyser nodes (X, Y, R, G, B) and displays
 * geometry with positions driven by X/Y and colour by R/G/B.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as Tone from 'tone';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { useAppStore } from '../../../shared/stores/appStore';
import RGBWaveformLines from './RGBWaveformLines';
import { GridControl } from '../../../shared/components/ui/GridControl';
import type { BaseNodeData } from '../types';
import { PersistencePass } from './PersistencePass';
import { CRTBarrelDistortionPass } from './CRTBarrelDistortionPass';

interface ReactoscopeViewerNodeData extends BaseNodeData {
	inputX?: string;
	inputY?: string;
	inputZ?: string;
	inputR?: string;
	inputG?: string;
	inputB?: string;
}

/**
 * ReactoscopeViewerNode
 *
 * 3D XYRGB Scope Node Component for Reactoscope
 * - Renders RGB-coloured waveform lines in 3D using custom GPU shaders
 * - Registers five Tone.Analyser nodes (X, Y, R, G, B)
 * - Displays geometry with positions driven by X/Y and colour by R/G/B
 *
 * @param props NodeProps & { data: ReactoscopeViewerNodeData }
 */
function ReactoscopeViewerNode(
	props: NodeProps & { data: ReactoscopeViewerNodeData }
): React.ReactElement {
	const { id, data, selected = false } = props;
	const registerAudioNode = useAppStore((s) => s.registerAudioNode);
	const unregisterAudioNode = useAppStore((s) => s.unregisterAudioNode);
	const updateNode = useAppStore((s) => s.updateNode);
	const getAudioNode = useAppStore((s) => s.getAudioNode);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);
	// Afterglow (trail intensity) state
	const [afterglow, setAfterglow] = useState<number>(1.0);
	const [bloomIntensity, setBloomIntensity] = useState<number>(1.5);
	const [bloomThreshold, setBloomThreshold] = useState<number>(0.05); // Lower threshold for more bloom
	const [lineIntensity, setLineIntensity] = useState<number>(1.0); // For debugging bloom
	const [persistenceDecay, setPersistenceDecay] = useState<number>(0.95);
	const [crtStrength, setCRTStrength] = useState<number>(0.2);
	// Luminance control (0-2, default 1.0)
	const [luminance, setLuminance] = useState<number>(1.0);
	const [flipY, setFlipY] = useState<boolean>(true);
	const [flipX, setFlipX] = useState<boolean>(true);

	// Track previous input IDs for each channel
	const prevInputsRef = useRef<ReactoscopeViewerNodeData>({
		inputX: data.inputX,
		inputY: data.inputY,
		inputZ: data.inputZ,
		inputR: data.inputR,
		inputG: data.inputG,
		inputB: data.inputB,
	});

	/**
	 * Flushes a Tone.Analyser buffer by filling it with NaN
	 * @param analyser Tone.Analyser instance
	 */
	function flushAnalyser(analyser?: Tone.Analyser): void {
		if (!analyser) return;
		const arr = analyser.getValue() as Float32Array;
		for (let i = 0; i < arr.length; i++) {
			arr[i] = NaN;
		}
	}

	// Effect: flush analyser when a new input connection is made
	useEffect(() => {
		const prev = prevInputsRef.current;
		if (data.inputX !== prev.inputX) flushAnalyser(analyserX);
		if (data.inputY !== prev.inputY) flushAnalyser(analyserY);
		if (data.inputZ !== prev.inputZ) flushAnalyser(analyserZ);
		if (data.inputR !== prev.inputR) flushAnalyser(analyserR);
		if (data.inputG !== prev.inputG) flushAnalyser(analyserG);
		if (data.inputB !== prev.inputB) flushAnalyser(analyserB);
		prevInputsRef.current = {
			inputX: data.inputX,
			inputY: data.inputY,
			inputZ: data.inputZ,
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		data.inputX,
		data.inputY,
		data.inputZ,
		data.inputR,
		data.inputG,
		data.inputB,
	]);

	useEffect(() => {
		['x', 'y', 'z', 'r', 'g', 'b'].forEach((ch) =>
			registerAudioNode(`${id}:${ch}`, 'oscilloscope', { resolution: 512 })
		);
		setIsPlaying(true);
		return () => {
			['x', 'y', 'z', 'r', 'g', 'b'].forEach((ch) =>
				unregisterAudioNode(`${id}:${ch}`)
			);
		};
	}, [id, registerAudioNode, unregisterAudioNode]);

	useEffect(() => {
		updateNode(id, {
			inputX: data.inputX,
			inputY: data.inputY,
			inputZ: data.inputZ,
			inputR: data.inputR,
			inputG: data.inputG,
			inputB: data.inputB,
		});
	}, [
		id,
		data.inputX,
		data.inputY,
		data.inputZ,
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
	const audioZ = getAudioNode(data.inputZ || `${id}:z`);
	const analyserZ = Array.isArray(audioZ)
		? (audioZ[1] as Tone.Analyser)
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

	// Debug: get Z analyser data
	let zStats = null;
	if (analyserZ) {
		const zData = analyserZ.getValue() as Float32Array;
		if (zData && zData.length > 0) {
			const min = Math.min(...zData);
			const max = Math.max(...zData);
			const mean = zData.reduce((a, b) => a + b, 0) / zData.length;
			zStats = { min, max, mean, sample: zData.slice(0, 32) };
		}
	}

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='Reactoscope Viewer'
			variant='signal'
		>
			{/* Debug Z panel */}
			{zStats && (
				<div className='bg-black text-green-400 text-xs p-2 rounded mb-2'>
					<div>
						Z axis: min={zStats.min.toFixed(2)} max={zStats.max.toFixed(2)}{' '}
						mean={zStats.mean.toFixed(2)}
					</div>
					<div
						style={{
							fontFamily: 'monospace',
							overflowX: 'auto',
							whiteSpace: 'nowrap',
						}}
					>
						{/* Simple sparkline: render as string */}
						{zStats.sample.map((v) => Math.round((v + 1) * 4)).join('')}
					</div>
				</div>
			)}
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
						<EffectComposer>
							<Bloom
								intensity={bloomIntensity}
								luminanceThreshold={bloomThreshold}
								luminanceSmoothing={0.025}
							/>
							<RGBWaveformLines
								analyserX={analyserX}
								analyserY={analyserY}
								analyserZ={analyserZ}
								analyserR={analyserR}
								analyserG={analyserG}
								analyserB={analyserB}
								isPlaying={isPlaying}
								lineIntensity={lineIntensity}
								luminance={luminance}
								flipY={flipY}
								flipX={flipX}
							/>
							<PersistencePass decay={persistenceDecay} />
							<CRTBarrelDistortionPass strength={crtStrength} />
						</EffectComposer>
					</Canvas>
				</div>
				{/* Luminance slider control */}
				<div className='mb-3'>
					<GridControl
						type='slider'
						label='Luminance'
						value={luminance}
						min={0}
						max={2}
						step={0.01}
						variant='node-variant'
						layout='stacked'
						showValue
						formatValue={(val: number) => val.toFixed(2)}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setLuminance(Number(e.target.value))
						}
						className='h-12'
					/>
				</div>
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-primary animate-pulse' : 'bg-muted'}`}
							aria-label={isPlaying ? 'Signal active' : 'No input'}
						/>
						<span className='text-node-secondary'>
							{isPlaying ? 'XYRGB SIGNAL' : 'NO INPUT'}
						</span>
					</div>
				</div>
			</div>
			{/* Effect controls: Afterglow, Bloom, Persistence, CRT, Line Intensity */}
			<div className='mb-4 grid grid-cols-1 gap-2'>
				<GridControl
					type='slider'
					label='Afterglow'
					value={afterglow}
					min={0.1}
					max={2.0}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(2)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setAfterglow(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='slider'
					label='Bloom Intensity'
					value={bloomIntensity}
					min={0.0}
					max={3.0}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(2)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setBloomIntensity(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='slider'
					label='Bloom Threshold'
					value={bloomThreshold}
					min={0.0}
					max={0.5}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(2)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setBloomThreshold(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='slider'
					label='Line Intensity'
					value={lineIntensity}
					min={0.1}
					max={5.0}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(2)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setLineIntensity(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='slider'
					label='Persistence'
					value={persistenceDecay}
					min={0.8}
					max={0.99}
					step={0.001}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(3)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setPersistenceDecay(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='slider'
					label='CRT Distortion'
					value={crtStrength}
					min={0.0}
					max={0.5}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val: number) => val.toFixed(2)}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setCRTStrength(Number(e.target.value))
					}
					className='h-12'
				/>
				<GridControl
					type='toggle'
					label='Flip Y Axis'
					checked={flipY}
					variant='node-variant'
					layout='stacked'
					onChange={(checked: boolean) => setFlipY(checked)}
					className='h-12'
				/>
				<GridControl
					type='toggle'
					label='Flip X Axis'
					checked={flipX}
					variant='node-variant'
					layout='stacked'
					onChange={(checked: boolean) => setFlipX(checked)}
					className='h-12'
				/>
			</div>
			<NodeHandle
				id='inputX'
				type='target'
				position={Position.Left}
				label='X'
				style={{ top: '20%' }}
			/>
			<NodeHandle
				id='inputY'
				type='target'
				position={Position.Left}
				label='Y'
				style={{ top: '32%' }}
			/>
			<NodeHandle
				id='inputZ'
				type='target'
				position={Position.Left}
				label='Z'
				style={{ top: '44%' }}
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
}

export { ReactoscopeViewerNode };
