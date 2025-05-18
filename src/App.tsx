import React, { useCallback } from 'react';
import {
	ReactFlow,
	MiniMap,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	type Connection,
	type BackgroundVariant,
} from '@xyflow/react';
import nodeTypes from './components/nodes';

import '@xyflow/react/dist/style.css';
import './styles/flow.css';

const initialNodes = [
	{
		id: '1',
		position: { x: 100, y: 100 },
		data: { 
			label: 'Audio Processor',
			nodeType: 'audio',
			description: 'Upload or drag an audio file' 
		},
		type: 'fileNode',
	},
	{
		id: '2',
		position: { x: 400, y: 100 },
		data: { 
			label: 'Visual Output',
			nodeType: 'image',
			description: 'Select image format settings' 
		},
		type: 'fileNode',
	},
	{
		id: '3',
		position: { x: 250, y: 300 },
		data: { 
			label: 'Configuration',
			nodeType: 'config',
			description: 'Settings for audio processing'
		},
		type: 'fileNode',
	},
];
const initialEdges = [
	{ id: 'e1-3', source: '1', target: '3', animated: true },
	{ id: 'e3-2', source: '3', target: '2', animated: true },
];

export default function App() {
	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onConnect = useCallback(
		(connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
		[setEdges]
	);

	return (
		<div style={{ width: '100vw', height: '100vh' }} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			{/* SVG definitions for edge gradients */}
			<svg style={{ width: 0, height: 0, position: 'absolute' }}>
				<defs>
					<linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#6366f1" />
						<stop offset="100%" stopColor="#a855f7" />
					</linearGradient>
				</defs>
			</svg>

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
				className="bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50"
			>
				<Controls className="shadow-lg" />
				<MiniMap 
					nodeStrokeColor="#aaa"
					nodeColor={(node) => {
						switch(node.data?.nodeType) {
							case 'audio': return '#10b981';
							case 'image': return '#f59e0b';
							case 'config': return '#0ea5e9';
							default: return '#8b5cf6';
						}
					}}
				/>
				<Background
					variant={'dots' as BackgroundVariant}
					gap={16}
					size={1}
					color="#a0aec0"
					className="opacity-30 dark:opacity-10"
				/>
			</ReactFlow>
		</div>
	);
}
