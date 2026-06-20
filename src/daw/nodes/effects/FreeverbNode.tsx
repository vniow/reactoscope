import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setFreeverbRoomSize, setFreeverbDampening, setFreeverbWet } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { FreeverbFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const FreeverbNode = memo(function FreeverbNode({ id, data, selected }: NodeProps<FreeverbFlowNode>) {
	const [roomSize,  setRoomSize]  = useState(data.roomSize  ?? 0.7);
	const [dampening, setDampening] = useState(data.dampening ?? 3000);
	const [wet,       setWet]       = useState(data.wet       ?? 0.5);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Freeverb' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider labelBelow label='roomSize'  value={roomSize}  min={0}   max={1}    step={0.01} color={color} onChange={v => { setRoomSize(v);  setFreeverbRoomSize(id, v);  }} format={v => v.toFixed(2)}        allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='dampening' value={dampening} min={100} max={8000} step={10}   color={color} onChange={v => { setDampening(v); setFreeverbDampening(id, v); }} format={v => String(v)} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='wet'        value={wet}      min={0}   max={1}    step={0.01} color={color} onChange={v => { setWet(v);       setFreeverbWet(id, v);       }} format={v => v.toFixed(2)}        allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
