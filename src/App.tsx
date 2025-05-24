import { useEffect, useRef, useState, useCallback } from 'react';
import {
	ReactFlow,
	MiniMap,
	Background,
	type BackgroundVariant,
	type ColorMode,
} from '@xyflow/react';
import nodeTypes from './components/nodes';
import { useNodeStore } from './store/nodeStore';
import FlowControls from './components/FlowControls';
import NodeFactory from './components/NodeFactory';

import '@xyflow/react/dist/style.css';

export default function App() {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
		useNodeStore();

	// Use a ref to track if we've initialized to prevent double-initialization
	const hasInitialized = useRef(false);

	// Theme state for React Flow colorMode
	const [colorMode, setColorMode] = useState<ColorMode>('system');

	// Function to get React Flow color mode from current theme
	const getColorMode = useCallback((): ColorMode => {
		const currentClasses = document.documentElement.classList;
		if (currentClasses.contains('dark')) return 'dark';
		if (currentClasses.contains('light')) return 'light';
		return 'system';
	}, []);

	// Monitor theme changes and update React Flow color mode
	useEffect(() => {
		const updateColorMode = () => {
			const newColorMode = getColorMode();
			console.log(`Updating React Flow colorMode to: ${newColorMode}`);
			setColorMode(newColorMode);
		};

		// Initial update
		updateColorMode();

		// Create observer for class changes on html element
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === 'attributes' &&
					mutation.attributeName === 'class'
				) {
					updateColorMode();
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, [getColorMode]);

	// Add some initial nodes when the app starts
	useEffect(() => {
		// Only add initial nodes if the store is empty and we haven't initialized yet
		if (nodes.length === 0 && !hasInitialized.current) {
			hasInitialized.current = true;
			addNode('debugNode', { x: 100, y: 100 });
			addNode('oscillatorNode', { x: 400, y: 100 });
		}
	}, [nodes.length, addNode]);

	return (
		<div
			style={{ width: '100vw', height: '100vh' }}
			className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200'
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				colorMode={colorMode}
				defaultEdgeOptions={{
					style: { strokeWidth: 2 },
					type: 'smoothstep',
				}}
				fitView
				proOptions={{ hideAttribution: true }}
				className='bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50'
			>
				<MiniMap
					nodeStrokeColor='#aaa'
					nodeColor={(node) => {
						const nodeData = node.data as { nodeType?: string };
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
		</div>
	);
}
