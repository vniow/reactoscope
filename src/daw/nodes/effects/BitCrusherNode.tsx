import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setBitCrusherBits, setBitCrusherWet } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { BitCrusherFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const BitCrusherNode = memo(function BitCrusherNode({ id, data, selected }: NodeProps<BitCrusherFlowNode>) {
	const [bits, setBits] = useState(data.bits ?? 4);
	const [wet,  setWet]  = useState(data.wet  ?? 1);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='BitCrusher' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider labelBelow label='bits' value={bits} min={1} max={16} step={1}    color={color} onChange={v => { setBits(v); setBitCrusherBits(id, v); }} format={v => String(Math.round(v))} allowValueEdit />
				<HwArcSlider labelBelow label='wet'  value={wet}  min={0} max={1}  step={0.01} color={color} onChange={v => { setWet(v);  setBitCrusherWet(id, v);  }} format={v => v.toFixed(2)}           allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
