import { memo, useState, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useDawStore } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, inputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import type { MasterOutputFlowNode } from '../../store/dawTypes';
import { MiniScope } from './MiniScope';

const STEREO_HANDLES = [
	{ id: 'in-0', label: 'X' },
	{ id: 'in-1', label: 'Y' },
];

const MULTI_HANDLES = [
	{ id: 'in-0', label: 'X' },
	{ id: 'in-1', label: 'Y' },
	{ id: 'in-2', label: 'R' },
	{ id: 'in-3', label: 'G' },
	{ id: 'in-4', label: 'B' },
	{ id: 'in-5', label: 'A' },
];

function getHandleTop(index: number, total: number): string {
	const fraction = (index + 1) / (total + 1);
	return `calc(${NODE_HEADER_HEIGHT}px + ${fraction} * (100% - ${NODE_HEADER_HEIGHT}px))`;
}

export const MasterOutputNode = memo<NodeProps<MasterOutputFlowNode>>(
	function MasterOutputNode({ data }) {
		const setMasterMode = useDawStore(s => s.setMasterMode);
		const mode    = data.mode ?? 'stereo';
		const isMulti = mode === 'multichannel';
		const handles = isMulti ? MULTI_HANDLES : STEREO_HANDLES;
		const [expanded, setExpanded] = useState(false);
		const canvasSize = isMulti ? 2 * GRID_UNIT : 2 * GRID_UNIT; // 192px fits both modes
		const height = expanded ? (isMulti ? 6 : 5) * GRID_UNIT : 3 * GRID_UNIT;

		return (
			<Box sx={{
				border:       '1px solid',
				borderColor:  NODE_COLORS.output,
				borderRadius: 1,
				backgroundImage: METAL_BG,
				boxShadow:    `0 0 8px ${NODE_COLORS.output}4D`,
				width:        2 * GRID_UNIT,
				height,
				position:     'relative',
			}}>
				<NodeHeader label='Master Output' accentColor={NODE_COLORS.output} />

				<Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
						→ woahscope
					</Typography>

					{/* Mode toggle */}
					<Box
						className='nodrag'
						sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
					>
						<Typography variant='caption' color={isMulti ? 'text.disabled' : 'text.secondary'} sx={{ fontSize: 10 }}>
							stereo
						</Typography>
						<Switch
							size='small'
							checked={isMulti}
							onChange={() => setMasterMode(isMulti ? 'stereo' : 'multichannel')}
							sx={{ '& .MuiSwitch-thumb': { width: 10, height: 10 }, '& .MuiSwitch-switchBase': { p: '5px' } }}
						/>
						<Typography variant='caption' color={isMulti ? 'text.secondary' : 'text.disabled'} sx={{ fontSize: 10 }}>
							multi
						</Typography>
					</Box>

					{/* Scope expand toggle */}
					<Box className='nodrag' sx={{ display: 'flex', justifyContent: 'center' }}>
						<IconButton size='small' onClick={() => setExpanded(v => !v)} sx={{ p: 0.25 }}>
							{expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
						</IconButton>
					</Box>

					{/* Mini scope canvas */}
					{expanded && (
						<Box className='nodrag'>
							<MiniScope mode={mode} width={canvasSize} height={canvasSize} />
						</Box>
					)}
				</Box>

				{handles.map((h, i) => {
					const top = getHandleTop(i, handles.length);
					return (
						<Fragment key={h.id}>
							<Handle type='target' position={Position.Left} id={h.id}
								style={{ ...inputHandleStyle(NODE_COLORS.output), top }} />
						{inputLabel(h.label, top, NODE_COLORS.output)}
						</Fragment>
					);
				})}
			</Box>
		);
	},
);
