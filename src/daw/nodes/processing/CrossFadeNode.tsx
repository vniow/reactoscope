import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, computeHandleTops } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { CrossFadeFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const LABELS = ['a', 'b'];

export const CrossFadeNode = memo(function CrossFadeNode({ id, data, selected }: NodeProps<CrossFadeFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const tops = computeHandleTops(2, 'normal');

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='CrossFade' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='fade' value={data.fade} min={0} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { fade: v })} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
			</Box>

			{tops.map((top, i) => (
				<Fragment key={i}>
					<Handle type='target' position={Position.Left} id={`in-${i}`} style={{ ...inputHandleStyle(color), top }} />
					{inputLabel(LABELS[i], top, color)}
				</Fragment>
			))}

			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
