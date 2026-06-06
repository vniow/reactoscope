import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setFreeverbRoomSize, setFreeverbDampening, setFreeverbWet } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { FreeverbFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = '50%';

export const FreeverbNode = memo(function FreeverbNode({ id, data, selected }: NodeProps<FreeverbFlowNode>) {
	const [roomSize,  setRoomSize]  = useState(data.roomSize  ?? 0.7);
	const [dampening, setDampening] = useState(data.dampening ?? 3000);
	const [wet,       setWet]       = useState(data.wet       ?? 0.5);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Freeverb' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='roomSize'  value={roomSize}  min={0}   max={1}    step={0.01} color={color} onChange={v => { setRoomSize(v);  setFreeverbRoomSize(id, v);  }} format={v => v.toFixed(2)}        allowValueEdit allowBoundsEdit />
				<HwSliderField label='dampening' value={dampening} min={100} max={8000} step={10}   color={color} onChange={v => { setDampening(v); setFreeverbDampening(id, v); }} format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'        value={wet}      min={0}   max={1}    step={0.01} color={color} onChange={v => { setWet(v);       setFreeverbWet(id, v);       }} format={v => v.toFixed(2)}        allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
