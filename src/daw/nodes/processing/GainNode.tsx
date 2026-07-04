import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { GainFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;

const HANDLE_TOP = `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`;

export const GainNode = memo(function GainNode({
	id,
	data,
	selected,
}: NodeProps<GainFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           1.5 * GRID_UNIT,
			position:        'relative',
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='Gain' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 2, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider
					label=''
					value={data.gain}
					min={0} max={2} step={0.01}
					color={color}
					onChange={v => setNodeParam(id, { gain: v })}
					format={v => v.toFixed(2)}
					allowValueEdit
					allowBoundsEdit
					size={64}
				/>
			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(color), top: HANDLE_TOP }}
			/>

			<Handle
				type='source'
				position={Position.Right}
				id='out-0'
				style={{ ...outputHandleStyle(color), top: HANDLE_TOP }}
			/>
		</Box>
	);
});
