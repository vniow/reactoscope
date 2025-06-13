import { useAppStore } from '../stores/appStore';

export function FlowDebugPanel() {
	const nodes = useAppStore((state) => state.nodes);
	const edges = useAppStore((state) => state.edges);
	const resetFlow = useAppStore((state) => state.resetFlow);
	const addNode = useAppStore((state) => state.addNode);

	const handleAddDebugNode = () => {
		const newNode = {
			id: `debug-${Date.now()}`,
			type: 'debug' as const,
			position: { x: Math.random() * 400, y: Math.random() * 400 },
			data: {
				label: `Debug Node ${Date.now()}`,
				id: `debug-${Date.now()}`,
				type: 'debug' as const,
				variant: 'core' as const, // Use 'core' instead of 'debug'
			},
		};
		addNode(newNode);
	};

	return (
		<div className='fixed bottom-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50 max-w-sm'>
			<h3 className='text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100'>
				Flow Debug Panel
			</h3>
			<div className='text-xs text-gray-600 dark:text-gray-400 mb-3'>
				<div>Nodes: {nodes.length}</div>
				<div>Edges: {edges.length}</div>
			</div>
			<div className='flex gap-2'>
				<button
					onClick={handleAddDebugNode}
					className='px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Add Node
				</button>
				<button
					onClick={resetFlow}
					className='px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600'
				>
					Reset
				</button>
				<button
					onClick={() => window.location.reload()}
					className='px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600'
				>
					Reload Page
				</button>
			</div>
			<div className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
				Test persistence by adding nodes, then reloading the page.
			</div>
		</div>
	);
}
