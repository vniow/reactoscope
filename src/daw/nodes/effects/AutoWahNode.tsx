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
import type { AutoWahFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const AutoWahNode = memo(function AutoWahNode({ id, data, selected }: NodeProps<AutoWahFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='AutoWah' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider labelBelow label='base'    value={data.baseFrequency} min={50}  max={500} step={5}    color={color} onChange={v => setNodeParam(id, { baseFrequency: v })} format={v => String(v)}    unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='octaves' value={data.octaves}       min={1}   max={8}   step={0.1}  color={color} onChange={v => setNodeParam(id, { octaves: v })}       format={v => v.toFixed(1)}            allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='sens'    value={data.sensitivity}   min={-40} max={0}   step={1}    color={color} onChange={v => setNodeParam(id, { sensitivity: v })}   format={v => String(v)}    unit='dB' allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='wet'     value={data.wet}           min={0}   max={1}   step={0.01} color={color} onChange={v => setNodeParam(id, { wet: v })}           format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
