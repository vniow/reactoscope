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
import type { EQ3FlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;

export const EQ3Node = memo(function EQ3Node({ id, data, selected }: NodeProps<EQ3FlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='EQ3' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='low'      value={data.low}           min={-40} max={40}   step={0.5} color={color} onChange={v => setNodeParam(id, { low: v })}           format={v => v.toFixed(1)}          unit='dB' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='mid'      value={data.mid}           min={-40} max={40}   step={0.5} color={color} onChange={v => setNodeParam(id, { mid: v })}           format={v => v.toFixed(1)}          unit='dB' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='high'     value={data.high}          min={-40} max={40}   step={0.5} color={color} onChange={v => setNodeParam(id, { high: v })}          format={v => v.toFixed(1)}          unit='dB' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='low freq' value={data.lowFrequency}  min={20}  max={2000}  step={10}  color={color} onChange={v => setNodeParam(id, { lowFrequency: v })}  format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='hi freq'  value={data.highFrequency} min={200} max={20000} step={10}  color={color} onChange={v => setNodeParam(id, { highFrequency: v })} format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
