import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { setDCSignalValue } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwSliderSx } from './hwStyles';
import type { DCSignalFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.source;
const nodeSx = { slider: hwSliderSx(color) };

export const DCSignalNode = memo(function DCSignalNode({
	id,
	data,
	selected,
}: NodeProps<DCSignalFlowNode>) {
	const [value, setValue] = useState(data.value ?? 1);

	const handleChange = (_: Event, v: number | number[]) => {
		const val = v as number;
		setValue(val);
		setDCSignalValue(id, val);
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
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>value</Typography>
					<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>{value.toFixed(2)}</Typography>
				</Box>
				<Slider
					aria-label='DC value'
					min={-1} max={1} step={0.01}
					value={value}
					onChange={handleChange}
					size='small'
					sx={nodeSx.slider}
				/>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>−1</Typography>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>0</Typography>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>+1</Typography>
				</Box>
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
