import { useCallback, useEffect } from 'react';
import {
	ReactFlow,
	Background,
	reconnectEdge,
	type OnReconnect,
	BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './edges';
import { ThemeProvider } from './contexts/ThemeProvider';
import { FlowControls } from './components/FlowControls';
import { ThemedMiniMap } from './components/ThemedMiniMap';
import { type AppNode } from './nodes/types';
import { useAppStore } from './stores/appStore';

import { GRID_UNIT } from './config/grid';

export default function App() {
	// Use Zustand store for flow state management
	const nodes = useAppStore((state) => state.nodes);
	const edges = useAppStore((state) => state.edges);
	const onNodesChange = useAppStore((state) => state.onNodesChange);
	const onEdgesChange = useAppStore((state) => state.onEdgesChange);
	const onConnect = useAppStore((state) => state.onConnect);
	const initializeFlow = useAppStore((state) => state.initializeFlow);

	// Get theme state for background color
	const actualTheme = useAppStore((state) => state.theme.actualTheme);
	const metallicBackground = useAppStore(
		(state) => state.theme.metallicBackground
	);

	// Initialize flow state on component mount
	useEffect(() => {
		initializeFlow(initialNodes as AppNode[], initialEdges);
	}, [initializeFlow]);

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

	// Handle edge reconnection
	const onReconnect: OnReconnect = useCallback(
		(oldEdge, newConnection) => {
			// Use the setEdges action from Zustand to update with reconnected edge
			const newEdges = reconnectEdge(oldEdge, newConnection, edges);
			useAppStore.getState().setEdges(newEdges);
		},
		[edges]
	);

	return (
		<ThemeProvider>
			<div className='w-full h-screen'>
				{/* Debug button - temporary */}
				<button
					onClick={() => {
						console.log('=== DEBUG BUTTON CLICKED ===');
						// Debug Zustand audio state instead of toneRegistry
						const audioNodes = useAppStore.getState().audioNodes;
						console.log('Audio Nodes State:', audioNodes);
						console.log('Audio Nodes Count:', Object.keys(audioNodes).length);
						Object.entries(audioNodes).forEach(([nodeId, node]) => {
							console.log(`Node ${nodeId}:`, {
								type: node.type,
								hasInstance: !!node.instance,
								hasInstances: !!node.instances,
								instancesCount: node.instances
									? Object.keys(node.instances).length
									: 0,
								params: node.params,
							});
						});
					}}
					style={{
						position: 'fixed',
						top: '10px',
						right: '10px',
						zIndex: 1000,
						padding: '8px 16px',
						backgroundColor: '#f59e0b',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					Debug Audio State
				</button>
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
					{/* <FlowDebugPanel /> */}
					{/* <StoreDebugPanel /> */}
					<ThemedMiniMap
						variant='source'
						position='bottom-right'
						pannable={true}
						nodeStrokeWidth={1.5}
						nodeBorderRadius={3}
						ariaLabel='Flow MiniMap'
					/>
				</ReactFlow>
			</div>
		</ThemeProvider>
	);
}
