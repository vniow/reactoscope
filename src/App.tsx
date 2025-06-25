import { useCallback, useEffect, useRef } from 'react';
import {
	ReactFlow,
	Background,
	reconnectEdge,
	type OnReconnect,
	BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './flow/edges';
import { ThemeProvider } from './contexts/ThemeProvider';
import { FlowControls } from './flow/components/FlowControls';
import { ThemedMiniMap } from './flow/components/ThemedMiniMap';
import { type AppNode } from './nodes/types';
import { useAppStore } from './shared/stores/appStore';

export default function App() {
	// Global effect counter for debugging infinite loops
	const globalEffectCounterRef = useRef(0);

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
		globalEffectCounterRef.current++;
		console.log(
			`🔍 [App] useEffect ENTRY #${globalEffectCounterRef.current} - Initialize flow`,
			{
				nodesCount: initialNodes.length,
				edgesCount: initialEdges.length,
				stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
			}
		);

		initializeFlow(initialNodes as AppNode[], initialEdges);

		console.log(
			`🔍 [App] useEffect EXIT #${globalEffectCounterRef.current} - Initialize flow`
		);
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
					snapGrid={[32, 32]}
					minZoom={0.1}
					maxZoom={4}
					proOptions={{ hideAttribution: true }}
				>
					{/* Audio sync component - handles centralized audio connections */}
			

					<Background
						gap={64}
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
