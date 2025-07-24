import { Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';
import { useSixChannelNoiseWorklet } from '../../../audio/hooks/useSixChannelNoiseWorklet';
import { useAppStore } from '../../../shared/stores/appStore';
import type { BaseNodeData } from '../types';
import { Canvas } from '@react-three/fiber';
import { TriangleShape, SquareShape } from '../../../shared/shapes/BasicShapes';

// ...existing code...

interface SixChannelNoiseGeneratorNodeData extends BaseNodeData {
	amplitude?: number;
	isPlaying?: boolean;
	activeChannels?: boolean[];
}

export function SixChannelNoiseGeneratorNode({
	id,
	data,
	selected = false,
}: NodeProps & { data: SixChannelNoiseGeneratorNodeData }) {
	const nodeId = id as string;
	const nodeData = data as SixChannelNoiseGeneratorNodeData;
	const isSelected = selected as boolean;

	const {
		isReady,
		isPlaying,
		amplitude,
		activeChannels,
		start,
		stop,
		setAmplitude,
		setActiveChannels,
		noiseNode,
	} = useSixChannelNoiseWorklet({ debug: true });

	const updateNode = useAppStore((state) => state.updateNode);

	// register base metadata
	useEffect(() => {
		updateNode(nodeId, {
			nodeType: 'custom-worklet',
			workletType: 'six-channel-noise-generator',
			label: nodeData.label || 'Noise Generator 6ch',
		});
	}, [nodeId, updateNode, nodeData.label]);

	// update dynamic state
	useEffect(() => {
		if (isReady) {
			updateNode(nodeId, { amplitude, isPlaying, activeChannels });
		}
	}, [nodeId, updateNode, amplitude, isPlaying, activeChannels, isReady]);

	// register audio outputs and main node
	useEffect(() => {
		if (isReady && noiseNode) {
			const register = useAppStore.getState().registerAudioNode;
			const unregister = useAppStore.getState().unregisterAudioNode;
			// Register multi-channel outputs; connection logic maps handleId to array index
			register(nodeId, 'custom-noise', { node: noiseNode.outputs });
			return () => {
				unregister(nodeId);
			};
		}
	}, [isReady, noiseNode, nodeId]);

	const handleAmplitudeChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setAmplitude(parseFloat(event.target.value));
	};

	const handleChannelToggle = (idx: number) => (checked: boolean) => {
		const newChannels = [...activeChannels];
		newChannels[idx] = checked;
		setActiveChannels(newChannels);
	};

	const handleAllToggle = (checked: boolean) => {
		setActiveChannels(Array(6).fill(checked));
	};

	// track connections for handle status
	const edges = useAppStore((state) => state.edges);

	// Add rotation state for each shape
	const [triangleRotation, setTriangleRotation] = useState(0);
	const [squareRotation, setSquareRotation] = useState(0);

	// ...existing code...

	return (
		<BaseNode
			nodeId={nodeId}
			selected={isSelected}
			title='Noise Generator (6ch)'
			variant='source'
		>
			{/* Rotation controls using GridControl */}
			<div className='mb-3 flex gap-4'>
				<GridControl
					type='slider'
					label='Triangle Rotation'
					value={triangleRotation}
					min={0}
					max={360}
					step={1}
					showValue
					formatValue={val => `${val}°`}
					onChange={e => setTriangleRotation(Number(e.target.value))}
					variant='node-variant'
					layout='stacked'
					className='flex-1'
				/>
				<GridControl
					type='slider'
					label='Square Rotation'
					value={squareRotation}
					min={0}
					max={360}
					step={1}
					showValue
					formatValue={val => `${val}°`}
					onChange={e => setSquareRotation(Number(e.target.value))}
					variant='node-variant'
					layout='stacked'
					className='flex-1'
				/>
			</div>
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
						<TriangleShape
							lineWidth={2}
							rotation={[0, 0, triangleRotation * Math.PI / 180]}
						/>
						<SquareShape
							lineWidth={2}
							rotation={[0, 0, squareRotation * Math.PI / 180]}
						/>
					</Canvas>
				</div>
			</div>
			<div className='mb-3'>
				<GridControl
					type='toggle'
					checked={isPlaying}
					toggleLabel={isPlaying ? 'Stop' : 'Play'}
					onChange={(checked) => (checked ? start() : stop())}
					variant='node-variant'
					layout='stacked'
					disabled={!isReady}
					className='h-16'
				/>
			</div>

			<div className='mb-3'>
				<GridControl
					type='slider'
					label='Amplitude'
					value={amplitude}
					min={0}
					max={1}
					step={0.01}
					variant='node-variant'
					layout='stacked'
					showValue
					formatValue={(val) => `${Math.round(val * 100)}%`}
					onChange={handleAmplitudeChange}
					disabled={!isReady}
					className='h-16'
				/>
			</div>

			<div className='mb-3 grid grid-cols-4 gap-2'>
				{activeChannels.map((ch, idx) => (
					<GridControl
						key={idx}
						type='toggle'
						checked={ch}
						toggleLabel={`Ch ${idx + 1}`}
						onChange={handleChannelToggle(idx)}
						variant='node-variant'
						layout='stacked'
						disabled={!isReady}
					/>
				))}
				<GridControl
					type='toggle'
					checked={activeChannels.every(Boolean)}
					toggleLabel='All'
					onChange={handleAllToggle}
					variant='node-variant'
					layout='stacked'
					disabled={!isReady}
				/>
			</div>

			<div className='mb-3 p-2 bg-node-secondary rounded text-xs'>
				<div className='space-y-1 text-node-secondary'>
					<div>Ready: {isReady ? '✅' : '❌'}</div>
					<div>Playing: {isPlaying ? '✅' : '❌'}</div>
					<div>Amplitude: {amplitude.toFixed(3)}</div>
					<div>
						Channels:{' '}
						{activeChannels
							.map((c, i) => (c ? i + 1 : null))
							.filter(Boolean)
							.join(', ') || 'none'}
					</div>
				</div>
			</div>

			{[0,1,2,3,4,5].map((idx) => {
				const handleId = `output-${idx + 1}`;
				const connectionStatus = edges.some(
					(edge) => edge.source === nodeId && edge.sourceHandle === handleId
				)
					? 'connected'
					: 'default';
				return (
					<NodeHandle
						key={idx}
						id={handleId}
						type='source'
						position={Position.Right}
						label={`Out ${idx + 1}`}
						style={{
							top: `${((idx + 1) / 7) * 100}%`, // 6 handles, so 7 for spacing
						}}
						connectionStatus={connectionStatus}
					/>
				);
			})}
		</BaseNode>
	);
}
