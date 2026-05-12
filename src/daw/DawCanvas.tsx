import '@xyflow/react/dist/style.css';
import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { debugRef } from '../components/WoahcopeSceneR3F';
import { GRID_SUBUNIT } from './nodes/gridSystem';
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Panel,
	useReactFlow,
	applyNodeChanges,
	type NodeChange,
	type Node,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ShowChartIcon  from '@mui/icons-material/ShowChart';
import SwapVertIcon   from '@mui/icons-material/SwapVert';
import SwapHorizIcon  from '@mui/icons-material/SwapHoriz';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { useDawStore } from '../store/daw';
import { NODE_COLORS }             from './nodes/nodeColors';
import { METAL_BG }                from './nodes/metalBackground';
import { hwIconBtn, hwIconBtnLit } from './nodes/hwStyles';

interface LayoutControls {
	columnsSwapped:    boolean;
	onColumnsSwap:     () => void;
	canvasesSwapped:   boolean;
	onCanvasesSwap:    () => void;
	sweepVisible:      boolean;
	onSweepToggle:     () => void;
	toolbarCollapsed:  boolean;
	onToolbarToggle:   () => void;
}
import { PlayerNode }       from './nodes/PlayerNode';
import { MasterOutputNode } from './nodes/MasterOutputNode';
import { OscillatorNode }   from './nodes/OscillatorNode';
import { GainNode }           from './nodes/GainNode';
import { StubNode }           from './nodes/StubNode';
import { NoiseGeneratorNode } from './nodes/NoiseGeneratorNode';
import { DCSignalNode }       from './nodes/DCSignalNode';
import { SceneInputNode }    from './nodes/SceneInputNode';
import { DebugNode }         from './nodes/DebugNode';
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
	sceneInput:      SceneInputNode,
	debug:           DebugNode,
};

const edgeTypes = {
	deletable: DeletableEdge,
};

