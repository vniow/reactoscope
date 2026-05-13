import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setDCSignalValue } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { DCSignalFlowNode } from '../../store/dawTypes';

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
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label='DC Signal' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75 }} className='nodrag nowheel'>
				<HwSliderField
					label='value'
					value={value}
					min={-1} max={1} step={0.01}
					color={color}
					onChange={handleChange}
					format={v => v.toFixed(2)}
					allowValueEdit
				/>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(color)}
			/>
			{outputLabel('out', color)}
		</Box>
	);
});
