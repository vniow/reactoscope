import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwToggleButtonGroup } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { DistortionFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;
const OVERSAMPLE_OPTIONS = ['none', '2x', '4x'] as const;

export const DistortionNode = memo(function DistortionNode({ id, data, selected }: NodeProps<DistortionFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Distortion' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider labelBelow label='drive' value={data.distortion} min={0} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { distortion: v })} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
					<HwArcSlider labelBelow label='wet'   value={data.wet}        min={0} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { wet: v })}        format={v => v.toFixed(2)} allowValueEdit />
				</Box>
				<HwToggleButtonGroup color={color} value={data.oversample} exclusive
					onChange={(_, v) => v && setNodeParam(id, { oversample: v })} className='nodrag'>
					{OVERSAMPLE_OPTIONS.map(opt => (
						<ToggleButton key={opt} value={opt}>{opt}</ToggleButton>
					))}
				</HwToggleButtonGroup>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
