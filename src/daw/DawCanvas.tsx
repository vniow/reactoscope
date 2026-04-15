import '@xyflow/react/dist/style.css';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { useDawStore } from '../store/daw';
import { PlayerNode }        from './nodes/PlayerNode';
import { MasterOutputNode }  from './nodes/MasterOutputNode';
import type { AppNode, AppEdge } from '../store/dawTypes';

// nodeTypes MUST be defined outside the component to keep a stable reference.
// Defining it inside would cause React Flow to remount all nodes on every render.
const nodeTypes = {
	player:       PlayerNode,
	masterOutput: MasterOutputNode,
};

export function DawCanvas() {
	const nodes           = useDawStore(s => s.nodes);
	const edges           = useDawStore(s => s.edges);
	const onNodesChange   = useDawStore(s => s.onNodesChange);
	const onEdgesChange   = useDawStore(s => s.onEdgesChange);
	const onConnect       = useDawStore(s => s.onConnect);
	const setSelectedNodeId = useDawStore(s => s.setSelectedNodeId);

	return (
		<ReactFlow<AppNode, AppEdge>
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			onNodeClick={(_, node) => setSelectedNodeId(node.id)}
			onPaneClick={() => setSelectedNodeId(null)}
			nodeTypes={nodeTypes}
			fitView
			defaultEdgeOptions={{ animated: true, style: { stroke: '#22dd22' } }}
			connectionLineStyle={{ stroke: '#22dd22' }}
			proOptions={{ hideAttribution: true }}
		>
			<Background color='#2a2a2a' gap={20} />
			<Controls />
		</ReactFlow>
	);
}
