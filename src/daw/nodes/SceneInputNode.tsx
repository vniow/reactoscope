import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore } from '../../store/daw';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, rightLabel, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwIconBtn, hwIconBtnLit } from './hwStyles';
import type { SceneInputFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.scene;

// out-0 = X, out-1 = Y, out-5 = A  →  right edge
const RIGHT_HANDLES = [
	{ id: 'out-0', label: 'X' },
	{ id: 'out-1', label: 'Y' },
	{ id: 'out-5', label: 'A' },
] as const;

// out-2 = R, out-3 = G, out-4 = B  →  bottom edge
const BOTTOM_HANDLES = [
	{ id: 'out-2', label: 'R', pct: '25%' },
	{ id: 'out-3', label: 'G', pct: '50%' },
	{ id: 'out-4', label: 'B', pct: '75%' },
] as const;

function getHandleTop(index: number, total: number): string {
	const fraction = (index + 1) / (total + 1);
	return `calc(${NODE_HEADER_HEIGHT}px + ${fraction} * (100% - ${NODE_HEADER_HEIGHT}px))`;
}

export const SceneInputNode = memo(function SceneInputNode({
	data,
}: NodeProps<SceneInputFlowNode>) {
	const sceneRunning = useDawStore(s => s.sceneRunning);
	const startScene   = useDawStore(s => s.startScene);
	const stopScene    = useDawStore(s => s.stopScene);

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			height:          2 * GRID_UNIT,
			position:        'relative',
			pb:              3,
		}}>
			<NodeHeader label={data.label} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75 }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
					Scene geometry → audio
				</Typography>
			</Box>

			{/* Play / Stop — size M: iconSize 16, p 1 */}
			<Box className='nodrag' sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
				<IconButton
					size='small'
					onClick={() => sceneRunning ? stopScene() : startScene()}
					aria-label={sceneRunning ? 'Stop' : 'Start'}
					sx={sceneRunning
						? { ...hwIconBtnLit(color), p: 1 }
						: { ...hwIconBtn(color),    p: 1 }
					}
				>
					{sceneRunning
						? <StopIcon      sx={{ fontSize: 16 }} />
						: <PlayArrowIcon sx={{ fontSize: 16 }} />
					}
				</IconButton>
			</Box>

			{/* Right-edge: X, Y, A */}
			{RIGHT_HANDLES.map((h, i) => {
				const top = getHandleTop(i, RIGHT_HANDLES.length);
				return (
					<Fragment key={h.id}>
						<Handle
							type='source'
							position={Position.Right}
							id={h.id}
							style={{ ...outputHandleStyle(color), top }}
						/>
						{rightLabel(h.label, top, color)}
					</Fragment>
				);
			})}

			{/* Bottom-edge: R, G, B */}
			{BOTTOM_HANDLES.map(h => (
				<Fragment key={h.id}>
					<Handle
						type='source'
						position={Position.Bottom}
						id={h.id}
						style={{ ...outputHandleStyle(color), left: h.pct }}
					/>
					{outputLabel(h.label, color, h.pct)}
				</Fragment>
			))}
		</Box>
	);
});
