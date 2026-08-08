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
import type { PitchShiftFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const PitchShiftNode = memo(function PitchShiftNode({ id, data, selected }: NodeProps<PitchShiftFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='PitchShift' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='pitch'  value={data.pitch}      min={-12}  max={12}  step={1}    color={color} onChange={v => setNodeParam(id, { pitch: v })}      format={v => String(v)}    unit='st' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='window' value={data.windowSize} min={0.03} max={0.1} step={0.01} color={color} onChange={v => setNodeParam(id, { windowSize: v })} format={v => v.toFixed(2)} unit='s'  allowValueEdit />
				<HwArcSlider label='fdbk'   value={data.feedback}   min={0}    max={1}   step={0.01} color={color} onChange={v => setNodeParam(id, { feedback: v })}   format={v => v.toFixed(2)}           allowValueEdit />
				<HwArcSlider label='wet'    value={data.wet}        min={0}    max={1}   step={0.01} color={color} onChange={v => setNodeParam(id, { wet: v })}        format={v => v.toFixed(2)}           allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
