import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { setGainValue } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { inputHandleStyle, outputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import type { GainFlowNode } from '../../store/dawTypes';

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
			border:       '1px solid',
			borderColor:  NODE_COLORS.processor,
			borderRadius: 1,
			bgcolor:      `${NODE_COLORS.processor}0D`,
			minWidth:     180,
			position:     'relative',
			pb:           3,
		}}>
			<NodeHeader id={id} label='Gain' selected={selected} accentColor={NODE_COLORS.processor} />

			<Box sx={{ px: 1.5, py: 1 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
					<Typography variant='caption' color='text.secondary'>gain</Typography>
					<Typography variant='caption' color='text.secondary'>{gain.toFixed(2)}</Typography>
				</Box>
				<Slider
					aria-label='Gain'
					min={0} max={2} step={0.01}
					value={gain}
					onChange={handleGainChange}
					size='small'
					color='primary'
				/>
			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(NODE_COLORS.processor), top: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)` }}
			/>
			{inputLabel('in', `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`, NODE_COLORS.processor)}
			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(NODE_COLORS.processor)}
			/>
			{outputLabel('out', NODE_COLORS.processor)}
		</Box>
	);
});
