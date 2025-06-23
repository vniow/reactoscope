import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';

import '@xyflow/react/dist/base.css';
import 'tailwindcss';

import { nodeTypes } from './nodes';
import { edgeTypes } from './flow/edges';
import { useStore } from './shared/stores/useStore';
import { debugAudioRegistry } from './audio/stores/audioSlice';

export default function App() {
	const nodes = useStore((state) => state.nodes);
	const edges = useStore((state) => state.edges);
	const onNodesChange = useStore((state) => state.onNodesChange);
	const onEdgesChange = useStore((state) => state.onEdgesChange);
	const onConnect = useStore((state) => state.onConnect);
	const addNode = useStore((state) => state.addNode);
	const addOscillatorDestinationPair = useStore(
		(state) => state.addOscillatorDestinationPair
	);
	const addMultiOscillator = useStore((state) => state.addMultiOscillator);
	const addOscilloscope = useStore((state) => state.addOscilloscope);

	const handleAddOscillator = () => {
		addNode('oscillator', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddDestination = () => {
		addNode('destination', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddOscDestPair = () => {
		addOscillatorDestinationPair();
	};

	const handleAddMultiOscillator = () => {
		addMultiOscillator();
	};

	const handleAddOscilloscope = () => {
		addOscilloscope();
	};

	const handleAddSimpleOsc = () => {
		addNode('simpleosc', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddSimpleXY = () => {
		addNode('simplexy', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddNoiseGenerator = () => {
		addNode('noisegen', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddThreeFiber = () => {
		addNode('threefiber', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleDebug = () => {
		debugAudioRegistry();
	};

	return (
		<div style={{ width: '100vw', height: '100vh' }}>
			<div
				style={{
					position: 'absolute',
					top: 10,
					left: 10,
					zIndex: 4,
					background: 'white',
					padding: '10px',
					borderRadius: '8px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				}}
			>
				<button
					onClick={handleAddOscDestPair}
					style={{
						marginRight: '10px',
						backgroundColor: '#007acc',
						color: 'white',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					🎵 Add Synth Setup
				</button>
				<button
					onClick={handleAddOscillator}
					style={{ marginRight: '10px' }}
				>
					Add Oscillator
				</button>
				<button
					onClick={handleAddDestination}
					style={{ marginRight: '10px' }}
				>
					Add Destination
				</button>
				<button
					onClick={handleAddMultiOscillator}
					style={{
						marginRight: '10px',
						backgroundColor: '#8B5CF6',
						color: 'white',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					🎛️ Add Multi-Osc
				</button>
				<button
					onClick={handleAddOscilloscope}
					style={{
						marginRight: '10px',
						backgroundColor: '#10B981',
						color: 'white',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					📊 Add Scope
				</button>
				<button
					onClick={handleAddSimpleOsc}
					style={{
						marginRight: '10px',
						backgroundColor: '#00ff00',
						color: 'black',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
						fontFamily: 'monospace',
						fontWeight: 'bold',
					}}
				>
					📺 Simple Scope
				</button>
				<button
					onClick={handleAddSimpleXY}
					style={{
						marginRight: '10px',
						backgroundColor: '#00ffff',
						color: 'black',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
						fontFamily: 'monospace',
						fontWeight: 'bold',
					}}
				>
					📊 XY Scope
				</button>
				<button
					onClick={handleAddNoiseGenerator}
					style={{
						marginRight: '10px',
						backgroundColor: '#9333ea',
						color: 'white',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
						fontFamily: 'monospace',
						fontWeight: 'bold',
					}}
				>
					🔊 Noise Gen
				</button>
				<button
					onClick={handleAddThreeFiber}
					style={{
						marginRight: '10px',
						backgroundColor: '#7c3aed',
						color: 'white',
						border: 'none',
						padding: '8px 12px',
						borderRadius: '4px',
						cursor: 'pointer',
						fontFamily: 'monospace',
						fontWeight: 'bold',
					}}
				>
					🎮 3D View
				</button>
				<button onClick={handleDebug}>Debug Audio</button>
			</div>

			<ReactFlow
				nodes={nodes}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				edges={edges}
				edgeTypes={edgeTypes}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				fitView
			>
				<Background />
				<MiniMap />
				<Controls />
			</ReactFlow>
		</div>
	);
}
