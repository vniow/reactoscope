import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startFatOscillator, stopFatOscillator,
	setFatOscillatorFrequency, setFatOscillatorType,
	setFatOscillatorCount, setFatOscillatorSpread,
	setFatOscillatorDetune, setFatOscillatorPhase,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit, hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import { WAVE_ICONS, OSC_TYPES } from './WaveformIcons';
import type { FatOscillatorFlowNode, OscType } from '../../store/dawTypes';

const color = NODE_COLORS.source;

export const FatOscillatorNode = memo(function FatOscillatorNode({
	id,
	data,
	selected,
}: NodeProps<FatOscillatorFlowNode>) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [frequency, setFreqState] = useState(data.frequency ?? 440);
	const [oscType,   setOscType]   = useState<OscType>(data.type ?? 'sawtooth');
	const [count,     setCountState] = useState(data.count  ?? 3);
	const [spread,    setSpreadState] = useState(data.spread ?? 20);
	const [detune,    setDetuneState] = useState(data.detune ?? 0);
	const [phase,     setPhaseState]  = useState(data.phase  ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopFatOscillator(id); setIsPlaying(false); }
		else           { await startFatOscillator(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: OscType) => {
		setOscType(t);
		setFatOscillatorType(id, t);
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
			<NodeHeader id={id} label='Fat Osc' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				{/* Wave type toggle */}
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

				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop fat oscillator' : 'Start fat oscillator'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq' value={frequency} min={20} max={4000} step={1}
						color={color} onChange={(v) => { setFreqState(v); setFatOscillatorFrequency(id, v); }}
						format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='voices' value={count} min={1} max={5} step={1}
						color={color} onChange={(v) => { setCountState(Math.round(v)); setFatOscillatorCount(id, v); }}
						format={v => String(Math.round(v))} allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='spread' value={spread} min={0} max={100} step={1}
						color={color} onChange={(v) => { setSpreadState(v); setFatOscillatorSpread(id, v); }}
						format={v => String(v)} unit='¢' allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setFatOscillatorDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase' value={phase} min={0} max={360} step={1}
						color={color} onChange={(v) => { setPhaseState(v); setFatOscillatorPhase(id, v); }}
						format={v => String(v)} unit='°' allowValueEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={outputHandleStyle(color)} />
			{outputLabel('out', color)}
		</Box>
	);
});
