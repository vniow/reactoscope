import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setJCReverbRoomSize, setJCReverbWet } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { JCReverbFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = '50%';

export const JCReverbNode = memo(function JCReverbNode({ id, data, selected }: NodeProps<JCReverbFlowNode>) {
	const [roomSize, setRoomSize] = useState(data.roomSize ?? 0.5);
	const [wet,      setWet]      = useState(data.wet      ?? 0.5);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='JCReverb' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='roomSize' value={roomSize} min={0} max={1} step={0.01} color={color} onChange={v => { setRoomSize(v); setJCReverbRoomSize(id, v); }} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'      value={wet}      min={0} max={1} step={0.01} color={color} onChange={v => { setWet(v);      setJCReverbWet(id, v);      }} format={v => v.toFixed(2)} allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
