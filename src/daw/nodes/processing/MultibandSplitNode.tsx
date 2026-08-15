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
import type { MultibandSplitFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const INPUT_TOP = `calc(${NODE_HEADER_HEIGHT}px + 20px)`;

export const MultibandSplitNode = memo(function MultibandSplitNode({ id, data, selected }: NodeProps<MultibandSplitFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', pb: 2.5, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='MultibandSplit' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='low freq' value={data.lowFrequency}  min={20}  max={2000}  step={10}  color={color} onChange={v => setNodeParam(id, { lowFrequency: v })}  format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='hi freq'  value={data.highFrequency} min={200} max={20000} step={10}  color={color} onChange={v => setNodeParam(id, { highFrequency: v })} format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='Q'        value={data.Q}             min={0.1} max={10}    step={0.1} color={color} onChange={v => setNodeParam(id, { Q: v })}             format={v => v.toFixed(1)}           allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left} id='in-0' style={{ ...inputHandleStyle(color), top: INPUT_TOP }} />

			<Handle type='source' position={Position.Bottom} id='out-0' style={{ ...bottomOutputHandleStyle(color), left: '25%' }} />
			{outputLabel('low', color, '25%')}
			<Handle type='source' position={Position.Bottom} id='out-1' style={{ ...bottomOutputHandleStyle(color), left: '50%' }} />
			{outputLabel('mid', color, '50%')}
			<Handle type='source' position={Position.Bottom} id='out-2' style={{ ...bottomOutputHandleStyle(color), left: '75%' }} />
			{outputLabel('high', color, '75%')}
		</Box>
	);
});
