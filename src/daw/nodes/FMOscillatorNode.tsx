import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startFMOscillator, stopFMOscillator,
	setFMOscillatorFrequency, setFMOscillatorType, setFMOscillatorModulationType,
	setFMOscillatorModulationIndex, setFMOscillatorHarmonicity,
	setFMOscillatorDetune, setFMOscillatorPhase,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit, hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import { WAVE_ICONS, OSC_TYPES } from './WaveformIcons';
import type { FMOscillatorFlowNode, OscType } from '../../store/dawTypes';

const color = NODE_COLORS.source;

function WaveRow({
	value, label: rowLabel, onChange,
}: { value: OscType; label: string; onChange: (t: OscType) => void }) {
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
			<Typography sx={{ fontSize: 8, color: 'text.disabled', letterSpacing: 0.5, textTransform: 'uppercase' }}>
				{rowLabel}
			</Typography>
			<Box sx={{ display: 'flex', gap: '1px' }}>
				{OSC_TYPES.map((t, i) => {
					const active = value === t;
					const lit    = hwLit(color);
					const radius = i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : '0';
					return (
						<Box
							key={t}
							onClick={() => onChange(t)}
							sx={{
								flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
								py: 0.5, cursor: 'pointer',
								color:        active ? color : 'text.disabled',
								...(active ? lit : HW_RAISED),
								borderRadius: radius,
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
		</Box>
	);
}

export const FMOscillatorNode = memo(function FMOscillatorNode({
	id,
	data,
	selected,
}: NodeProps<FMOscillatorFlowNode>) {
	const [isPlaying,       setIsPlaying]       = useState(false);
	const [frequency,       setFreqState]        = useState(data.frequency       ?? 440);
	const [oscType,         setOscType]          = useState<OscType>(data.type           ?? 'sine');
	const [modType,         setModType]          = useState<OscType>(data.modulationType  ?? 'square');
	const [modulationIndex, setModIndexState]    = useState(data.modulationIndex  ?? 10);
	const [harmonicity,     setHarmonicityState] = useState(data.harmonicity      ?? 3);
	const [detune,          setDetuneState]      = useState(data.detune           ?? 0);
	const [phase,           setPhaseState]       = useState(data.phase            ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopFMOscillator(id); setIsPlaying(false); }
		else           { await startFMOscillator(id); setIsPlaying(true); }
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
			<NodeHeader id={id} label='FM Osc' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<Box className='nodrag'>
					<WaveRow value={oscType} label='carrier' onChange={(t) => { setOscType(t); setFMOscillatorType(id, t); }} />
				</Box>

				<Box className='nodrag'>
					<WaveRow value={modType} label='mod type' onChange={(t) => { setModType(t); setFMOscillatorModulationType(id, t); }} />
				</Box>

				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop FM oscillator' : 'Start FM oscillator'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq' value={frequency} min={20} max={4000} step={1}
						color={color} onChange={(v) => { setFreqState(v); setFMOscillatorFrequency(id, v); }}
						format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='mod idx' value={modulationIndex} min={0} max={50} step={0.1}
						color={color} onChange={(v) => { setModIndexState(v); setFMOscillatorModulationIndex(id, v); }}
						format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='harmonicity' value={harmonicity} min={0} max={20} step={0.1}
						color={color} onChange={(v) => { setHarmonicityState(v); setFMOscillatorHarmonicity(id, v); }}
						format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setFMOscillatorDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase' value={phase} min={0} max={360} step={1}
						color={color} onChange={(v) => { setPhaseState(v); setFMOscillatorPhase(id, v); }}
						format={v => String(v)} unit='°' allowValueEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={outputHandleStyle(color)} />
			{outputLabel('out', color)}
		</Box>
	);
});
