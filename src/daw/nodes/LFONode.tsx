import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startLFO, stopLFO,
	setLFOFrequency, setLFOType, setLFOMin, setLFOMax, setLFOPhase,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit, hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import { WAVE_ICONS, OSC_TYPES } from './WaveformIcons';
import type { LFOFlowNode, OscType } from '../../store/dawTypes';

const color = NODE_COLORS.source;

export const LFONode = memo(function LFONode({
	id,
	data,
	selected,
}: NodeProps<LFOFlowNode>) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [frequency, setFreqState] = useState(data.frequency ?? 1);
	const [oscType,   setOscType]   = useState<OscType>(data.type ?? 'sine');
	const [min,       setMinState]  = useState(data.min ?? -1);
	const [max,       setMaxState]  = useState(data.max ?? 1);
	const [phase,     setPhaseState] = useState(data.phase ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopLFO(id); setIsPlaying(false); }
		else           { await startLFO(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: OscType) => {
		setOscType(t);
		setLFOType(id, t);
	};

	const handleFreqChange = (v: number) => {
		setFreqState(v);
		setLFOFrequency(id, v);
	};

	const handleMinChange = (v: number) => {
		if (v >= max) return;
		setMinState(v);
		setLFOMin(id, v);
	};

	const handleMaxChange = (v: number) => {
		if (v <= min) return;
		setMaxState(v);
		setLFOMax(id, v);
	};

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label='LFO' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				{/* Wave type toggle — 4 across */}
				<Box className='nodrag' sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
					<Box sx={{ display: 'flex', gap: '1px' }}>
						{OSC_TYPES.map((t, i) => {
							const active = oscType === t;
							const lit    = hwLit(color);
							const radius = i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : '0';
							return (
								<Box
									key={t}
									onClick={() => handleTypeSelect(t)}
									sx={{
										flex:           1,
										display:        'flex',
										alignItems:     'center',
										justifyContent: 'center',
										py:             0.75,
										cursor:         'pointer',
										color:          active ? color : 'text.disabled',
										...(active ? lit : HW_RAISED),
										borderRadius:   radius,
										'&:hover': active
											? { ...lit, filter: 'brightness(1.1)' }
											: { background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)', color: 'text.secondary' },
									}}
								>
									{WAVE_ICONS[t](active, color)}
								</Box>
							);
						})}
					</Box>
					<Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center', letterSpacing: 0.5 }}>
						{oscType}
					</Typography>
				</Box>

				{/* Play / stop */}
				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop LFO' : 'Start LFO'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying
						? <StopIcon      sx={{ fontSize: 13 }} />
						: <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				{/* Frequency slider */}
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq'
						value={frequency}
						min={0.1} max={20} step={0.01}
						color={color}
						onChange={handleFreqChange}
						format={v => v.toFixed(2)}
						unit='Hz'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				{/* Min slider */}
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='min'
						value={min}
						min={-1} max={0} step={0.01}
						color={color}
						onChange={handleMinChange}
						format={v => v.toFixed(2)}
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				{/* Max slider */}
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='max'
						value={max}
						min={0} max={1} step={0.01}
						color={color}
						onChange={handleMaxChange}
						format={v => v.toFixed(2)}
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase'
						value={phase}
						min={0} max={360} step={1}
						color={color}
						onChange={(v) => { setPhaseState(v); setLFOPhase(id, v); }}
						format={v => String(v)}
						unit='°'
						allowValueEdit
					/>
				</Box>

			</Box>

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
