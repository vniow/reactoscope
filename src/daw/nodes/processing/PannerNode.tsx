import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, bottomOutputHandleStyle, outputLabel } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { PannerFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const INPUT_TOP = `calc(${NODE_HEADER_HEIGHT}px + 20px)`;

export const PannerNode = memo(function PannerNode({ id, data, selected }: NodeProps<PannerFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', pb: 2.5, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Panner' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='pan' value={data.pan} min={-1} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { pan: v })} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left} id='in-0' style={{ ...inputHandleStyle(color), top: INPUT_TOP }} />

			<Handle type='source' position={Position.Bottom} id='out-0' style={{ ...bottomOutputHandleStyle(color), left: '33%' }} />
			{outputLabel('L', color, '33%')}
			<Handle type='source' position={Position.Bottom} id='out-1' style={{ ...bottomOutputHandleStyle(color), left: '67%' }} />
			{outputLabel('R', color, '67%')}
		</Box>
	);
});