function CustomControls({
	columnsSwapped, onColumnsSwap,
	canvasesSwapped, onCanvasesSwap,
	sweepVisible, onSweepToggle,
	toolbarCollapsed, onToolbarToggle,
}: LayoutControls) {
	const { zoomIn, zoomOut, fitView } = useReactFlow();
	const color  = NODE_COLORS.scene;
	const btnSx  = { ...hwIconBtn(color), p: 0.5 };
	const divSx  = { height: '1px', background: `${color}20`, mx: 0.25, my: 0.25 };
	const panelPos = columnsSwapped ? 'top-right' : 'top-left';
	return (
		<Panel position={panelPos} style={{ top: '50%', transform: 'translateY(-50%)', margin: 0 }}>
			<Box sx={{
				display:         'flex',
				flexDirection:   'column',
				gap:             0.25,
				backgroundImage: METAL_BG,
				border:          `1px solid ${color}30`,
				borderRadius:    '4px',
				p:               0.5,
				boxShadow:       `0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px ${color}10`,
			}}>
				<AddNodePanel columnsSwapped={columnsSwapped} />
				<Box sx={divSx} />
				<IconButton size='small' onClick={() => zoomIn()}  title='Zoom in'   sx={btnSx}><ZoomInIcon   sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={() => zoomOut()} title='Zoom out'  sx={btnSx}><ZoomOutIcon  sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={() => fitView()} title='Fit view'  sx={btnSx}><FitScreenIcon sx={{ fontSize: 12 }} /></IconButton>
				<Box sx={divSx} />
				<IconButton size='small' onClick={onSweepToggle}   title={sweepVisible     ? 'Hide sweep'           : 'Show sweep'}           sx={sweepVisible     ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><ShowChartIcon  sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={onCanvasesSwap}  title={canvasesSwapped  ? 'Unswap canvases'      : 'Swap canvases'}         sx={canvasesSwapped  ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><SwapVertIcon   sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={onColumnsSwap}   title={columnsSwapped   ? 'Unswap columns'       : 'Swap columns'}          sx={columnsSwapped   ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><SwapHorizIcon  sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={onToolbarToggle} title={toolbarCollapsed ? 'Expand toolbar'       : 'Collapse toolbar'}      sx={toolbarCollapsed ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}>
					{toolbarCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 12 }} /> : <UnfoldLessIcon sx={{ fontSize: 12 }} />}
				</IconButton>
			</Box>
		</Panel>
	);
}

export function DawCanvas(layout: LayoutControls) {
	// Authoritative node list from Zustand (audio state, add/remove, data updates).
	const zustandNodes       = useDawStore(useShallow(s => s.nodes));
	const edges              = useDawStore(useShallow(s => s.edges));
	const onNodesChange      = useDawStore(s => s.onNodesChange);
	const onEdgesChange      = useDawStore(s => s.onEdgesChange);
	const onConnect          = useDawStore(s => s.onConnect);
	const onReconnect        = useDawStore(s => s.onReconnect);
	const updateNodePositions = useDawStore(s => s.updateNodePositions);
	const setSelectedNodeId  = useDawStore(s => s.setSelectedNodeId);

	// Local node state for visual rendering — position changes during drag live
	// here only, keeping them off the Zustand hot path and out of all subscribers.
	const [localNodes, setLocalNodes] = useState<AppNode[]>(zustandNodes);
	const isDragging = useRef(false);

	// Sync Zustand → local whenever Zustand changes (add/remove/data updates),
	// but not during a drag (would jump nodes back to pre-drag positions).
	useEffect(() => {
		if (!isDragging.current) {
			setLocalNodes(zustandNodes);
		}
	}, [zustandNodes]);

	const handleNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
		const positionOnly = changes.every(
			c => c.type === 'position' || c.type === 'dimensions' || c.type === 'select',
		);
		if (positionOnly) {
			// Mark as a non-urgent transition so React can yield to RAF callbacks
			// (oscilloscope rendering, ring buffer writes) between render slices.
			startTransition(() => {
				setLocalNodes(prev => applyNodeChanges(changes, prev));
			});
		} else {
			// Audio-relevant changes (add, remove, reset) go through Zustand.
			onNodesChange(changes);
		}
	}, [onNodesChange]);

	const handleNodeDragStart = useCallback(() => {
		isDragging.current = true;
		if (import.meta.env.DEV) {
			debugRef.current.isDragging = true;
			debugRef.current.lastDragStartMs = performance.now();
		}
	}, []);

	const handleNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node, nodes: AppNode[]) => {
		isDragging.current = false;
		if (import.meta.env.DEV) {
			debugRef.current.isDragging = false;
			debugRef.current.lastDragStopMs = performance.now();
			debugRef.current.audioVersionAtDragStop = useDawStore.getState().audioVersion;
		}
		// Wrap in startTransition so the Zustand flush is treated as a low-priority
		// update. Without this, the synchronous React commit blocks the main thread
		// for ~97ms, starving the R3F RAF loop and the SceneInput SharedArrayBuffer
		// write path, causing audible and visual interruption.
		startTransition(() => {
			updateNodePositions(nodes);
		});
	}, [updateNodePositions]);

	return (
		<ReactFlow<AppNode, AppEdge>
			style={{ background: '#141414' }}
			nodes={localNodes}
			edges={edges}
			onNodesChange={handleNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			onReconnect={onReconnect}
			onNodeDragStart={handleNodeDragStart}
			onNodeDragStop={handleNodeDragStop}
			onNodeClick={(_, node) => setSelectedNodeId(node.id)}
			onPaneClick={() => setSelectedNodeId(null)}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			defaultEdgeOptions={{
				animated: false,
				type:     'deletable',
			}}
			connectionLineStyle={{ stroke: '#888' }}
			proOptions={{ hideAttribution: true }}
			snapToGrid
			snapGrid={[GRID_SUBUNIT, GRID_SUBUNIT]}
			fitView
		>
			<Background variant={BackgroundVariant.Cross} color='#2a2a2a' gap={24} size={6} />
			<CustomControls {...layout} />
		</ReactFlow>
	);
}
