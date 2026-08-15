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
import type { CompressorFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.dynamics;

export const CompressorNode = memo(function CompressorNode({ id, data, selected }: NodeProps<CompressorFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Compressor' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='threshold' value={data.threshold} min={-100} max={0}  step={1}    color={color} onChange={v => setNodeParam(id, { threshold: v })} format={v => v.toFixed(0)} unit='dB' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='ratio'     value={data.ratio}     min={1}    max={20} step={0.5}  color={color} onChange={v => setNodeParam(id, { ratio: v })}     format={v => v.toFixed(1)}           allowValueEdit allowBoundsEdit />
				<HwArcSlider label='attack'    value={data.attack}    min={0}    max={1}  step={0.001} color={color} onChange={v => setNodeParam(id, { attack: v })}   format={v => v.toFixed(3)} unit='s'  allowValueEdit allowBoundsEdit />
				<HwArcSlider label='release'   value={data.release}   min={0}    max={1}  step={0.01}  color={color} onChange={v => setNodeParam(id, { release: v })}  format={v => v.toFixed(2)} unit='s'  allowValueEdit allowBoundsEdit />
				<HwArcSlider label='knee'      value={data.knee}      min={0}    max={40} step={1}     color={color} onChange={v => setNodeParam(id, { knee: v })}     format={v => v.toFixed(0)} unit='dB' allowValueEdit allowBoundsEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
