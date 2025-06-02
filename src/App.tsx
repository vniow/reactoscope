import { useCallback, useEffect, useRef } from 'react';
import {
	ReactFlow,
	Background,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
	type OnConnect,
	BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './edges';
import { ThemeProvider } from './contexts/ZustandThemeProvider';
import { FlowControls } from './components/FlowControls';
// import { StoreDebugPanel } from './components/StoreDebugPanel';
import { NodeAddPanel } from './components/NodeAddPanel';
import { type AppNode } from './nodes/types';

import { GRID_UNIT } from './config/grid';

export default function App() {
	// Use React Flow's native state management hooks
	const [nodes, setNodes, onNodesChange] = useNodesState(
		initialNodes as AppNode[]
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Handle connections with React Flow's addEdge utility
	const onConnect: OnConnect = useCallback(
		(connection) => {
			setEdges((edges) => addEdge(connection, edges));
		},
		[setEdges]
	);

	// Track initialization to prevent re-initialization
	const isInitialized = useRef(false);

	// Initialize with empty arrays (no longer needed as React Flow manages initial state)
	useEffect(() => {
		if (!isInitialized.current) {
			console.log('🚀 Using React Flow native state management');
			isInitialized.current = true;
			console.log('✅ React Flow state initialization complete');
		}
	}, []);

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
					fitView
					snapToGrid
					snapGrid={[GRID_UNIT / 2, GRID_UNIT / 2]}
					proOptions={{ hideAttribution: true }}
				>
					<Background
						gap={GRID_UNIT}
						size={6}
						lineWidth={2}
						offset={3}
						variant={BackgroundVariant.Cross}
					/>
					<NodeAddPanel />
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
