import { memo, useMemo, useState } from 'react';
import { useDawStore } from '../../store/daw';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RemoveIcon from '@mui/icons-material/Remove';
import StopIcon from '@mui/icons-material/Stop';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { METAL_BG } from './metalBackground';
import {
	hwSelectSx, hwSelectMenuProps, hwMenuItemSx, hwIconBtn, hwIconBtnLit, hwAlertSx,
} from './hwStyles';
import { HwButton, HwLed, HwToggleButtonGroup } from './hwComponents';
import { HwArcSlider } from '../../components/HwArcSlider';
import { HwSliderField } from '../../components/HwSliderField';
import type { DebugFlowNode } from '../../store/dawTypes';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sect({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<Box>
			<Typography variant='caption' color='text.disabled'
				sx={{ fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
				{label}
			</Typography>
			{children}
		</Box>
	);
}

// ─── Node type options ────────────────────────────────────────────────────────

const NODE_TYPES = [
	{ key: 'source',    label: 'src'   },
	{ key: 'processor', label: 'proc'  },
	{ key: 'scene',     label: 'scene' },
	{ key: 'output',    label: 'out'   },
	{ key: 'debug',     label: 'dbg'   },
	{ key: 'dynamics',  label: 'dyn'   },
	{ key: 'effects',   label: 'fx'    },
	{ key: 'utility',   label: 'util'  },
] as const;

type NodeTypeKey = typeof NODE_TYPES[number]['key'];

// ─── Handle layout helpers ────────────────────────────────────────────────────

const HANDLE_SPACING_PX = { tight: 20, normal: 32, loose: 48 } as const;
const HANDLE_PAD        = 14; // px from content-area edge for top/bottom alignment

function computeHandleTops(
	count:   number,
	spacing: keyof typeof HANDLE_SPACING_PX,
	align:   'top' | 'center' | 'bottom',
): string[] {
	const s     = HANDLE_SPACING_PX[spacing];
	const total = (count - 1) * s;
	return Array.from({ length: count }, (_, i) => {
		const off = i * s;
		if (align === 'top')
			return `${NODE_HEADER_HEIGHT + HANDLE_PAD + off}px`;
		if (align === 'bottom')
			return `calc(100% - ${HANDLE_PAD + total - off}px)`;
		const delta = off - total / 2;
		return delta === 0
			? `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`
			: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2 + ${delta}px)`;
	});
}

// ─── Node ─────────────────────────────────────────────────────────────────────

export const DebugNode = memo(function DebugNode({
	id,
	data,
	selected,
}: NodeProps<DebugFlowNode>) {
	const [nodeType, setNodeType] = useState<NodeTypeKey>('debug');
	const [slider,   setSlider]   = useState(0.65);
	const [select,   setSelect]   = useState('sine');
	const [playing,  setPlaying]  = useState(false);
	const [muted,    setMuted]    = useState(false);
	const [checks,   setChecks]   = useState([true, false, false]);
	const [radio,    setRadio]    = useState(0);
	const [litBtn,   setLitBtn]   = useState(false);
	const [arcGain,  setArcGain]  = useState(0.75);
	const [inCount,   setInCount]   = useState(3);
	const [inSpacing, setInSpacing] = useState<keyof typeof HANDLE_SPACING_PX>('normal');
	const [inAlign,   setInAlign]   = useState<'top' | 'center' | 'bottom'>('center');

	const edgePathType    = useDawStore(s => s.edgePathType);
	const setEdgePathType = useDawStore(s => s.setEdgePathType);

	const color = NODE_COLORS[nodeType];

	const sx = useMemo(() => ({
		select:      hwSelectSx(color, 'medium'),
		selectMenu:  hwSelectMenuProps(color),
		menuItem:    hwMenuItemSx(color),
		iconBtn:     hwIconBtn(color),
		iconBtnLit:  hwIconBtnLit(color),
		alert:       hwAlertSx('error'),
	}), [color]);

	const toggleCheck = (i: number) =>
		setChecks(c => c.map((v, j) => j === i ? !v : v));

	const handleTops     = computeHandleTops(inCount, inSpacing, inAlign);
	const rightHandleTop = `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`;

	return (
		<Box sx={{
			borderRadius:    1,
			boxShadow:       `0 0 20px ${color}40`,
			backgroundImage: METAL_BG,
			width:           4 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={color} />

			<Box sx={{ pl: 4.5, pr: 4.5, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75, overflow: 'hidden' }}
				className='nodrag nowheel'>

				{/* Node type — 3×3 grid */}
				<Sect label='node type'>
					<HwToggleButtonGroup color={color} cols={3} value={nodeType} exclusive
						onChange={(_, v) => v && setNodeType(v as NodeTypeKey)}>
						{NODE_TYPES.map(t => (
							<ToggleButton key={t.key} value={t.key}>{t.label}</ToggleButton>
						))}
					</HwToggleButtonGroup>
				</Sect>

				{/* 2-column body */}
				<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, alignItems: 'start' }}>

					{/* ── Left column ── */}
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>

						<Sect label='edges'>
							<HwToggleButtonGroup color={color} cols={2} value={edgePathType} exclusive
								onChange={(_, v) => v && setEdgePathType(v)}>
								<ToggleButton value='bezier'>bez</ToggleButton>
								<ToggleButton value='straight'>str</ToggleButton>
								<ToggleButton value='step'>step</ToggleButton>
								<ToggleButton value='smoothstep'>smth</ToggleButton>
							</HwToggleButtonGroup>
						</Sect>

						<Sect label='checkbox'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								{['send', 'eq', 'comp'].map((l, i) => (
									<Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
										<HwLed checked={checks[i]} color={color} onClick={() => toggleCheck(i)} />
										<Typography variant='caption' color={checks[i] ? 'text.primary' : 'text.secondary'} sx={{ fontSize: 11 }}>{l}</Typography>
									</Box>
								))}
							</Box>
						</Sect>

						<Sect label='buttons'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								<HwButton color={color}>action</HwButton>
								<HwButton color={color} lit={litBtn} onClick={() => setLitBtn(v => !v)}>toggle</HwButton>
							</Box>
						</Sect>

					</Box>

					{/* ── Right column ── */}
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>

						<Sect label='select'>
							<Select value={select} onChange={e => setSelect(e.target.value)} fullWidth
								sx={sx.select} MenuProps={sx.selectMenu}>
								{['sine', 'square', 'triangle', 'sawtooth'].map(t => (
									<MenuItem key={t} value={t} sx={sx.menuItem}>{t}</MenuItem>
								))}
							</Select>
						</Sect>

						<Sect label='radio'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								{['mono', 'stereo', 'mid'].map((l, i) => (
									<Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
										<HwLed checked={radio === i} round color={color} onClick={() => setRadio(i)} />
										<Typography variant='caption' color={radio === i ? 'text.primary' : 'text.secondary'} sx={{ fontSize: 11 }}>{l}</Typography>
									</Box>
								))}
							</Box>
						</Sect>

						<Sect label='icon btns'>
							<Box sx={{ display: 'flex', gap: 0.5 }}>
								<IconButton size='small' onClick={() => setPlaying(v => !v)}
									sx={playing ? sx.iconBtnLit : sx.iconBtn}>
									<PlayArrowIcon sx={{ fontSize: 14 }} />
								</IconButton>
								<IconButton size='small' onClick={() => setPlaying(false)}
									sx={sx.iconBtn}>
									<StopIcon sx={{ fontSize: 14 }} />
								</IconButton>
								<IconButton size='small' onClick={() => setMuted(v => !v)}
									sx={muted ? sx.iconBtnLit : sx.iconBtn}>
									<VolumeOffIcon sx={{ fontSize: 14 }} />
								</IconButton>
							</Box>
						</Sect>

					</Box>
				</Box>

				{/* Arc + standard slider side by side */}
				<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
					<Sect label='arc'>
						<HwArcSlider label='gain' value={arcGain} min={0} max={1} step={0.01}
							color={color} onChange={setArcGain} format={v => v.toFixed(2)}
							allowValueEdit allowBoundsEdit size={68} />
					</Sect>
					<Box sx={{ flex: 1 }}>
						<Sect label='slider'>
							<HwSliderField
								label='gain'
								value={slider} min={0} max={1} step={0.01}
								color={color}
								onChange={setSlider}
								format={v => v.toFixed(2)}
								allowValueEdit allowBoundsEdit
							/>
						</Sect>
					</Box>
				</Box>

				<Alert severity='error' sx={sx.alert}>sample error</Alert>

				{/* Handles section */}
				<Sect label='handles'>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
							<IconButton size='small' disabled={inCount <= 1}
								onClick={() => setInCount(c => Math.max(1, c - 1))} sx={sx.iconBtn}>
								<RemoveIcon sx={{ fontSize: 12 }} />
							</IconButton>
							<Typography variant='caption'
								sx={{ fontSize: 11, color: 'text.secondary', minWidth: 14, textAlign: 'center' }}>
								{inCount}
							</Typography>
							<IconButton size='small' disabled={inCount >= 8}
								onClick={() => setInCount(c => Math.min(8, c + 1))} sx={sx.iconBtn}>
								<AddIcon sx={{ fontSize: 12 }} />
							</IconButton>
						</Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
							<Typography variant='caption' color='text.disabled'
								sx={{ fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>space</Typography>
							<HwToggleButtonGroup color={color} value={inSpacing} exclusive
								onChange={(_, v) => v && setInSpacing(v as keyof typeof HANDLE_SPACING_PX)}>
								<ToggleButton value='tight'>tight</ToggleButton>
								<ToggleButton value='normal'>med</ToggleButton>
								<ToggleButton value='loose'>loose</ToggleButton>
							</HwToggleButtonGroup>
						</Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
							<Typography variant='caption' color='text.disabled'
								sx={{ fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>align</Typography>
							<HwToggleButtonGroup color={color} value={inAlign} exclusive
								onChange={(_, v) => v && setInAlign(v as 'top' | 'center' | 'bottom')}>
								<ToggleButton value='top'>top</ToggleButton>
								<ToggleButton value='center'>ctr</ToggleButton>
								<ToggleButton value='bottom'>bot</ToggleButton>
							</HwToggleButtonGroup>
						</Box>
					</Box>
				</Sect>

			</Box>

			{/* Left input handles — circle icon */}
			{handleTops.map((top, i) => (
				<Handle key={i} type='target' position={Position.Left} id={`in-${i}`}
					style={{
						width:        16,
						height:       16,
						borderRadius: '50%',
						background:   color,
						border:       'none',
						boxShadow:    `0 0 8px ${color}80`,
						top,
						zIndex:       10,
					}} />
			))}

			{/* Right output handle — right-pointing triangle */}
			<Handle type='source' position={Position.Right} id='out-0'
				style={{
					width:        16,
					height:       18,
					borderRadius: 0,
					background:   color,
					border:       'none',
					clipPath:     'polygon(0% 0%, 100% 50%, 0% 100%)',
					filter:       `drop-shadow(0 0 5px ${color}80)`,
					top:          rightHandleTop,
					zIndex:       10,
				}} />

			{/* Bottom output handle — downward-pointing triangle */}
			<Handle type='source' position={Position.Bottom} id='out-1'
				style={{
					width:        18,
					height:       16,
					borderRadius: 0,
					background:   color,
					border:       'none',
					clipPath:     'polygon(0% 0%, 100% 0%, 50% 100%)',
					filter:       `drop-shadow(0 0 5px ${color}80)`,
					zIndex:       10,
				}} />
		</Box>
	);
});
