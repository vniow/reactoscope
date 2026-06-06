import { memo, useMemo, useState, Fragment } from 'react';
import { useDawStore } from '../../store/daw';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import {
	HW_INSET, HW_RAISED, hwLit,
	hwBtn, hwBtnLit, hwToggleSx, hwSelectSx, hwSelectMenuProps, hwSliderSx, hwIconBtn, hwIconBtnLit,
} from './hwStyles';
import { HwSwitch, HwLed, HwLevelMeter } from './hwComponents';
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

// ─── Sizing explorer ──────────────────────────────────────────────────────────

const SIZES = [
	{ label: 'XS', fontSize: 9,  iconSize: 12, btnPx: 1,   btnPy: 0.2,  iconPad: 0.5,  togglePy: 0.2,  sliderRail: 4, sliderThumb: 10, selectPy: '3px', selectPx: '6px'  },
	{ label: 'S',  fontSize: 10, iconSize: 14, btnPx: 1.5, btnPy: 0.5,  iconPad: 0.75, togglePy: 0.35, sliderRail: 6, sliderThumb: 14, selectPy: '5px', selectPx: '8px'  },
	{ label: 'M',  fontSize: 11, iconSize: 16, btnPx: 2,   btnPy: 0.75, iconPad: 1,    togglePy: 0.55, sliderRail: 8, sliderThumb: 18, selectPy: '7px', selectPx: '10px' },
] as const;

const LABEL_POSITIONS = ['top', 'left', 'right', 'below'] as const;
type LabelPos = typeof LABEL_POSITIONS[number];

const GRID_SX = { display: 'grid', gridTemplateColumns: '24px repeat(3, 1fr)', gap: 0.75, alignItems: 'center' };
const POS_LABEL_SX = { fontSize: 8, color: 'text.disabled', lineHeight: 1, letterSpacing: 0.3 };
const SZ_HEADER_SX = { fontSize: 8, color: 'text.disabled', lineHeight: 1, letterSpacing: 0.8, textAlign: 'center' };

function LabelWrap({ pos, label, children }: { pos: LabelPos; label: string; children: React.ReactNode }) {
	const cap = (
		<Typography variant='caption'
			sx={{ fontSize: 9, color: 'text.disabled', userSelect: 'none', lineHeight: 1, flexShrink: 0 }}>
			{label}
		</Typography>
	);
	if (pos === 'top')   return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>{cap}{children}</Box>;
	if (pos === 'left')  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{cap}{children}</Box>;
	if (pos === 'right') return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{children}{cap}</Box>;
	return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>{children}{cap}</Box>;
}

function InlineLed({ size, checked, color }: { size: number; checked: boolean; color: string }) {
	const dotSize = Math.round(size * 0.4);
	return (
		<Box sx={{
			width: size, height: size, flexShrink: 0,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			...(checked ? hwLit(color) : HW_RAISED), borderRadius: '2px',
		}}>
			{checked && <Box sx={{ width: dotSize, height: dotSize, borderRadius: '1px', bgcolor: color, boxShadow: `0 0 5px ${color}e0` }} />}
		</Box>
	);
}

function InlineSwitch({ width, height, checked, color }: { width: number; height: number; checked: boolean; color: string }) {
	const thumbSize = height - 4;
	return (
		<Box sx={{
			...(checked ? { ...hwLit(color), borderRadius: `${height / 2}px` } : { ...HW_INSET, borderRadius: `${height / 2}px` }),
			width, height, position: 'relative', flexShrink: 0,
		}}>
			<Box sx={{
				position: 'absolute', top: '50%', transform: 'translateY(-50%)',
				left: checked ? `${width - thumbSize - 2}px` : '2px',
				width: thumbSize, height: thumbSize, borderRadius: '50%',
				transition: 'left 120ms ease',
				...(checked
					? { background: color, boxShadow: `0 0 6px ${color}99, 0 1px 2px rgba(0,0,0,0.4)` }
					: { background: 'linear-gradient(to bottom, #484850, #343438)', boxShadow: '0 1px 3px rgba(0,0,0,0.55)' }
				),
			}} />
		</Box>
	);
}

const LED_SIZES  = [10, 14, 18] as const;
const SW_WIDTHS  = [24, 32, 40] as const;
const SW_HEIGHTS = [14, 18, 22] as const;

