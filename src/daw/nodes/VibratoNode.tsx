import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startVibrato, stopVibrato, setVibratoFrequency, setVibratoDepth, setVibratoWet } from '../../store/daw';
import { NodeHeader, BELOW_HEADER_HANDLE_TOP } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { VibratoFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = BELOW_HEADER_HANDLE_TOP;

export const VibratoNode = memo(function VibratoNode({ id, data, selected }: NodeProps<VibratoFlowNode>) {
	const [isRunning, setIsRunning] = useState(false);
	const [frequency, setFreq]      = useState(data.frequency ?? 5);
	const [depth,     setDepth]     = useState(data.depth     ?? 0.1);
	const [wet,       setWet]       = useState(data.wet       ?? 0.5);

	const handleToggle = async () => {
		if (isRunning) { stopVibrato(id); setIsRunning(false); }
		else           { await startVibrato(id); setIsRunning(true); }
	};

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Vibrato' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Button onClick={handleToggle} fullWidth className='nodrag' aria-label={isRunning ? 'Stop' : 'Start'}
					sx={isRunning ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}>
					{isRunning ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>
				<HwSliderField label='freq'  value={frequency} min={0.1} max={20} step={0.1}  color={color} onChange={v => { setFreq(v);  setVibratoFrequency(id, v); }} format={v => v.toFixed(1)} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwSliderField label='depth' value={depth}     min={0}   max={1}  step={0.01} color={color} onChange={v => { setDepth(v); setVibratoDepth(id, v);     }} format={v => v.toFixed(2)}            allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'   value={wet}       min={0}   max={1}  step={0.01} color={color} onChange={v => { setWet(v);   setVibratoWet(id, v);       }} format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
