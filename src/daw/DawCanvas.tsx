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
import Popover from '@mui/material/Popover';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import FitScreenIcon    from '@mui/icons-material/FitScreen';
import ZoomInIcon       from '@mui/icons-material/ZoomIn';
import ZoomOutIcon      from '@mui/icons-material/ZoomOut';
import ShowChartIcon    from '@mui/icons-material/ShowChart';
import SwapVertIcon     from '@mui/icons-material/SwapVert';
import SwapHorizIcon    from '@mui/icons-material/SwapHoriz';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import StopIcon         from '@mui/icons-material/Stop';
import SpeedIcon        from '@mui/icons-material/Speed';
import TuneIcon         from '@mui/icons-material/Tune';
import { useDawStore, getSceneInputWorkletNode, SCENE_INPUT_ID } from '../store/daw';
import { NODE_COLORS }                                          from './nodes/nodeColors';
import { METAL_BG }                                             from './nodes/metalBackground';
import { hwIconBtn, hwIconBtnLit, hwToggleSx }     from './nodes/hwStyles';
import { HwSliderField } from '../components/HwSliderField';
import {
	SAMPLE_RATE_OPTIONS, getStoredSampleRate, setStoredSampleRate, type SampleRate,
} from '../scene/audioSetup';
import type { SceneInputNodeData } from '../store/dawTypes';
import { VizSettingsOverlay } from './VizSettingsOverlay';

interface LayoutControls {
	columnsSwapped:  boolean;
	onColumnsSwap:   () => void;
	canvasesSwapped: boolean;
	onCanvasesSwap:  () => void;
	sweepVisible:    boolean;
	onSweepToggle:   () => void;
	onResizeStart:   (e: React.MouseEvent) => void;
}
import { PlayerNode }          from './nodes/PlayerNode';
import { MasterOutputNode }    from './nodes/MasterOutputNode';
import { OscillatorNode }      from './nodes/OscillatorNode';
import { GainNode }            from './nodes/GainNode';
import { StubNode }            from './nodes/StubNode';
import { NoiseGeneratorNode }  from './nodes/NoiseGeneratorNode';
import { DCSignalNode }        from './nodes/DCSignalNode';
import { SceneInputNode }      from './nodes/SceneInputNode';
import { DebugNode }           from './nodes/DebugNode';
import { LFONode }             from './nodes/LFONode';
import { FMOscillatorNode }    from './nodes/FMOscillatorNode';
import { AMOscillatorNode }    from './nodes/AMOscillatorNode';
import { FatOscillatorNode }   from './nodes/FatOscillatorNode';
import { PulseOscillatorNode } from './nodes/PulseOscillatorNode';
import { PWMOscillatorNode }   from './nodes/PWMOscillatorNode';
import { GrainPlayerNode }        from './nodes/GrainPlayerNode';
import { MicInputNode }           from './nodes/MicInputNode';
import { ReverbNode }             from './nodes/ReverbNode';
import { JCReverbNode }           from './nodes/JCReverbNode';
import { FreeverbNode }           from './nodes/FreeverbNode';
import { DelayNode }              from './nodes/DelayNode';
import { FeedbackDelayNode }      from './nodes/FeedbackDelayNode';
import { PingPongDelayNode }      from './nodes/PingPongDelayNode';
import { DistortionNode }         from './nodes/DistortionNode';
import { ChebyshevNode }          from './nodes/ChebyshevNode';
import { BitCrusherNode }         from './nodes/BitCrusherNode';
import { FrequencyShifterNode }   from './nodes/FrequencyShifterNode';
import { PitchShiftNode }         from './nodes/PitchShiftNode';
import { StereoWidenerNode }      from './nodes/StereoWidenerNode';
import { ChorusNode }             from './nodes/ChorusNode';
import { PhaserNode }             from './nodes/PhaserNode';
import { TremoloNode }            from './nodes/TremoloNode';
import { VibratoNode }            from './nodes/VibratoNode';
import { AutoFilterNode }         from './nodes/AutoFilterNode';
import { AutoPannerNode }         from './nodes/AutoPannerNode';
import { AutoWahNode }            from './nodes/AutoWahNode';
import { DeletableEdge }    from './edges/DeletableEdge';
import { AddNodePanel }     from './AddNodePanel';
import { PatchPanel }      from './PatchPanel';
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
	lfo:             LFONode,
	fmOscillator:    FMOscillatorNode,
	amOscillator:    AMOscillatorNode,
	fatOscillator:   FatOscillatorNode,
	pulseOscillator: PulseOscillatorNode,
	pwmOscillator:   PWMOscillatorNode,
	grainPlayer:      GrainPlayerNode,
	micInput:         MicInputNode,
	reverb:           ReverbNode,
	jcReverb:         JCReverbNode,
	freeverb:         FreeverbNode,
	delay:            DelayNode,
	feedbackDelay:    FeedbackDelayNode,
	pingPongDelay:    PingPongDelayNode,
	distortion:       DistortionNode,
	chebyshev:        ChebyshevNode,
	bitCrusher:       BitCrusherNode,
	frequencyShifter: FrequencyShifterNode,
	pitchShift:       PitchShiftNode,
	stereoWidener:    StereoWidenerNode,
	chorus:           ChorusNode,
	phaser:           PhaserNode,
	tremolo:          TremoloNode,
	vibrato:          VibratoNode,
	autoFilter:       AutoFilterNode,
	autoPanner:       AutoPannerNode,
	autoWah:          AutoWahNode,
};

