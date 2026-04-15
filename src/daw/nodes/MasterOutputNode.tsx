import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { MasterOutputFlowNode } from '../../store/dawTypes';

export const MasterOutputNode = memo<NodeProps<MasterOutputFlowNode>>(function MasterOutputNode() {
	return (
		<Box
			sx={{
				px: 2,
				py: 1.5,
				border: '1px solid',
				borderColor: 'primary.main',
				borderRadius: 1,
				bgcolor: 'rgba(34, 221, 34, 0.05)',
				boxShadow: '0 0 8px rgba(34, 221, 34, 0.3)',
				minWidth: 140,
				textAlign: 'center',
			}}
		>
			<Handle
				type='target'
				position={Position.Top}
				id='audio-in'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
			<Typography variant='caption' color='primary' sx={{ fontWeight: 600, letterSpacing: 1 }}>
				MASTER OUTPUT
			</Typography>
			<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.25 }}>
				→ woahscope
			</Typography>
		</Box>
	);
});
