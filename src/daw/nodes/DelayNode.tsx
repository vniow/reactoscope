import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setDelayTime } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { DelayFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = `50%`;

export const DelayNode = memo(function DelayNode({ id, data, selected }: NodeProps<DelayFlowNode>) {
	const [delayTime, setDelay] = useState(data.delayTime ?? 0.25);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Delay' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='time' value={delayTime} min={0} max={1} step={0.01} color={color} onChange={v => { setDelay(v); setDelayTime(id, v); }} format={v => v.toFixed(2)} unit='s' allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
