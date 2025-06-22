import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';

import '@xyflow/react/dist/style.css';

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

	const handleAddOscillator = () => {
		addNode('oscillator', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddDestination = () => {
		addNode('destination', { x: Math.random() * 400, y: Math.random() * 400 });
	};

	const handleAddOscDestPair = () => {
		addOscillatorDestinationPair();
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
