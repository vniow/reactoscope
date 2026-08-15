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
import type { ScaleExpFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;

export const ScaleExpNode = memo(function ScaleExpNode({ id, data, selected }: NodeProps<ScaleExpFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='ScaleExp' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='min'      value={data.min}      min={-100} max={100} step={0.1} color={color} onChange={v => setNodeParam(id, { min: v })}      format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
				<HwArcSlider label='max'      value={data.max}      min={-100} max={100} step={0.1} color={color} onChange={v => setNodeParam(id, { max: v })}      format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
				<HwArcSlider label='exponent' value={data.exponent} min={0.1}  max={8}   step={0.1} color={color} onChange={v => setNodeParam(id, { exponent: v })} format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
