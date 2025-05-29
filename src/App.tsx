import { useCallback, useEffect, useRef } from 'react';
import {
	ReactFlow,
	Background,
	MiniMap,
	// addEdge, // Removed: Handled by Zustand store
	// useNodesState, // Removed: Replaced by Zustand store
	// useEdgesState, // Removed: Replaced by Zustand store
	// type OnConnect, // Removed: Handled by useFlowActions hook
	type NodeChange, // Keep for handleNodesChange, will be passed to store action
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
import { useFlowNodes, useFlowEdges, useFlowActions } from './hooks/useFlow';

import { GRID_UNIT } from './config/grid';

export default function App() {
	const nodes = useFlowNodes();
	const edges = useFlowEdges();
	const {
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		onViewportChange,
		onReconnectStart,
		onReconnect,
		onReconnectEnd,
	} = useFlowActions();

	// Track initialization to prevent re-initialization
	const isInitialized = useRef(false);

	// Initialize the store when the component mounts
	useEffect(() => {
		// Only initialize once
		if (!isInitialized.current) {
			console.log('🚀 Initializing Zustand store with empty data');

			setNodes(initialNodes); // Will be empty array
			setEdges(initialEdges); // Will be empty array

			isInitialized.current = true;
			console.log('✅ Store initialization complete');
		}
	}, [setNodes, setEdges]);

	// Custom nodes change handler to update handle positions after node movements
	// This logic needs to be adapted to use store actions
	const handleNodesChange = useCallback(
		(changes: NodeChange<AppNode>[]) => {
			onNodesChange(changes); // Pass changes to the store action

			// The logic for handle positions and forcing edge updates will be managed within the store
			// or by specific actions triggered by node changes.
			// For example, the store's updateNode or a dedicated position change action
			// could trigger recalculateAllHandlePositions.
		},
		[onNodesChange]
	);

	return (
		<ThemeProvider>
			<div className='w-full h-screen'>
				<ReactFlow
					nodes={nodes}
					nodeTypes={nodeTypes}
					onNodesChange={handleNodesChange} // Updated to use new handler
					edges={edges}
					edgeTypes={edgeTypes}
					onEdgesChange={onEdgesChange} // Directly use store action
					onConnect={onConnect} // Directly use store action
					onReconnect={onReconnect} // Enable edge reconnection
					onReconnectStart={onReconnectStart} // Track reconnection start
					onReconnectEnd={onReconnectEnd} // Handle reconnection end/delete
					// Viewport state is managed by React Flow, we only sync changes back to store
					onViewportChange={onViewportChange} // Update store when viewport changes
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
						className='bg-gray-100 dark:bg-gray-900'
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
