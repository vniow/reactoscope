import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setDCSignalValue } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import type { DCSignalFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

export const DCSignalNode = memo(function DCSignalNode({
	id,
	data,
	selected,
}: NodeProps<DCSignalFlowNode>) {
	const [value, setValue] = useState(data.value ?? 1);

	const handleChange = (v: number) => {
		setValue(v);
		setDCSignalValue(id, v);
	};

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='DC Signal' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75 }} className='nodrag nowheel'>
				<HwSliderField
					label='value'
					value={value}
					min={-1} max={1} step={0.01}
					color={color}
					onChange={handleChange}
					format={v => v.toFixed(2)}
					allowValueEdit
					allowBoundsEdit
				/>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={bottomOutputHandleStyle(color)}
			/>
		</Box>
	);
});
