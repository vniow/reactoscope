import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setChebyshevOrder, setChebyshevWet } from '../../store/daw';
import { NodeHeader, BELOW_HEADER_HANDLE_TOP } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { ChebyshevFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = BELOW_HEADER_HANDLE_TOP;

export const ChebyshevNode = memo(function ChebyshevNode({ id, data, selected }: NodeProps<ChebyshevFlowNode>) {
	const [order, setOrder] = useState(data.order ?? 50);
	const [wet,   setWet]   = useState(data.wet   ?? 1);

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Chebyshev' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='order' value={order} min={1} max={100} step={1}    color={color} onChange={v => { setOrder(v); setChebyshevOrder(id, v); }} format={v => String(Math.round(v))} allowValueEdit allowBoundsEdit />
				<HwSliderField label='wet'   value={wet}   min={0} max={1}   step={0.01} color={color} onChange={v => { setWet(v);   setChebyshevWet(id, v);   }} format={v => v.toFixed(2)}           allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
