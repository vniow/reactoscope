import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startOscillator, stopOscillator,
	setOscillatorFrequency, setOscillatorType, setOscillatorDetune, setOscillatorPhase,
} from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HW_RAISED, hwLit } from '../shared/hwStyles';
import { HwButton } from '../shared/hwComponents';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import { WAVE_ICONS, OSC_TYPES } from '../shared/WaveformIcons';
import type { OscillatorFlowNode, OscType } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

// ─── Component ────────────────────────────────────────────────────────────────

export const OscillatorNode = memo(function OscillatorNode({
	id,
	data,
	selected,
}: NodeProps<OscillatorFlowNode>) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [frequency, setFreqState] = useState(data.frequency ?? 440);
	const [oscType,   setOscType]   = useState<OscType>(data.type ?? 'sine');
	const [detune,    setDetuneState] = useState(data.detune ?? 0);
	const [phase,     setPhaseState]  = useState(data.phase ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopOscillator(id); setIsPlaying(false); }
		else           { await startOscillator(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: OscType) => {
		setOscType(t);
		setOscillatorType(id, t);
	};

	const handleFreqChange = (v: number) => {
		setFreqState(v);
		setOscillatorFrequency(id, v);
	};

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='Oscillator' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

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

				{/* Play / stop — full width */}
				<HwButton color={color} lit={isPlaying} sx={{ py: 0.4 }} onClick={handleToggle} fullWidth className='nodrag'
					aria-label={isPlaying ? 'Stop oscillator' : 'Start oscillator'}>
					{isPlaying
						? <StopIcon      sx={{ fontSize: 13 }} />
						: <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>

				{/* Frequency slider */}
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq'
						value={frequency}
						min={20} max={4000} step={1}
						color={color}
						onChange={handleFreqChange}
						format={v => String(v)}
						unit='Hz'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune'
						value={detune}
						min={-1200} max={1200} step={1}
						color={color}
						onChange={(v) => { setDetuneState(v); setOscillatorDetune(id, v); }}
						format={v => String(v)}
						unit='ct'
						allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase'
						value={phase}
						min={0} max={360} step={1}
						color={color}
						onChange={(v) => { setPhaseState(v); setOscillatorPhase(id, v); }}
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
				style={bottomOutputHandleStyle(color)}
			/>
		</Box>
	);
});
