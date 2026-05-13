import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
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
import { NODE_COLORS } from './nodes/nodeColors';
import { METAL_BG }    from './nodes/metalBackground';
import { HW_INSET, hwToggleSx, hwIconBtn, hwSliderSx } from './nodes/hwStyles';

interface Props {
	height: number;
	fullWidth: boolean;
	onResize: (newHeight: number) => void;
	onToggleFullWidth: () => void;
}

export function SweepPanel({ height, fullWidth, onResize, onToggleFullWidth }: Props) {
	const color = NODE_COLORS.scene;
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
	const [phaseOffset, setPhaseOffset] = useState<number>(0);
	const [editingPhase, setEditingPhase] = useState(false);
	const [phaseInput,   setPhaseInput]   = useState('');
	const phaseInputRef = useRef<HTMLInputElement>(null);
	useEffect(() => { localStorage.setItem('sweep-trigger-mode',  triggerMode);         }, [triggerMode]);
	useEffect(() => { localStorage.setItem('sweep-phase-offset',  String(phaseOffset)); }, [phaseOffset]);

	const isDraggingRef     = useRef(false);
	const startYRef         = useRef(0);
	const startHeightRef    = useRef(height);
	const onResizeRef       = useRef(onResize);
	useEffect(() => { onResizeRef.current = onResize; }, [onResize]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('button, input, [role="slider"], [role="combobox"]')) return;
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
			{/* Trigger controls — also serves as drag handle */}
			<Box
				onMouseDown={handleMouseDown}
				sx={{ height: 28, flexShrink: 0, display: 'flex', alignItems: 'center',
				      gap: 1, px: 1, backgroundImage: METAL_BG, cursor: 'row-resize',
				      '&:hover': { backgroundImage: METAL_BG } }}
			>
				<ToggleButtonGroup
					exclusive size="small" value={triggerMode}
					onChange={(_, v) => v && setTriggerMode(v)}
					sx={[hwToggleSx(color), { flexShrink: 0, '& .MuiToggleButton-root': { py: 0.2, fontSize: 9 } }]}
				>
					<ToggleButton value="clock">CLK</ToggleButton>
					<ToggleButton value="edge">EDG</ToggleButton>
					<ToggleButton value="free">FREE</ToggleButton>
				</ToggleButtonGroup>

				<Box sx={{ width: '1px', height: 16, background: `${color}20`, flexShrink: 0 }} />

				{editingPhase ? (
					<Box sx={{ ...HW_INSET, px: 0.75, display: 'flex', alignItems: 'center', width: 60, flexShrink: 0 }}>
						<InputBase
							inputRef={phaseInputRef}
							value={phaseInput}
							onChange={e => setPhaseInput(e.target.value)}
							onBlur={() => {
								const p = parseFloat(phaseInput);
								if (!isNaN(p)) setPhaseOffset(Math.min(0.999, Math.max(-1, p / 100)));
								setEditingPhase(false);
							}}
							onKeyDown={e => {
								if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
								if (e.key === 'Escape') setEditingPhase(false);
							}}
							sx={{ fontSize: 9, color: 'text.secondary', width: '100%',
							      '& .MuiInputBase-input': { p: 0 } }}
						/>
					</Box>
				) : (
					<Typography variant="caption"
						onClick={() => { setPhaseInput(String(Math.round(phaseOffset * 100))); setEditingPhase(true); setTimeout(() => phaseInputRef.current?.select(), 0); }}
						sx={{ fontSize: 9, color: 'text.disabled', flexShrink: 0, cursor: 'text', userSelect: 'none', minWidth: 72 }}>
						{`PHASE ${Math.round(phaseOffset * 100)}%`}
					</Typography>
				)}
				<Slider size="small" min={-1} max={0.999} step={0.001}
					value={phaseOffset} onChange={(_, v) => setPhaseOffset(v as number)}
					sx={[hwSliderSx(color), {
						width: '160px', flexShrink: 0,
						'& .MuiSlider-rail':  { height: 4 },
						'& .MuiSlider-track': { height: 4 },
						'& .MuiSlider-thumb': { width: 10, height: 10 },
					}]}
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
					sx={{ ...hwIconBtn(color), p: 0.5, position: 'absolute', top: 4, right: 4 }}
				>
					{fullWidth
						? <CloseFullscreenIcon sx={{ fontSize: 12 }} />
						: <OpenInFullIcon      sx={{ fontSize: 12 }} />
					}
				</IconButton>
			</Box>
		</Box>
	);
}
