import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startAutoPanner, stopAutoPanner, setAutoPannerFrequency, setAutoPannerWet } from '../../store/daw';
import { NodeHeader, BELOW_HEADER_HANDLE_TOP } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { AutoPannerFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = BELOW_HEADER_HANDLE_TOP;

export const AutoPannerNode = memo(function AutoPannerNode({ id, data, selected }: NodeProps<AutoPannerFlowNode>) {
	const [isRunning, setIsRunning] = useState(false);
	const [frequency, setFreq]      = useState(data.frequency ?? 1);
	const [wet,       setWet]       = useState(data.wet       ?? 1);

	const handleToggle = async () => {
		if (isRunning) { stopAutoPanner(id); setIsRunning(false); }
		else           { await startAutoPanner(id); setIsRunning(true); }
	};

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='AutoPanner' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Button onClick={handleToggle} fullWidth className='nodrag' aria-label={isRunning ? 'Stop' : 'Start'}
					sx={isRunning ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}>
					{isRunning ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>
				<HwSliderField label='freq' value={frequency} min={0.1} max={10} step={0.1}  color={color} onChange={v => { setFreq(v); setAutoPannerFrequency(id, v); }} format={v => v.toFixed(1)} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'  value={wet}       min={0}   max={1}  step={0.01} color={color} onChange={v => { setWet(v);  setAutoPannerWet(id, v);       }} format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