function SizeRow({ pos, children }: { pos: LabelPos; children: (pos: LabelPos, sizeIdx: number) => React.ReactNode }) {
	return (
		<Fragment>
			<Typography variant='caption' sx={POS_LABEL_SX}>{pos}</Typography>
			{SIZES.map((sz, i) => (
				<Box key={sz.label} sx={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
					<LabelWrap pos={pos} label={sz.label.toLowerCase()}>
						{children(pos, i)}
					</LabelWrap>
				</Box>
			))}
		</Fragment>
	);
}

function SizeHeader() {
	return (
		<Fragment>
			<Box />
			{SIZES.map(sz => (
				<Typography key={sz.label} variant='caption' sx={SZ_HEADER_SX}>{sz.label}</Typography>
			))}
		</Fragment>
	);
}

function SizingExplorer({ color }: { color: string }) {
	const toggle     = useMemo(() => hwToggleSx(color),       [color]);
	const slider     = useMemo(() => hwSliderSx(color),       [color]);
	const select     = useMemo(() => hwSelectSx(color),       [color]);
	const selectMenu = useMemo(() => hwSelectMenuProps(color), [color]);

	const [sliderVal, setSliderVal] = useState(0.5);
	const [toggleVal, setToggleVal] = useState('a');
	const [selectVal, setSelectVal] = useState('sine');
	const [ledOn,     setLedOn]     = useState(true);
	const [swOn,      setSwOn]      = useState(true);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

			{/* ── Icon Button ── */}
			<Sect label='icon button'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => (
								<IconButton size='small' sx={{ ...hwIconBtn(color), p: SIZES[i].iconPad }}>
									<PlayArrowIcon sx={{ fontSize: SIZES[i].iconSize }} />
								</IconButton>
							)}
						</SizeRow>
					))}
				</Box>
			</Sect>

			{/* ── Button ── */}
			<Sect label='button'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => (
								<Button sx={{ ...hwBtn(color), fontSize: SIZES[i].fontSize, px: SIZES[i].btnPx, py: SIZES[i].btnPy }}>
									btn
								</Button>
							)}
						</SizeRow>
					))}
				</Box>
			</Sect>

			{/* ── Toggle ── */}
			<Sect label='toggle'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => (
								<ToggleButtonGroup exclusive value={toggleVal} onChange={(_, v) => v && setToggleVal(v)}
									sx={[toggle, {
										'& .MuiToggleButton-root':             { py: SIZES[i].togglePy, fontSize: SIZES[i].fontSize },
										'& .MuiToggleButton-root.Mui-selected': { py: SIZES[i].togglePy, fontSize: SIZES[i].fontSize },
									}]}>
									<ToggleButton value='a'>A</ToggleButton>
									<ToggleButton value='b'>B</ToggleButton>
								</ToggleButtonGroup>
							)}
						</SizeRow>
					))}
				</Box>
			</Sect>

			{/* ── Slider ── */}
			<Sect label='slider'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => (
								<Slider size='small' min={0} max={1} step={0.01} value={sliderVal}
									onChange={(_, v) => setSliderVal(v as number)}
									sx={[slider, {
										width: 56, flexShrink: 0,
										'& .MuiSlider-rail':  { height: SIZES[i].sliderRail },
										'& .MuiSlider-track': { height: SIZES[i].sliderRail },
										'& .MuiSlider-thumb': { width: SIZES[i].sliderThumb, height: SIZES[i].sliderThumb },
									}]}
								/>
							)}
						</SizeRow>
					))}
				</Box>
			</Sect>

			{/* ── Select ── */}
			<Sect label='select'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => (
								<Select value={selectVal} onChange={e => setSelectVal(e.target.value)}
									sx={{ ...select, fontSize: SIZES[i].fontSize, '& .MuiSelect-select': { py: SIZES[i].selectPy, px: SIZES[i].selectPx } }}
									MenuProps={selectMenu}>
									{['sine', 'sq', 'tri', 'saw'].map(t => (
										<MenuItem key={t} value={t} sx={{ fontSize: SIZES[i].fontSize }}>{t}</MenuItem>
									))}
								</Select>
							)}
						</SizeRow>
					))}
				</Box>
			</Sect>

			{/* ── LED ── */}
			<Sect label='led'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => <InlineLed size={LED_SIZES[i]} checked={ledOn} color={color} />}
						</SizeRow>
					))}
				</Box>
				<Box sx={{ mt: 0.5 }}>
					<Button sx={{ ...hwBtn(color), fontSize: 9, px: 1, py: 0.2 }} onClick={() => setLedOn(v => !v)}>
						toggle
					</Button>
				</Box>
			</Sect>

			{/* ── Switch ── */}
			<Sect label='switch'>
				<Box sx={GRID_SX}>
					<SizeHeader />
					{LABEL_POSITIONS.map(pos => (
						<SizeRow key={pos} pos={pos}>
							{(_, i) => <InlineSwitch width={SW_WIDTHS[i]} height={SW_HEIGHTS[i]} checked={swOn} color={color} />}
						</SizeRow>
					))}
				</Box>
				<Box sx={{ mt: 0.5 }}>
					<Button sx={{ ...hwBtn(color), fontSize: 9, px: 1, py: 0.2 }} onClick={() => setSwOn(v => !v)}>
						toggle
					</Button>
				</Box>
			</Sect>

		</Box>
	);
}

