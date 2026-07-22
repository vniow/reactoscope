import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { outputHandleStyle, bottomOutputHandleStyle, rightLabel, outputLabel, computeHandleTops, computeHandleLefts } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton } from '../shared/hwComponents';
import type { SceneInputFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.scene;

// out-0 = X, out-1 = Y, out-5 = A  →  right edge
const RIGHT_HANDLES = [
	{ id: 'out-0', label: 'X' },
	{ id: 'out-1', label: 'Y' },
	{ id: 'out-5', label: 'A' },
] as const;

// out-2 = R, out-3 = G, out-4 = B  →  bottom edge
const BOTTOM_HANDLES = [
	{ id: 'out-2', label: 'R' },
	{ id: 'out-3', label: 'G' },
	{ id: 'out-4', label: 'B' },
] as const;

const RIGHT_TOPS   = computeHandleTops(3, 'loose', 'center');
const BOTTOM_LEFTS = computeHandleLefts(3, 'loose');

export const SceneInputNode = memo(function SceneInputNode({
	id,
	data,
	selected,
}: NodeProps<SceneInputFlowNode>) {
	const sceneRunning = useDawStore(s => s.sceneRunning);
	const startScene   = useDawStore(s => s.startScene);
	const stopScene    = useDawStore(s => s.stopScene);

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			height:          2 * GRID_UNIT,
			position:        'relative',
			pb:              3,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader label={data.label} id={id} selected={selected} accentColor={color} filledHeader />

	

			<Box sx={{ px: 1.75, pb: 0.75 }}>
				<HwButton color={color} lit={sceneRunning} sx={{ py: 0.4 }}
					onClick={() => sceneRunning ? stopScene() : startScene()}
					fullWidth className='nodrag' aria-label={sceneRunning ? 'Stop' : 'Start'}>
					{sceneRunning
						? <StopIcon      sx={{ fontSize: 13 }} />
						: <PlayArrowIcon sx={{ fontSize: 13 }} />
					}
				</HwButton>
			</Box>

			{/* Right-edge: X, Y, A */}
			{RIGHT_HANDLES.map((h, i) => (
				<Fragment key={h.id}>
					<Handle
						type='source'
						position={Position.Right}
						id={h.id}
						style={{ ...outputHandleStyle(color), top: RIGHT_TOPS[i] }}
					/>
					{rightLabel(h.label, RIGHT_TOPS[i], color)}
				</Fragment>
			))}

			{/* Bottom-edge: R, G, B */}
			{BOTTOM_HANDLES.map((h, i) => (
				<Fragment key={h.id}>
					<Handle
						type='source'
						position={Position.Bottom}
						id={h.id}
						style={{ ...bottomOutputHandleStyle(color), left: BOTTOM_LEFTS[i] }}
					/>
					{outputLabel(h.label, color, BOTTOM_LEFTS[i])}
				</Fragment>
			))}
		</Box>
	);
});
