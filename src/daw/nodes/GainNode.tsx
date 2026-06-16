import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { setGainValue } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwArcSlider } from '../../components/HwArcSlider';
import type { GainFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.processor;

const HANDLE_TOP = `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`;

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
			width:           1.5 * GRID_UNIT,
			position:        'relative',
			boxShadow:       `0 0 14px ${color}30`,
		}}>
			<NodeHeader id={id} label='Gain' selected={selected} accentColor={color} />

			<Box sx={{ px: 2, pt: 2, pb: 2, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider
					label=''
					value={gain}
					min={0} max={2} step={0.01}
					color={color}
					onChange={handleGainChange}
					format={v => v.toFixed(2)}
					allowValueEdit
					allowBoundsEdit
					size={64}
				/>
			</Box>

			{/* Left port surround */}
			<Box sx={{
				position:      'absolute',
				left:          0,
				top:           HANDLE_TOP,
				transform:     'translateY(-50%)',
				width:         18,
				height:        36,
				borderRadius:  '0 18px 18px 0',
				background:    'linear-gradient(to right, #0e0e10 0%, #1c1c22 100%)',
				borderTop:     '1px solid #0d0d0f',
				borderRight:   '1px solid #0d0d0f',
				borderBottom:  '1px solid #0d0d0f',
				boxShadow:     `4px 0 12px rgba(0,0,0,0.6), inset 2px 0 6px rgba(0,0,0,0.5), inset 0 0 0 1px ${color}18`,
				pointerEvents: 'none',
				zIndex:        1,
			}} />

			{/* Right port surround */}
			<Box sx={{
				position:      'absolute',
				right:         0,
				top:           HANDLE_TOP,
				transform:     'translateY(-50%)',
				width:         18,
				height:        36,
				borderRadius:  '18px 0 0 18px',
				background:    'linear-gradient(to left, #0e0e10 0%, #1c1c22 100%)',
				borderTop:     '1px solid #0d0d0f',
				borderLeft:    '1px solid #0d0d0f',
				borderBottom:  '1px solid #0d0d0f',
				boxShadow:     `-4px 0 12px rgba(0,0,0,0.6), inset -2px 0 6px rgba(0,0,0,0.5), inset 0 0 0 1px ${color}18`,
				pointerEvents: 'none',
				zIndex:        1,
			}} />

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
