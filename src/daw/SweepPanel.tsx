import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import { Canvas } from '@react-three/fiber';
import { useDawStore, MASTER_NODE_ID, SCENE_INPUT_ID } from '../store/daw';
import type { SceneInputNodeData } from '../store/dawTypes';
import { SweepSceneR3F, type TriggerMode } from '../components/SweepSceneR3F';
import { channelHex, CHANNEL_LABEL, CHANNEL_ORDER, type ChannelId } from '../woahscope/sweepUtils';

const HANDLE_HEIGHT = 6;

interface Props {
	height: number;
	fullWidth: boolean;
	onResize: (newHeight: number) => void;
	onToggleFullWidth: () => void;
}

export function SweepPanel({ height, fullWidth, onResize, onToggleFullWidth }: Props) {
	const edges = useDawStore(s => s.edges);

	const activeChannels: ChannelId[] = CHANNEL_ORDER.filter((_ch, idx) =>
		edges.some(e => e.target === MASTER_NODE_ID && e.targetHandle === `in-${idx}`),
	);

	const scanFrequency = useDawStore(s => {
		const node = s.nodes.find(n => n.id === SCENE_INPUT_ID);
		return (node?.data as SceneInputNodeData | undefined)?.scanFrequency ?? 50;
	});

	// Return a stable string from the selector (Zustand compares with Object.is,
	// so returning a new Set each call would cause an infinite re-render loop).
	const sceneInputChannelStr = useDawStore(s =>
		s.edges
			.filter(e => e.source === SCENE_INPUT_ID && e.target === MASTER_NODE_ID)
			.map(e => CHANNEL_ORDER[Number(e.targetHandle?.replace('in-', ''))])
			.sort()
			.join(','),
	);
	const sceneInputChannels = useMemo(
		() => new Set(sceneInputChannelStr ? sceneInputChannelStr.split(',') as ChannelId[] : []),
		[sceneInputChannelStr],
	);

	const [triggerMode, setTriggerMode] = useState<TriggerMode>(
		() => (localStorage.getItem('sweep-trigger-mode') ?? 'clock') as TriggerMode,
	);
	const [phaseOffset, setPhaseOffset] = useState<number>(
		() => Math.max(-1, Number(localStorage.getItem('sweep-phase-offset') ?? 0)),
	);
	const [latencyCompSamples, setLatencyCompSamples] = useState<number>(
		() => Number(localStorage.getItem('sweep-latency-comp') ?? 0),
	);
	useEffect(() => { localStorage.setItem('sweep-trigger-mode',  triggerMode);                }, [triggerMode]);
	useEffect(() => { localStorage.setItem('sweep-phase-offset',  String(phaseOffset));        }, [phaseOffset]);
	useEffect(() => { localStorage.setItem('sweep-latency-comp',  String(latencyCompSamples)); }, [latencyCompSamples]);

	const isDraggingRef     = useRef(false);
	const startYRef         = useRef(0);
	const startHeightRef    = useRef(height);
	const onResizeRef       = useRef(onResize);
	useEffect(() => { onResizeRef.current = onResize; }, [onResize]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		isDraggingRef.current    = true;
		startYRef.current        = e.clientY;
		startHeightRef.current   = height;
		document.body.style.cursor     = 'row-resize';
		document.body.style.userSelect = 'none';
	}, [height]);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!isDraggingRef.current) return;
			// Drag up → increase height
			const delta = startYRef.current - e.clientY;
			onResizeRef.current(startHeightRef.current + delta);
		};
		const onMouseUp = () => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current          = false;
			document.body.style.cursor     = '';
			document.body.style.userSelect = '';
		};
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup',   onMouseUp);
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup',   onMouseUp);
		};
	}, []);

	const nLanes = activeChannels.length;

	return (
		<Box
			sx={{
				height,
				flexShrink: 0,
				display:    'flex',
				flexDirection: 'column',
				bgcolor:    '#000',
				overflow:   'hidden',
			}}
		>
			{/* Drag handle — at the top so dragging up expands the panel */}
			<Box
				onMouseDown={handleMouseDown}
				sx={{
					height:     HANDLE_HEIGHT,
					flexShrink: 0,
					cursor:     'row-resize',
					bgcolor:    '#1a1a1a',
					borderTop:  '1px solid #2a2a2a',
					transition: 'background-color 0.15s',
					'&:hover':  { bgcolor: 'rgba(34, 221, 34, 0.4)' },
				}}
			/>

			{/* Trigger controls */}
			<Box sx={{ height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
			           gap: 1.5, px: 1, bgcolor: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
				<ToggleButtonGroup
					exclusive size="small" value={triggerMode}
					onChange={(_, v) => v && setTriggerMode(v)}
					sx={{ flexShrink: 0, '& .MuiToggleButton-root': {
						py: 0, px: 0.75, fontSize: '0.6rem', fontFamily: 'monospace',
						color: '#444', border: '1px solid #222', lineHeight: '20px',
						'&.Mui-selected': { color: '#22dd22', bgcolor: 'rgba(34,221,34,0.08)' },
					}}}
				>
					<ToggleButton value="clock">CLK</ToggleButton>
					<ToggleButton value="edge">EDG</ToggleButton>
					<ToggleButton value="free">FREE</ToggleButton>
				</ToggleButtonGroup>

				<Box sx={{ width: '1px', height: 16, bgcolor: '#2a2a2a', flexShrink: 0 }} />

				<Typography variant="caption"
					sx={{ color: '#555', fontFamily: 'monospace', fontSize: '0.6rem', flexShrink: 0 }}>
					{`PHASE ${Math.round(phaseOffset * 100)}%`}
				</Typography>
				<Slider size="small" min={-1} max={0.999} step={0.001}
					value={phaseOffset} onChange={(_, v) => setPhaseOffset(v as number)}
					sx={{ width: '80px', flexShrink: 0, color: '#22dd22',
					      '& .MuiSlider-thumb': { width: 10, height: 10 },
					      '& .MuiSlider-rail':  { bgcolor: '#333' } }}
				/>

				<Box sx={{ width: '1px', height: 16, bgcolor: '#2a2a2a', flexShrink: 0 }} />

				<Typography variant="caption"
					sx={{ color: '#555', fontFamily: 'monospace', fontSize: '0.6rem', flexShrink: 0 }}>
					{`LAT ${latencyCompSamples > 0 ? '+' : ''}${latencyCompSamples}smp`}
				</Typography>
				<Slider size="small" min={-512} max={512} step={1}
					value={latencyCompSamples} onChange={(_, v) => setLatencyCompSamples(v as number)}
					sx={{ width: '80px', flexShrink: 0, color: '#22dd22',
					      '& .MuiSlider-thumb': { width: 10, height: 10 },
					      '& .MuiSlider-rail':  { bgcolor: '#333' } }}
				/>
			</Box>

			{/* Canvas + overlays */}
			<Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
				<Canvas
					orthographic
					camera={{ left: -1, right: 1, top: 1, bottom: -1, near: -1, far: 1, position: [0, 0, 0] }}
					frameloop="demand"
					gl={{ antialias: false }}
					style={{ width: '100%', height: '100%', display: 'block' }}
				>
					<SweepSceneR3F
						activeChannels={activeChannels}
						scanFrequency={scanFrequency}
						sceneInputChannels={sceneInputChannels}
						triggerMode={triggerMode}
						phaseOffset={phaseOffset}
						latencyCompSamples={latencyCompSamples}
					/>
				</Canvas>

				{/* Per-lane labels */}
				{activeChannels.map((ch, i) => (
					<Box
						key={ch}
						sx={{
							position:      'absolute',
							top:           `${(i / nLanes) * 100}%`,
							left:          0,
							height:        `${100 / nLanes}%`,
							display:       'flex',
							alignItems:    'center',
							pl:            '10px',
							pointerEvents: 'none',
						}}
					>
						<Typography
							variant="caption"
							sx={{
								color:      channelHex(ch),
								fontFamily: 'monospace',
								fontWeight: 700,
								fontSize:   '0.7rem',
								opacity:    0.8,
								lineHeight: 1,
							}}
						>
							{CHANNEL_LABEL[ch]}
						</Typography>
					</Box>
				))}

				{/* Empty-state hint */}
				{nLanes === 0 && (
					<Box
						sx={{
							position:      'absolute',
							inset:         0,
							display:       'flex',
							alignItems:    'center',
							justifyContent:'center',
							pointerEvents: 'none',
						}}
					>
						<Typography
							variant="caption"
							sx={{ color: '#2a2a2a', fontFamily: 'monospace' }}
						>
							no channels wired to master output
						</Typography>
					</Box>
				)}

				{/* Full-width toggle */}
				<IconButton
					size="small"
					onClick={onToggleFullWidth}
					title={fullWidth ? 'Collapse to left column' : 'Expand to full width'}
					sx={{
						position: 'absolute',
						top:      4,
						right:    4,
						color:    '#444',
						'&:hover': { color: '#22dd22' },
					}}
				>
					{fullWidth
						? <CloseFullscreenIcon sx={{ fontSize: 14 }} />
						: <OpenInFullIcon      sx={{ fontSize: 14 }} />
					}
				</IconButton>
			</Box>
		</Box>
	);
}
