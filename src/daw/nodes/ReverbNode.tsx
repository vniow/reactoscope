import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setReverbDecay, setReverbPreDelay, setReverbWet } from '../../store/daw';
import { NodeHeader, BELOW_HEADER_HANDLE_TOP } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { ReverbFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = BELOW_HEADER_HANDLE_TOP;

export const ReverbNode = memo(function ReverbNode({ id, data, selected }: NodeProps<ReverbFlowNode>) {
	const [decay,    setDecay]    = useState(data.decay    ?? 1.5);
	const [preDelay, setPreDelay] = useState(data.preDelay ?? 0.01);
	const [wet,      setWet]      = useState(data.wet      ?? 0.5);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Reverb' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='decay'    value={decay}    min={0.1} max={10}  step={0.1}  color={color} onChange={v => { setDecay(v);    setReverbDecay(id, v);    }} format={v => v.toFixed(1)} unit='s'  allowValueEdit allowBoundsEdit />
				<HwSliderField label='preDelay' value={preDelay} min={0}   max={0.5} step={0.01} color={color} onChange={v => { setPreDelay(v); setReverbPreDelay(id, v); }} format={v => v.toFixed(2)} unit='s'  allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'      value={wet}      min={0}   max={1}   step={0.01} color={color} onChange={v => { setWet(v);      setReverbWet(id, v);      }} format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
