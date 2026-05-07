import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { outputHandleStyle, outputLabel } from './handleStyles';
import type { SceneInputFlowNode } from '../../store/dawTypes';

const HANDLES = [
	{ id: 'out-0', label: 'X', pct: '10%'  },
	{ id: 'out-1', label: 'Y', pct: '26%'  },
	{ id: 'out-2', label: 'R', pct: '46%'  },
	{ id: 'out-3', label: 'G', pct: '62%'  },
	{ id: 'out-4', label: 'B', pct: '78%'  },
	{ id: 'out-5', label: 'A', pct: '94%'  },
] as const;

export const SceneInputNode = memo(function SceneInputNode({
	data,
}: NodeProps<SceneInputFlowNode>) {
	return (
		<Box sx={{
			border:       '1px solid',
			borderColor:  NODE_COLORS.scene,
			borderRadius: 1,
			bgcolor:      `${NODE_COLORS.scene}0D`,
			minWidth:     200,
			position:     'relative',
			pb:           3,
		}}>
			<NodeHeader label={data.label} accentColor={NODE_COLORS.scene} />

			<Box sx={{ px: 1.5, py: 1 }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
					Scene geometry → audio
				</Typography>
			</Box>

			{HANDLES.map(h => (
				<Fragment key={h.id}>
					<Handle
						type='source'
						position={Position.Bottom}
						id={h.id}
						style={{ ...outputHandleStyle(NODE_COLORS.scene), left: h.pct }}
					/>
					{outputLabel(h.label, NODE_COLORS.scene, h.pct)}
				</Fragment>
			))}
		</Box>
	);
});
