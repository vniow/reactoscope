import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startPulseOscillator, stopPulseOscillator,
	setPulseOscillatorFrequency, setPulseOscillatorWidth,
	setPulseOscillatorDetune, setPulseOscillatorPhase,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { PulseOscillatorFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.source;

export const PulseOscillatorNode = memo(function PulseOscillatorNode({
	id,
	data,
	selected,
}: NodeProps<PulseOscillatorFlowNode>) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [frequency, setFreqState] = useState(data.frequency ?? 440);
	const [width,     setWidthState] = useState(data.width    ?? 0.5);
	const [detune,    setDetuneState] = useState(data.detune  ?? 0);
	const [phase,     setPhaseState]  = useState(data.phase   ?? 0);

	const handleToggle = async () => {
		if (isPlaying) { stopPulseOscillator(id); setIsPlaying(false); }
		else           { await startPulseOscillator(id); setIsPlaying(true); }
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
			<NodeHeader id={id} label='Pulse Osc' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop pulse oscillator' : 'Start pulse oscillator'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq' value={frequency} min={20} max={4000} step={1}
						color={color} onChange={(v) => { setFreqState(v); setPulseOscillatorFrequency(id, v); }}
						format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='width' value={width} min={0} max={1} step={0.01}
						color={color} onChange={(v) => { setWidthState(v); setPulseOscillatorWidth(id, v); }}
						format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setPulseOscillatorDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase' value={phase} min={0} max={360} step={1}
						color={color} onChange={(v) => { setPhaseState(v); setPulseOscillatorPhase(id, v); }}
						format={v => String(v)} unit='°' allowValueEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={outputHandleStyle(color)} />
			{outputLabel('out', color)}
		</Box>
	);
});