const edgeTypes = {
	deletable: DeletableEdge,
};

const DEFAULT_SCAN_FREQ = 50;
const SCAN_FREQ_MIN     = 1;
const SCAN_FREQ_MAX     = 9000;

function PlayStopControl({ color }: { color: string }) {
	const isRunning  = useDawStore(s => s.sceneRunning);
	const startScene = useDawStore(s => s.startScene);
	const stopScene  = useDawStore(s => s.stopScene);
	return (
		<IconButton size='small'
			onClick={() => isRunning ? stopScene() : startScene()}
			title={isRunning ? 'Stop' : 'Play'}
			sx={isRunning ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}>
			{isRunning
				? <StopIcon     sx={{ fontSize: 12 }} />
				: <PlayArrowIcon sx={{ fontSize: 12 }} />
			}
		</IconButton>
	);
}

function SampleRateControl({ color, onOpenChange }: { color: string; onOpenChange?: (open: boolean) => void }) {
	const anchorRef   = useRef<HTMLButtonElement>(null);
	const [open, setOpen]               = useState(false);
	const [sampleRate, setSampleRate]   = useState<SampleRate>(getStoredSampleRate);
	const [needsReload, setNeedsReload] = useState(false);

	const setOpenTracked = useCallback((v: boolean) => { setOpen(v); onOpenChange?.(v); }, [onOpenChange]);

	const handleChange = useCallback((rate: SampleRate) => {
		setStoredSampleRate(rate);
		setSampleRate(rate);
		setNeedsReload(true);
		setOpenTracked(false);
	}, [setOpenTracked]);

	return (
		<>
			<IconButton ref={anchorRef} size='small'
				onClick={() => setOpenTracked(!open)}
				title='Sample rate'
				sx={(open || needsReload) ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}>
				<SpeedIcon sx={{ fontSize: 12 }} />
			</IconButton>
			{/* eslint-disable-next-line react-hooks/refs */}
			<Popover open={open} anchorEl={anchorRef.current} onClose={() => setOpenTracked(false)}
				anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
				transformOrigin={{ vertical: 'center', horizontal: 'left' }}
				slotProps={{ paper: { sx: {
					backgroundImage: METAL_BG,
					border:          `1px solid ${color}40`,
					boxShadow:       `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
					borderRadius:    1,
					p:               1,
				} } }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 72 }}>
					<Typography sx={{ fontSize: 9, color: 'text.disabled', letterSpacing: 0.8, textTransform: 'uppercase', mb: 0.25, display: 'block' }}>Rate</Typography>
					<ToggleButtonGroup exclusive orientation='vertical' value={sampleRate}
						onChange={(_, v) => v && handleChange(v as SampleRate)}
						sx={[hwToggleSx(color), {
							'& .MuiToggleButton-root': {
								'&:first-of-type':  { borderRadius: '3px 3px 0 0' },
								'&:last-of-type':   { borderRadius: '0 0 3px 3px' },
								'&:not(:first-of-type):not(:last-of-type)': { borderRadius: 0 },
							},
							'& .MuiToggleButton-root.Mui-selected': {
								'&:first-of-type':  { borderRadius: '3px 3px 0 0' },
								'&:last-of-type':   { borderRadius: '0 0 3px 3px' },
								'&:not(:first-of-type):not(:last-of-type)': { borderRadius: 0 },
							},
						}]}>
						{SAMPLE_RATE_OPTIONS.map(r => (
							<ToggleButton key={r} value={r} sx={{ fontSize: 9, py: 0.25, lineHeight: 1.4 }}>
								{r >= 1000 ? `${r / 1000} kHz` : `${r} Hz`}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					{needsReload && (
						<Typography component='span'
							sx={{ fontSize: 9, color: '#dd8822', cursor: 'pointer', mt: 0.25, display: 'block', '&:hover': { color: '#ffaa44' } }}
							onClick={() => window.location.reload()}>
							↻ reload
						</Typography>
					)}
				</Box>
			</Popover>
		</>
	);
}

function ScanFreqControl({ color, onOpenChange }: { color: string; onOpenChange?: (open: boolean) => void }) {
	const anchorRef      = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const setOpenTracked  = useCallback((v: boolean) => { setOpen(v); onOpenChange?.(v); }, [onOpenChange]);
	const updateNodeData  = useDawStore(s => s.updateNodeData);
	const storedScanFreq  = useDawStore(s => {
		const node = s.nodes.find(n => n.id === SCENE_INPUT_ID);
		return (node?.data as SceneInputNodeData | undefined)?.scanFrequency ?? DEFAULT_SCAN_FREQ;
	});
	const [scanFreq, setScanFreq] = useState(storedScanFreq);

	const handleScanFreq = useCallback((value: number) => {
		setScanFreq(value);
		updateNodeData(SCENE_INPUT_ID, { scanFrequency: value });
		const worklet = getSceneInputWorkletNode();
		if (worklet) worklet.port.postMessage({ type: 'scanFreq', value });
	}, [updateNodeData]);

	return (
		<>
			<IconButton ref={anchorRef} size='small'
				onClick={() => setOpenTracked(!open)}
				title='Scan frequency'
				sx={open ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}>
				<TuneIcon sx={{ fontSize: 12 }} />
			</IconButton>
			{/* eslint-disable-next-line react-hooks/refs */}
			<Popover open={open} anchorEl={anchorRef.current} onClose={() => setOpenTracked(false)}
				anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
				transformOrigin={{ vertical: 'center', horizontal: 'left' }}
				slotProps={{ paper: { sx: {
					backgroundImage: METAL_BG,
					border:          `1px solid ${color}40`,
					boxShadow:       `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
					borderRadius:    1,
					p:               1,
					width:           180,
				} } }}>
				<HwSliderField
					label='scan'
					value={scanFreq}
					min={SCAN_FREQ_MIN} max={SCAN_FREQ_MAX} step={1}
					color={color}
					onChange={handleScanFreq}
					format={v => String(v)}
					unit='Hz'
					allowValueEdit
					allowBoundsEdit
				/>
			</Popover>
		</>
	);
}

