import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { setGainValue } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwSliderSx } from './hwStyles';
import type { GainFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.processor;
const nodeSx = { slider: hwSliderSx(color) };

// Both handles sit at 75% of the body height — well below the slider content.
const HANDLE_TOP = `calc(${NODE_HEADER_HEIGHT}px + 0.75 * (100% - ${NODE_HEADER_HEIGHT}px))`;

export const GainNode = memo(function GainNode({
	id,
	data,
	selected,
}: NodeProps<GainFlowNode>) {
	const [gain, setGain] = useState(data.gain ?? 1.0);

	const handleGainChange = (_: Event, value: number | number[]) => {
		const g = value as number;
		setGain(g);
		setGainValue(id, g);
	};

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			height:          1.5 * GRID_UNIT,
			position:        'relative',
		}}>
			<NodeHeader id={id} label='Gain' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>gain</Typography>
					<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>{gain.toFixed(2)}</Typography>
				</Box>
				<Slider
					aria-label='Gain'
					min={0} max={2} step={0.01}
					marks={[{ value: 1 }]}
					value={gain}
					onChange={handleGainChange}
					size='small'
					sx={nodeSx.slider}
				/>
			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(color), top: HANDLE_TOP }}
			/>
			{inputLabel('in', HANDLE_TOP, color)}

			<Handle
				type='source'
				position={Position.Right}
				id='out-0'
				style={{ ...outputHandleStyle(color), top: HANDLE_TOP }}
			/>
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
