import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwSwitch } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { PanVolFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;

export const PanVolNode = memo(function PanVolNode({ id, data, selected }: NodeProps<PanVolFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='PanVol' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='pan'    value={data.pan}    min={-1}  max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { pan: v })}    format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
					<HwArcSlider label='volume' value={data.volume} min={-60} max={6} step={0.5}  color={color} onChange={v => setNodeParam(id, { volume: v })} format={v => v.toFixed(1)} unit='dB' allowValueEdit allowBoundsEdit />
				</Box>
				<HwSwitch checked={data.mute} color={color} onChange={() => setNodeParam(id, { mute: !data.mute })} label='mute' />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