// ─── Node type options ────────────────────────────────────────────────────────

const NODE_TYPES = [
	{ key: 'source',    label: 'src' },
	{ key: 'processor', label: 'proc' },
	{ key: 'scene',     label: 'scene' },
	{ key: 'output',    label: 'out' },
	{ key: 'debug',     label: 'dbg' },
	{ key: 'dynamics',  label: 'dyn' },
	{ key: 'effects',   label: 'fx' },
	{ key: 'utility',   label: 'util' },
] as const;

type NodeTypeKey = typeof NODE_TYPES[number]['key'];

// ─── Node ─────────────────────────────────────────────────────────────────────

export const DebugNode = memo(function DebugNode({
	id,
	data,
	selected,
}: NodeProps<DebugFlowNode>) {
	const [nodeType, setNodeType] = useState<NodeTypeKey>('debug');
	const [slider,   setSlider]   = useState(0.65);
	const [wave,     setWave]     = useState('sine');
	const [select,   setSelect]   = useState('sine');
	const [routing,  setRouting]  = useState('bus 1');
	const [slope,    setSlope]    = useState('12 dB/oct');
	const [sw,       setSw]       = useState(false);
	const [playing,  setPlaying]  = useState(false);
	const [muted,    setMuted]    = useState(false);
	const [checks,   setChecks]   = useState([true, false, false]);
	const [radio,    setRadio]    = useState(0);
	const [litBtn,   setLitBtn]   = useState(false);
	const [input,    setInput]    = useState('440');

	const [sizingMode, setSizingMode] = useState(false);

	const edgePathType    = useDawStore(s => s.edgePathType);
	const setEdgePathType = useDawStore(s => s.setEdgePathType);

	const color = NODE_COLORS[nodeType];

	const sx = useMemo(() => ({
		toggle:     hwToggleSx(color),
		slider:     hwSliderSx(color),
		select:     hwSelectSx(color),
		selectMenu: hwSelectMenuProps(color),
		iconBtn:    hwIconBtn(color),
		iconBtnLit: hwIconBtnLit(color),
		btn:        hwBtn(color),
		btnLit:     hwBtnLit(color),
	}), [color]);

	const toggleCheck = (i: number) =>
		setChecks(c => c.map((v, j) => j === i ? !v : v));

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           4 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75, overflow: 'hidden' }}
				className='nodrag nowheel'>

				{/* Node type — full width */}
				<Sect label='node type'>
					<ToggleButtonGroup value={nodeType} exclusive onChange={(_, v) => v && setNodeType(v as NodeTypeKey)}
						sx={sx.toggle}>
						{NODE_TYPES.map(t => (
							<ToggleButton key={t.key} value={t.key}>{t.label}</ToggleButton>
						))}
					</ToggleButtonGroup>
				</Sect>

				<Sect label='view'>
					<ToggleButtonGroup exclusive value={sizingMode ? 'size' : 'elem'}
						onChange={(_, v) => v && setSizingMode(v === 'size')}
						sx={sx.toggle}>
						<ToggleButton value='elem'>ELEM</ToggleButton>
						<ToggleButton value='size'>SIZE</ToggleButton>
					</ToggleButtonGroup>
				</Sect>

				{sizingMode ? <SizingExplorer color={color} /> : <>

				{/* 3-column body */}
				<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, alignItems: 'start' }}>

					{/* ── Column 1 ── */}
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
						<Sect label='slider'>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>gain</Typography>
								<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>{slider.toFixed(2)}</Typography>
							</Box>
							<Slider size='small' min={0} max={1} step={0.01} value={slider}
								onChange={(_, v) => setSlider(v as number)} sx={sx.slider} />
						</Sect>

						<Sect label='switch'>
							<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
								<Typography variant='caption' color={sw ? color : 'text.disabled'} sx={{ fontSize: 9 }}>on</Typography>
								<HwSwitch checked={sw} color={color} onChange={() => setSw(v => !v)} />
								<Typography variant='caption' color={sw ? 'text.disabled' : 'text.secondary'} sx={{ fontSize: 9 }}>off</Typography>
							</Box>
						</Sect>

						<Sect label='buttons'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								<Button sx={sx.btn}>action</Button>
								<Button sx={litBtn ? sx.btnLit : sx.btn} onClick={() => setLitBtn(v => !v)}>toggle</Button>
							</Box>
						</Sect>

						<Sect label='edges'>
							<ToggleButtonGroup value={edgePathType} exclusive
								onChange={(_, v) => v && setEdgePathType(v)}
								sx={{ ...sx.toggle, flexWrap: 'wrap' }}>
								<ToggleButton value='bezier'>bez</ToggleButton>
								<ToggleButton value='straight'>str</ToggleButton>
								<ToggleButton value='step'>step</ToggleButton>
								<ToggleButton value='smoothstep'>smth</ToggleButton>
							</ToggleButtonGroup>
						</Sect>
					</Box>

					{/* ── Column 2 ── */}
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
						<Sect label='toggle'>
							<ToggleButtonGroup value={wave} exclusive onChange={(_, v) => v && setWave(v)}
								sx={{ ...sx.toggle, flexWrap: 'wrap' }}>
								{[{ v: 'sine', l: 'sin' }, { v: 'square', l: 'sq' }, { v: 'tri', l: 'tri' }, { v: 'saw', l: 'saw' }].map(t => (
									<ToggleButton key={t.v} value={t.v}>{t.l}</ToggleButton>
								))}
							</ToggleButtonGroup>
						</Sect>

						<Sect label='checkbox'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								{['send', 'eq', 'comp'].map((l, i) => (
									<Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
										<HwLed checked={checks[i]} color={color} onClick={() => toggleCheck(i)} />
										<Typography variant='caption' color={checks[i] ? 'text.primary' : 'text.secondary'} sx={{ fontSize: 10 }}>{l}</Typography>
									</Box>
								))}
							</Box>
						</Sect>

						<Sect label='radio'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								{['mono', 'stereo', 'mid'].map((l, i) => (
									<Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
										<HwLed checked={radio === i} round color={color} onClick={() => setRadio(i)} />
										<Typography variant='caption' color={radio === i ? 'text.primary' : 'text.secondary'} sx={{ fontSize: 10 }}>{l}</Typography>
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

					{/* ── Column 3 ── */}
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
						<Sect label='select'>
							<Select value={select} onChange={e => setSelect(e.target.value)} fullWidth
								sx={sx.select} MenuProps={sx.selectMenu}>
								{['sine', 'square', 'triangle', 'sawtooth'].map(t => (
									<MenuItem key={t} value={t} sx={{ fontSize: 11 }}>{t}</MenuItem>
								))}
							</Select>
						</Sect>

						<Sect label='routing'>
							<Select value={routing} onChange={e => setRouting(e.target.value)} fullWidth
								sx={sx.select} MenuProps={sx.selectMenu}>
								{['bus 1', 'bus 2', 'aux send', 'master'].map(t => (
									<MenuItem key={t} value={t} sx={{ fontSize: 11 }}>{t}</MenuItem>
								))}
							</Select>
						</Sect>

						<Sect label='slope'>
							<Select value={slope} onChange={e => setSlope(e.target.value)} fullWidth
								sx={sx.select} MenuProps={sx.selectMenu}>
								{['6 dB/oct', '12 dB/oct', '24 dB/oct', '48 dB/oct'].map(t => (
									<MenuItem key={t} value={t} sx={{ fontSize: 11 }}>{t}</MenuItem>
								))}
							</Select>
						</Sect>

						<Sect label='level'>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
								<HwLevelMeter value={65} color={color} />
								<HwLevelMeter value={48} color={color} />
							</Box>
						</Sect>

						<Sect label='input'>
							<Box sx={{ ...HW_INSET, px: 0.75, display: 'flex', alignItems: 'center' }}>
								<InputBase value={input} onChange={e => setInput(e.target.value)}
									sx={{ flex: 1, fontSize: 11, color: 'text.primary',
										'& .MuiInputBase-input': { p: '4px 0', textAlign: 'right' } }} />
							</Box>
						</Sect>
					</Box>

				</Box>

				{/* Full-width bottom */}
				<Alert severity='error' sx={{ py: 0.25, fontSize: 11 }}>sample error</Alert>

				<Sect label='text'>
					<Box sx={{ display: 'flex', gap: 1.5 }}>
						<Typography variant='caption' color='text.primary'   sx={{ fontSize: 10 }}>primary</Typography>
						<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>secondary</Typography>
						<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>disabled</Typography>
					</Box>
				</Sect>

				</>}

			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(color), top: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)` }}
			/>
			{inputLabel('in', `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`, color)}
			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(color)}
			/>
			{outputLabel('out', color)}
		</Box>
	);
});
