import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setGainValue } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import type { GainFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.processor;

// Both handles sit at 75% of the body height — well below the slider content.
const HANDLE_TOP = `calc(${NODE_HEADER_HEIGHT}px + 0.75 * (100% - ${NODE_HEADER_HEIGHT}px))`;

export const GainNode = memo(function GainNode({
	id,
	data,
	selected,
}: NodeProps<GainFlowNode>) {
	const [gain, setGain] = useState(data.gain ?? 1.0);

	const handleGainChange = (v: number) => {
		setGain(v);
		setGainValue(id, v);
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
				<HwSliderField
					label='gain'
					value={gain}
					min={0} max={2} step={0.01}
					color={color}
					onChange={handleGainChange}
					format={v => v.toFixed(2)}
					marks={[{ value: 1 }]}
					allowValueEdit
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
