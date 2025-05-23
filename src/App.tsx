import React, { useEffect } from 'react';
import {
	ReactFlow,
	MiniMap,
	Controls,
	Background,
	type BackgroundVariant,
} from '@xyflow/react';
import nodeTypes from './components/nodes';
import { useNodeStore } from './store/nodeStore';
// import { NODE_TYPE_COLORS } from './types/nodes';
import FlowControls from './components/FlowControls';
import NodeFactory from './components/NodeFactory';

import '@xyflow/react/dist/style.css';
import './styles/flow.css';

export default function App() {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
		useNodeStore();

	// Add some initial nodes when the app starts
	useEffect(() => {
		// Only add initial nodes if the store is empty
		if (nodes.length === 0) {
			addNode('debugNode', { x: 100, y: 100 });
			addNode('oscillatorNode', { x: 400, y: 100 });
		}
	}, [nodes.length, addNode]);

	return (
		<div
			style={{ width: '100vw', height: '100vh' }}
			// className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				defaultEdgeOptions={{
					style: { strokeWidth: 2 },
					type: 'smoothstep',
				}}
				fitView
				proOptions={{ hideAttribution: true }}
				className='bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50'
			>
				<Controls className='shadow-lg' />
				<MiniMap
					nodeStrokeColor='#aaa'
					nodeColor={(node) => {
						// Use our node theme mapping
						const nodeData = node.data as any;
						switch (nodeData?.nodeType) {
							case 'debugNode':
							case 'debug':
								return '#F87171'; // node-debug-DEFAULT from theme
							case 'oscillator':
								return '#60A5FA'; // node-oscillator-DEFAULT from theme
							case 'gain':
								return '#F472B6'; // node-gain-DEFAULT from theme
							default:
								return '#A78BFA'; // node-file-DEFAULT from theme
						}
					}}
				/>
				<Background
					variant={'dots' as BackgroundVariant}
					gap={16}
					size={1}
					color='#a0aec0'
					className='opacity-30 dark:opacity-10'
				/>
				<FlowControls />
				<NodeFactory />
			</ReactFlow>

			{/* Node Factory - floating component for adding nodes */}
			{/* <NodeFactory /> */}
		</div>
	);
}
