import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startPWMOscillator, stopPWMOscillator,
	setPWMOscillatorFrequency, setPWMOscillatorModulationFrequency,
	setPWMOscillatorDetune, setPWMOscillatorPhase,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { PWMOscillatorFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.source;

export const PWMOscillatorNode = memo(function PWMOscillatorNode({
	id,
	data,
	selected,
}: NodeProps<PWMOscillatorFlowNode>) {
	const [isPlaying,           setIsPlaying]       = useState(false);
	const [frequency,           setFreqState]        = useState(data.frequency           ?? 440);
	const [modulationFrequency, setModFreqState]     = useState(data.modulationFrequency ?? 0.4);
	const [detune,              setDetuneState]      = useState(data.detune              ?? 0);
	const [phase,               setPhaseState]       = useState(data.phase               ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopPWMOscillator(id); setIsPlaying(false); }
		else           { await startPWMOscillator(id); setIsPlaying(true); }
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
			<NodeHeader id={id} label='PWM Osc' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop PWM oscillator' : 'Start PWM oscillator'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq' value={frequency} min={20} max={4000} step={1}
						color={color} onChange={(v) => { setFreqState(v); setPWMOscillatorFrequency(id, v); }}
						format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='mod freq' value={modulationFrequency} min={0.1} max={20} step={0.01}
						color={color} onChange={(v) => { setModFreqState(v); setPWMOscillatorModulationFrequency(id, v); }}
						format={v => v.toFixed(2)} unit='Hz' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setPWMOscillatorDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase' value={phase} min={0} max={360} step={1}
						color={color} onChange={(v) => { setPhaseState(v); setPWMOscillatorPhase(id, v); }}
						format={v => String(v)} unit='°' allowValueEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={outputHandleStyle(color)} />
			{outputLabel('out', color)}
		</Box>
	);
});
