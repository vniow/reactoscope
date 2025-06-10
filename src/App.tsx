import { useCallback } from 'react';
import {
	ReactFlow,
	Background,
	MiniMap,
	addEdge,
	reconnectEdge,
	useNodesState,
	useEdgesState,
	type OnConnect,
	type OnReconnect,
	BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './edges';
import { ThemeProvider } from './contexts/ThemeProvider';
import { FlowControls } from './components/FlowControls';
import { NodeAddPanel } from './components/NodeAddPanel';
import { type AppNode } from './nodes/types';

import { GRID_UNIT } from './config/grid';

export default function App() {
	// Use React Flow's native state management hooks
	const [nodes, , onNodesChange] = useNodesState(initialNodes as AppNode[]);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Handle connections with React Flow's addEdge utility
	const onConnect: OnConnect = useCallback(
		(connection) => {
			setEdges((eds) => addEdge({ ...connection, type: 'floating' }, eds));
		},
		[setEdges]
	);

	// Handle edge reconnection
	const onReconnect: OnReconnect = useCallback(
		(oldEdge, newConnection) => {
			setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
		},
		[setEdges]
	);

	// Initialize with empty arrays (no longer needed as React Flow manages initial state)
	return (
		<ThemeProvider>
			<div className='w-full h-screen'>
				<ReactFlow
					nodes={nodes}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					edges={edges}
					edgeTypes={edgeTypes}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onReconnect={onReconnect}
					fitView
					snapToGrid
					snapGrid={[GRID_UNIT / 2, GRID_UNIT / 2]}
					proOptions={{ hideAttribution: true }}
				>
					<NodeAddPanel />
					<Background
						gap={GRID_UNIT}
						size={6}
						lineWidth={2}
						offset={3}
						variant={BackgroundVariant.Cross}
					/>
					<FlowControls />
					{/* <StoreDebugPanel /> */}
					<MiniMap
						pannable={true}
						bgColor='bg-gray-100/50 dark:bg-gray-800'
						ariaLabel={'MiniMap'}
					/>
				</ReactFlow>
			</div>
		</ThemeProvider>
	);
}
