import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { SignalFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;

export const SignalNode = memo(function SignalNode({ id, data, selected }: NodeProps<SignalFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 1.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Signal' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 2, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='value' value={data.value} min={-1000} max={1000} step={1} color={color} onChange={v => setNodeParam(id, { value: v })} format={v => v.toFixed(0)} allowValueEdit allowBoundsEdit size={64} />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
