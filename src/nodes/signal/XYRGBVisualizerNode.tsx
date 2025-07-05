/**
 * XYRGB Visualizer Node Component
 *
 * Signal node that receives XYRGB audio data and visualizes it using Tone.js analyzers.
 * Creates dynamic geometry that responds to the frequency/waveform content of each channel.
 * Each input (X, Y, R, G, B) drives different aspects of the visual representation.
 *
 * Follows Reactoscope guidelines: container/presenter split, explicit types, semantic styling.
 */

import React, { useEffect, useRef } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';
import { useXYRGBAnalyzers } from '../../audio/hooks/useXYRGBAnalyzers';
import { AnalyzerGeometry } from './components/AnalyzerGeometry';
import { useAppStore } from '../../shared/stores/appStore';
import type { BaseNodeData } from '../types';

/**
 * 3D Scene Component with Analyzer Visualization
 */
function Scene3D({
	analyzerData,
}: {
	analyzerData: import('../../audio/hooks/useXYRGBAnalyzers').XYRGBAnalyzerData;
}): React.ReactElement {
	return (
		<>
			{/* Ambient light for visibility */}
			<ambientLight intensity={0.6} />

			{/* Point light for depth */}
			<pointLight
				position={[10, 10, 10]}
				intensity={0.4}
			/>

			{/* Dynamic analyzer geometry */}
			<AnalyzerGeometry
				analyzerData={analyzerData}
				vertexCount={128}
				positionScale={1.5}
				animationSpeed={1.2}
				smoothing={true}
			/>
		</>
	);
}

export function XYRGBVisualizerNode({
	id,
	selected = false,
}: NodeProps & { data: BaseNodeData }): React.ReactElement {
	// Type assertions for props
	const nodeId = id as string;
	const isSelected = selected as boolean;

	// Get audio registry functions
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);

	// Initialize XYRGB analyzers for audio visualization
	const { analyzerData, analyzers, isReady } = useXYRGBAnalyzers(true, {
		fftSize: 1024,
		type: 'waveform',
		updateRate: 60,
	});

	// Track registration status to prevent re-registration
	const registeredRef = useRef<boolean>(false);

	// Register analyzers with the audio system when they're ready
	useEffect(() => {
		if (!isReady || !analyzers || registeredRef.current) return;

		// Check if all analyzers are available
		const channels = ['x', 'y', 'r', 'g', 'b'] as const;
		const allAvailable = channels.every(
			(channel) => analyzers[channel] !== null
		);

		if (!allAvailable) return;

		// Register each analyzer as a separate audio node with suffix
		const registerPromises = channels.map(async (channel) => {
			const analyzer = analyzers[channel];
			if (analyzer) {
				const channelNodeId = `${nodeId}:${channel}`;
				await registerAudioNode(channelNodeId, 'analyzer', {
					node: analyzer,
					type: 'waveform',
					size: 1024,
				});
			}
		});

		Promise.all(registerPromises)
			.then(() => {
				registeredRef.current = true;
			})
			.catch((error) => {
				console.error('Failed to register analyzer nodes:', error);
			});
	}, [nodeId, isReady, analyzers, registerAudioNode]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (registeredRef.current) {
				const channels = ['x', 'y', 'r', 'g', 'b'] as const;
				channels.forEach((channel) => {
					const channelNodeId = `${nodeId}:${channel}`;
					unregisterAudioNode(channelNodeId);
				});
				registeredRef.current = false;
			}
		};
	}, [nodeId, unregisterAudioNode]);

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='XYRGB Visualizer'
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
						frameloop='always'
						onCreated={({ gl, camera }) => {
							gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
							camera.updateProjectionMatrix();
						}}
					>
						<Scene3D analyzerData={analyzerData} />
					</Canvas>
				</div>

				{/* Status indicator */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isReady ? 'bg-green-500' : 'bg-yellow-500'
							}`}
							aria-label={isReady ? 'Ready' : 'Initializing'}
						/>
						<span className='text-node-secondary'>
							{isReady ? 'ANALYZING' : 'INIT...'}
						</span>
					</div>
					<div className='text-xs text-node-muted'>
						{
							Object.keys(analyzers).filter(
								(key) => analyzers[key as keyof typeof analyzers]
							).length
						}
						/5
					</div>
				</div>
			</div>

			{/* Input/Output Handles - 5 channels for X, Y, R, G, B */}
			{/* Input handles only - this is a visualization node */}
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
				style={{ top: '35%' }}
			/>
			<NodeHandle
				id='inputR'
				type='target'
				position={Position.Bottom}
				label='R'
				style={{ left: '25%' }}
			/>
			<NodeHandle
				id='inputG'
				type='target'
				position={Position.Bottom}
				label='G'
				style={{ left: '50%' }}
			/>
			<NodeHandle
				id='inputB'
				type='target'
				position={Position.Bottom}
				label='B'
				style={{ left: '75%' }}
			/>
		</BaseNode>
	);
}
