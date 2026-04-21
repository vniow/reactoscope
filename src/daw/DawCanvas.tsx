import '@xyflow/react/dist/style.css';
import {
	ReactFlow,
	Background,
	Controls,
	ControlButton,
	useReactFlow,
} from '@xyflow/react';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { useDawStore } from '../store/daw';
import { PlayerNode }       from './nodes/PlayerNode';
import { MasterOutputNode } from './nodes/MasterOutputNode';
import { OscillatorNode }   from './nodes/OscillatorNode';
import { GainNode }           from './nodes/GainNode';
import { StubNode }           from './nodes/StubNode';
import { NoiseGeneratorNode } from './nodes/NoiseGeneratorNode';
import { DCSignalNode }       from './nodes/DCSignalNode';
import { DeletableEdge }    from './edges/DeletableEdge';
import { AddNodePanel }     from './AddNodePanel';
import type { AppNode, AppEdge } from '../store/dawTypes';

// nodeTypes and edgeTypes MUST be defined outside the component so React Flow
// gets a stable reference and doesn't remount nodes/edges on every render.
const nodeTypes = {
	player:          PlayerNode,
	masterOutput:    MasterOutputNode,
	oscillator:      OscillatorNode,
	gain:            GainNode,
	stub:            StubNode,
	noiseGenerator:  NoiseGeneratorNode,
	dcSignal:        DCSignalNode,
};

const edgeTypes = {
	deletable: DeletableEdge,
};

/**
 * Custom Controls that place the Add Node button ABOVE the zoom controls,
 * as required. We suppress the built-in buttons and render our own.
 */
function CustomControls() {
	const { zoomIn, zoomOut, fitView } = useReactFlow();
	return (
		<Controls showZoom={false} showFitView={false} showInteractive={false}>
			{/* Add Node button — above zoom controls */}
			<AddNodePanel />

			{/* Zoom controls */}
			<ControlButton onClick={() => zoomIn()} title='Zoom in' aria-label='Zoom in'>
				<ZoomInIcon style={{ width: 16, height: 16 }} />
			</ControlButton>
			<ControlButton onClick={() => zoomOut()} title='Zoom out' aria-label='Zoom out'>
				<ZoomOutIcon style={{ width: 16, height: 16 }} />
			</ControlButton>
			<ControlButton onClick={() => fitView()} title='Fit view' aria-label='Fit view'>
				<FitScreenIcon style={{ width: 16, height: 16 }} />
			</ControlButton>
		</Controls>
	);
}

export function DawCanvas() {
	const nodes            = useDawStore(s => s.nodes);
	const edges            = useDawStore(s => s.edges);
	const onNodesChange    = useDawStore(s => s.onNodesChange);
	const onEdgesChange    = useDawStore(s => s.onEdgesChange);
	const onConnect        = useDawStore(s => s.onConnect);
	const onReconnect      = useDawStore(s => s.onReconnect);
	const setSelectedNodeId = useDawStore(s => s.setSelectedNodeId);

	return (
		<ReactFlow<AppNode, AppEdge>
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			onReconnect={onReconnect}
			onNodeClick={(_, node) => setSelectedNodeId(node.id)}
			onPaneClick={() => setSelectedNodeId(null)}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			defaultEdgeOptions={{
				animated: true,
				type:     'deletable',
				style:    { stroke: '#22dd22' },
			}}
			connectionLineStyle={{ stroke: '#22dd22' }}
			proOptions={{ hideAttribution: true }}
			fitView
		>
			<Background color='#2a2a2a' gap={20} />
			<CustomControls />
		</ReactFlow>
	);
}