function CustomControls({
	columnsSwapped, onColumnsSwap,
	canvasesSwapped, onCanvasesSwap,
	sweepVisible, onSweepToggle,
	onResizeStart,
}: LayoutControls) {
	const { zoomIn, zoomOut, fitView } = useReactFlow();
	const color    = NODE_COLORS.scene;
	const btnSx    = { ...hwIconBtn(color), p: 0.5 };
	const divSx    = { height: '1px', background: `${color}20`, mx: 0.25, my: 0.25 };
	const panelPos = columnsSwapped ? 'top-right' : 'top-left';

	// Track how many sub-panels are currently open so drag is suppressed while any is expanded.
	const openPanelCount = useRef(0);
	const trackPanel = useCallback((open: boolean) => {
		openPanelCount.current = Math.max(0, openPanelCount.current + (open ? 1 : -1));
	}, []);

	return (
		<Panel position={panelPos} style={{ top: '50%', transform: 'translateY(-50%)', margin: 0 }}>
			<Box
				onMouseDown={e => {
					if (openPanelCount.current > 0) return;
					if ((e.target as HTMLElement).closest('button, input, [role="slider"], [role="combobox"]')) return;
					e.stopPropagation();
					onResizeStart(e);
				}}
				sx={{
					display:         'flex',
					flexDirection:   'column',
					gap:             0.25,
					backgroundImage: METAL_BG,
					border:          `1px solid ${color}30`,
					borderRadius:    '4px',
					p:               0.5,
					boxShadow:       `0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px ${color}10`,
			
				}}>
				<AddNodePanel columnsSwapped={columnsSwapped} onOpenChange={trackPanel} />
				<Box sx={divSx} />
				<IconButton size='small' onClick={() => zoomIn()}  title='Zoom in'  sx={btnSx}><ZoomInIcon    sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={() => zoomOut()} title='Zoom out' sx={btnSx}><ZoomOutIcon   sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={() => fitView()} title='Fit view' sx={btnSx}><FitScreenIcon sx={{ fontSize: 12 }} /></IconButton>
				<Box sx={divSx} />
				<IconButton size='small' onClick={onSweepToggle}  title={sweepVisible    ? 'Hide sweep'      : 'Show sweep'}    sx={sweepVisible    ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><ShowChartIcon sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={onCanvasesSwap} title={canvasesSwapped ? 'Unswap canvases' : 'Swap canvases'} sx={canvasesSwapped ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><SwapVertIcon  sx={{ fontSize: 12 }} /></IconButton>
				<IconButton size='small' onClick={onColumnsSwap}  title={columnsSwapped  ? 'Unswap columns'  : 'Swap columns'}  sx={columnsSwapped  ? { ...hwIconBtnLit(color), p: 0.5 } : btnSx}><SwapHorizIcon sx={{ fontSize: 12 }} /></IconButton>
				<Box sx={divSx} />
				<PlayStopControl   color={color} />
				<SampleRateControl color={color} onOpenChange={trackPanel} />
				<ScanFreqControl   color={color} onOpenChange={trackPanel} />
				<Box sx={divSx} />
				<PatchPanel columnsSwapped={columnsSwapped} />
				<Box sx={divSx} />
				<VizSettingsOverlay onOpenChange={trackPanel} />
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
