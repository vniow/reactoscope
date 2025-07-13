import { useEffect, useRef } from 'react';
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';

import '@xyflow/react/dist/base.css';

import { initialNodes, nodeTypes } from './flow/nodes';
import { initialEdges, edgeTypes } from './flow/edges';
import { FlowControls } from './flow/components/FlowControls';
import { StyledMiniMap } from './flow/components/StyledMiniMap';
import { useAppStore } from './shared/stores/appStore';

export default function App() {
	// Initialize theme when the app starts
	const initializeTheme = useAppStore((state) => state.initializeTheme);

	useEffect(() => {
		initializeTheme();
	}, [initializeTheme]);
	// Global effect counter for debugging infinite loops
	const globalEffectCounterRef = useRef(0);

	// Use Zustand store for flow state management
	const nodes = useAppStore((state) => state.nodes);
	const edges = useAppStore((state) => state.edges);
	const onNodesChange = useAppStore((state) => state.onNodesChange);
	const onEdgesChange = useAppStore((state) => state.onEdgesChange);
	const onConnect = useAppStore((state) => state.onConnect);
	const onReconnect = useAppStore((state) => state.onReconnect);
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

		initializeFlow(initialNodes, initialEdges);

		// console.log(
		// 	`🔍 [App] useEffect EXIT #${globalEffectCounterRef.current} - Initialize flow`
		// );
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

	return (
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
				<Background
					gap={64}
					size={6}
					lineWidth={2}
					offset={3}
					variant={BackgroundVariant.Cross}
					color={getBackgroundColor()}
				/>
				<FlowControls />
				<StyledMiniMap />
			</ReactFlow>
		</div>
	);
}
