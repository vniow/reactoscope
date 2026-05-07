import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import { metalBg, DEFAULT_METAL_PARAMS, type MetalParams } from './metalBackground';
import type { DebugFlowNode } from '../../store/dawTypes';

interface ParamRowProps {
	label: string;
	value: number;
	min:   number;
	max:   number;
	step:  number;
	onChange: (v: number) => void;
}

function ParamRow({ label, value, min, max, step, onChange }: ParamRowProps) {
	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
				<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>{label}</Typography>
				<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>{value.toFixed(step < 1 ? 3 : 0)}</Typography>
			</Box>
			<Slider
				size='small' min={min} max={max} step={step}
				value={value}
				onChange={(_, v) => onChange(v as number)}
				color='primary'
				sx={{ py: 0.5 }}
			/>
		</Box>
	);
}

export const DebugNode = memo(function DebugNode({
	id,
	data,
	selected,
}: NodeProps<DebugFlowNode>) {
	const [params, setParams] = useState<MetalParams>(DEFAULT_METAL_PARAMS);

	const set = <K extends keyof MetalParams>(key: K, value: MetalParams[K]) =>
		setParams(p => ({ ...p, [key]: value }));

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     NODE_COLORS.debug,
			borderRadius:    1,
			backgroundImage: metalBg(params),
			width:           3 * GRID_UNIT,
			height:          5 * GRID_UNIT,
			position:        'relative',
			pb:              3,
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={NODE_COLORS.debug} />

			<Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }} className='nodrag nowheel'>

				<ParamRow
					label='line opacity'
					value={params.lineOpacity}
					min={0} max={0.2} step={0.001}
					onChange={v => set('lineOpacity', v)}
				/>
				<ParamRow
					label='shadow opacity'
					value={params.shadowOpacity}
					min={0} max={0.2} step={0.001}
					onChange={v => set('shadowOpacity', v)}
				/>
				<ParamRow
					label='line period (px)'
					value={params.linePeriod}
					min={1} max={8} step={1}
					onChange={v => set('linePeriod', v)}
				/>
				<ParamRow
					label='specular'
					value={params.specular}
					min={0} max={0.3} step={0.001}
					onChange={v => set('specular', v)}
				/>
				<ParamRow
					label='sheen'
					value={params.sheen}
					min={0} max={0.15} step={0.001}
					onChange={v => set('sheen', v)}
				/>

				{/* Typography reference against live metal */}
				<Box sx={{ mt: 0.5, pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
					<Box sx={{ display: 'flex', gap: 1.5 }}>
						<Typography variant='caption' color='text.primary'   sx={{ fontSize: 10 }}>primary</Typography>
						<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>secondary</Typography>
						<Typography variant='caption' color='text.disabled'  sx={{ fontSize: 10 }}>disabled</Typography>
					</Box>
				</Box>

			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(NODE_COLORS.debug), top: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)` }}
			/>
			{inputLabel('in', `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`, NODE_COLORS.debug)}
			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(NODE_COLORS.debug)}
			/>
			{outputLabel('out', NODE_COLORS.debug)}
		</Box>
	);
});
