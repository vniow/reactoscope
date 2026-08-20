import { memo, useState, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import VolumeUpIcon    from '@mui/icons-material/VolumeUp';
import VolumeOffIcon   from '@mui/icons-material/VolumeOff';
import ShowChartIcon   from '@mui/icons-material/ShowChart';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, inputLabel, outputLabel, computeHandleTops, computeHandleLefts } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwIconBtn, hwIconBtnLit } from '../shared/hwStyles';
import type { MasterOutputFlowNode } from '../../../store/dawTypes';
import { MiniScope } from '../shared/MiniScope';

const color = NODE_COLORS.output;

// in-0 = X, in-1 = Y, in-5 = Z  →  left edge
const LEFT_HANDLES = [
	{ id: 'in-0', label: 'X' },
	{ id: 'in-1', label: 'Y' },
	{ id: 'in-5', label: 'Z' },
] as const;

// in-2 = R, in-3 = G, in-4 = B  →  bottom edge
const BOTTOM_HANDLES = [
	{ id: 'in-2', label: 'R' },
	{ id: 'in-3', label: 'G' },
	{ id: 'in-4', label: 'B' },
] as const;

const LEFT_TOPS    = computeHandleTops(3, 'loose', 'center');
const BOTTOM_LEFTS = computeHandleLefts(3, 'loose');

export const MasterOutputNode = memo<NodeProps<MasterOutputFlowNode>>(
	function MasterOutputNode({ id, data, selected }) {
		const setSpeakersMuted = useDawStore(s => s.setSpeakersMuted);
		const speakersMuted = data.speakersMuted ?? true;
		const [expanded, setExpanded] = useState(false);

		const canvasSize = 2 * GRID_UNIT;
		const height = 3 * GRID_UNIT;

		return (
			<Box sx={{
				borderRadius:    1,
				backgroundImage: METAL_BG,
				width:           2 * GRID_UNIT,
				height,
				position:        'relative',
				pb:              3,
				boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
			}}>
				<NodeHeader label='Master Output' id={id} selected={selected} accentColor={color} filledHeader />

				<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
		

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

				{/* Left-edge handles: X, Y, Z */}
				{LEFT_HANDLES.map((h, i) => (
					<Fragment key={h.id}>
						<Handle
							type='target'
							position={Position.Left}
							id={h.id}
							style={{ ...inputHandleStyle(color), top: LEFT_TOPS[i] }}
						/>
						{inputLabel(h.label, LEFT_TOPS[i], color)}
					</Fragment>
				))}

				{/* Bottom-edge handles: R, G, B */}
				{BOTTOM_HANDLES.map((h, i) => (
					<Fragment key={h.id}>
						<Handle
							type='target'
							position={Position.Bottom}
							id={h.id}
							style={{ ...inputHandleStyle(color), left: BOTTOM_LEFTS[i] }}
						/>
						{outputLabel(h.label, color, BOTTOM_LEFTS[i])}
					</Fragment>
				))}
			</Box>
		);
	},
);
