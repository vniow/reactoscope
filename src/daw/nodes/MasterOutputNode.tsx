import { memo, useState, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import VolumeUpIcon    from '@mui/icons-material/VolumeUp';
import VolumeOffIcon   from '@mui/icons-material/VolumeOff';
import ShowChartIcon   from '@mui/icons-material/ShowChart';
import { useDawStore } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwIconBtn, hwIconBtnLit } from './hwStyles';
import type { MasterOutputFlowNode } from '../../store/dawTypes';
import { MiniScope } from './MiniScope';

const color = NODE_COLORS.output;

// in-0 = X, in-1 = Y, in-5 = A  →  left edge
const LEFT_HANDLES = [
	{ id: 'in-0', label: 'X' },
	{ id: 'in-1', label: 'Y' },
	{ id: 'in-5', label: 'A' },
] as const;

// in-2 = R, in-3 = G, in-4 = B  →  bottom edge
const BOTTOM_HANDLES = [
	{ id: 'in-2', label: 'R', pct: '25%' },
	{ id: 'in-3', label: 'G', pct: '50%' },
	{ id: 'in-4', label: 'B', pct: '75%' },
] as const;

function getHandleTop(index: number, total: number): string {
	const fraction = (index + 1) / (total + 1);
	return `calc(${NODE_HEADER_HEIGHT}px + ${fraction} * (100% - ${NODE_HEADER_HEIGHT}px))`;
}

export const MasterOutputNode = memo<NodeProps<MasterOutputFlowNode>>(
	function MasterOutputNode({ data }) {
		const setSpeakersMuted = useDawStore(s => s.setSpeakersMuted);
		const speakersMuted = data.speakersMuted ?? true;
		const [expanded, setExpanded] = useState(false);

		const canvasSize = 2 * GRID_UNIT;
		const height = 4 * GRID_UNIT;

		return (
			<Box sx={{
				border:          '1px solid',
				borderColor:     color,
				borderRadius:    1,
				backgroundImage: METAL_BG,
				boxShadow:       `0 0 8px ${color}4D`,
				width:           2 * GRID_UNIT,
				height,
				position:        'relative',
				pb:              3,
			}}>
				<NodeHeader label='Master Output' accentColor={color} />

				<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
						→ woahscope
					</Typography>

					{/* Speaker + mini-scope icon buttons */}
					<Box className='nodrag' sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
						<IconButton size='small' onClick={() => setSpeakersMuted(!speakersMuted)}
							sx={!speakersMuted ? { ...hwIconBtnLit(color), p: 0.75 } : { ...hwIconBtn(color), p: 0.75 }}>
							{speakersMuted
								? <VolumeOffIcon sx={{ fontSize: 16 }} />
								: <VolumeUpIcon  sx={{ fontSize: 16 }} />
							}
						</IconButton>
						<IconButton size='small' onClick={() => setExpanded(v => !v)}
							sx={expanded ? { ...hwIconBtnLit(color), p: 0.75 } : { ...hwIconBtn(color), p: 0.75 }}>
							<ShowChartIcon sx={{ fontSize: 16 }} />
						</IconButton>
					</Box>

					{/* Mini scope canvas */}
					{expanded && (
						<Box className='nodrag'>
							<MiniScope width={canvasSize} height={canvasSize} />
						</Box>
					)}
				</Box>

				{/* Left-edge handles: X, Y, A */}
				{LEFT_HANDLES.map((h, i) => {
					const top = getHandleTop(i, LEFT_HANDLES.length);
					return (
						<Fragment key={h.id}>
							<Handle
								type='target'
								position={Position.Left}
								id={h.id}
								style={{ ...inputHandleStyle(color), top }}
							/>
							{inputLabel(h.label, top, color)}
						</Fragment>
					);
				})}

				{/* Bottom-edge handles: R, G, B */}
				{BOTTOM_HANDLES.map(h => (
					<Fragment key={h.id}>
						<Handle
							type='target'
							position={Position.Bottom}
							id={h.id}
							style={{ ...inputHandleStyle(color), left: h.pct }}
						/>
						{outputLabel(h.label, color, h.pct)}
					</Fragment>
				))}
			</Box>
		);
	},
);
