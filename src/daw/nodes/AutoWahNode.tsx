import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setAutoWahBaseFrequency, setAutoWahOctaves, setAutoWahSensitivity, setAutoWahWet } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { AutoWahFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = '50%';

export const AutoWahNode = memo(function AutoWahNode({ id, data, selected }: NodeProps<AutoWahFlowNode>) {
	const [baseFrequency, setBaseFrequency] = useState(data.baseFrequency ?? 100);
	const [octaves,       setOctaves]       = useState(data.octaves       ?? 6);
	const [sensitivity,   setSensitivity]   = useState(data.sensitivity   ?? 0);
	const [wet,           setWet]           = useState(data.wet           ?? 1);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='AutoWah' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='base'    value={baseFrequency} min={50}  max={500} step={5}    color={color} onChange={v => { setBaseFrequency(v); setAutoWahBaseFrequency(id, v); }} format={v => String(v)}    unit='Hz' allowValueEdit allowBoundsEdit />
				<HwSliderField label='octaves' value={octaves}       min={1}   max={8}   step={0.1}  color={color} onChange={v => { setOctaves(v);       setAutoWahOctaves(id, v);       }} format={v => v.toFixed(1)}            allowValueEdit allowBoundsEdit />
				<HwSliderField label='sens'    value={sensitivity}   min={-40} max={0}   step={1}    color={color} onChange={v => { setSensitivity(v);   setAutoWahSensitivity(id, v);   }} format={v => String(v)}    unit='dB' allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'     value={wet}           min={0}   max={1}   step={0.01} color={color} onChange={v => { setWet(v);           setAutoWahWet(id, v);           }} format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
