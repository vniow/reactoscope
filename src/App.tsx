import { useCallback, useEffect } from 'react';
import {
	ReactFlow,
	Background,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
	type OnConnect,
	type NodeChange,
	BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './edges';
import { ThemeProvider } from './contexts/ThemeContext';
import { FlowControls } from './components/FlowControls';
import { getNodeHandlePositions } from './utils/handlePositioning';
import { type AppNode } from './nodes/types';

import { GRID_UNIT } from './config/grid';

export default function App() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onConnect: OnConnect = useCallback(
		(connection) =>
			setEdges((edges) =>
				addEdge(
					{
						...connection,
						type: 'floating', // Ensure new edges use the floating edge type
						animated: true, // Optional: make new edges animated like the initial ones
					},
					edges
				)
			),
		[setEdges]
	);

	// Function to update handle positions for all nodes
	const updateHandlePositions = useCallback(() => {
		setNodes((currentNodes) =>
			currentNodes.map((node) => {
				const handlePositions = getNodeHandlePositions(
					node.id,
					currentNodes,
					edges
				);
				return {
					...node,
					data: {
						...node.data,
						handlePositions,
					},
				} as AppNode;
			})
		);
	}, [edges, setNodes]);

	// Update handle positions when nodes move or edges change
	useEffect(() => {
		updateHandlePositions();
	}, [edges, updateHandlePositions]);

	// Custom nodes change handler to update handle positions after node movements
	const handleNodesChange = useCallback(
		(changes: NodeChange<AppNode>[]) => {
			onNodesChange(changes);

			// Update handle positions when nodes move (both during drag and after)
			const hasPositionChange = changes.some(
				(change) => change.type === 'position'
			);

			if (hasPositionChange) {
				// Update handle positions immediately
				updateHandlePositions();

				// Force React Flow to recalculate edge paths by triggering an edge update
				setEdges((currentEdges) =>
					currentEdges.map((edge) => ({
						...edge,
						// Update a property to force re-render without changing functionality
						updatedAt: Date.now(),
					}))
				);
			}
		},
		[onNodesChange, updateHandlePositions, setEdges]
	);

	return (
		<ThemeProvider>
			<div className='w-full h-screen'>
				<ReactFlow
					nodes={nodes}
					nodeTypes={nodeTypes}
					onNodesChange={handleNodesChange}
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
						className='bg-gray-100 dark:bg-gray-900'
					/>
					<FlowControls />
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
