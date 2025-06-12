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
import { type AppNode } from './nodes/types';
import { useAppStore } from './stores/appStore';

import { GRID_UNIT } from './config/grid';

export default function App() {
	// Use React Flow's native state management hooks
	const [nodes, , onNodesChange] = useNodesState(initialNodes as AppNode[]);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Get theme state for background color
	const actualTheme = useAppStore((state) => state.theme.actualTheme);
	const metallicBackground = useAppStore(
		(state) => state.theme.metallicBackground
	);

	// Calculate background color based on theme
	const getBackgroundColor = () => {
		if (metallicBackground === 'rainbow') {
			// For rainbow theme, use a neutral color that contrasts with the vibrant background
			return actualTheme === 'light' ? '#64748b' : '#475569'; // slate-500 / slate-600
		}

		// For titanium theme
		if (actualTheme === 'light') {
			return '#d1d5db'; // gray-300 - darker for light theme contrast
		} else {
			return '#4b5563'; // gray-600 - lighter for dark theme contrast
		}
	};

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
					minZoom={0.1}
					maxZoom={4}
					proOptions={{ hideAttribution: true }}
				>
					<Background
						gap={GRID_UNIT}
						size={6}
						lineWidth={2}
						offset={3}
						variant={BackgroundVariant.Cross}
						color={getBackgroundColor()}
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
