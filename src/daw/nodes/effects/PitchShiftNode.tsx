import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setPitchShiftPitch, setPitchShiftWindowSize, setPitchShiftFeedback, setPitchShiftWet } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { PitchShiftFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const PitchShiftNode = memo(function PitchShiftNode({ id, data, selected }: NodeProps<PitchShiftFlowNode>) {
	const [pitch,      setPitch]      = useState(data.pitch      ?? 0);
	const [windowSize, setWindowSize] = useState(data.windowSize ?? 0.1);
	const [feedback,   setFeedback]   = useState(data.feedback   ?? 0);
	const [wet,        setWet]        = useState(data.wet        ?? 1);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='PitchShift' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider labelBelow label='pitch'  value={pitch}      min={-12}  max={12}  step={1}    color={color} onChange={v => { setPitch(v);      setPitchShiftPitch(id, v);      }} format={v => String(v)} unit='st' allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='window' value={windowSize} min={0.03} max={0.1} step={0.01} color={color} onChange={v => { setWindowSize(v); setPitchShiftWindowSize(id, v); }} format={v => v.toFixed(2)} unit='s' allowValueEdit />
				<HwArcSlider labelBelow label='fdbk'   value={feedback}   min={0}    max={1}   step={0.01} color={color} onChange={v => { setFeedback(v);   setPitchShiftFeedback(id, v);   }} format={v => v.toFixed(2)}           allowValueEdit />
				<HwArcSlider labelBelow label='wet'    value={wet}        min={0}    max={1}   step={0.01} color={color} onChange={v => { setWet(v);        setPitchShiftWet(id, v);        }} format={v => v.toFixed(2)}           allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
