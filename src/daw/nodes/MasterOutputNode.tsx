import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useDawStore } from '../../store/daw';
import type { MasterOutputFlowNode } from '../../store/dawTypes';

// Handle definitions for each mode
const STEREO_HANDLES = [
	{ id: 'in-0', label: 'X', pct: '30%' },
	{ id: 'in-1', label: 'Y', pct: '70%' },
];

const MULTI_HANDLES = [
	{ id: 'in-0', label: 'X',  pct: '10%' },
	{ id: 'in-1', label: 'Y',  pct: '26%' },
	{ id: 'in-2', label: 'R',  pct: '46%' },
	{ id: 'in-3', label: 'G',  pct: '62%' },
	{ id: 'in-4', label: 'B',  pct: '78%' },
	{ id: 'in-5', label: 'A',  pct: '94%' },
];

export const MasterOutputNode = memo<NodeProps<MasterOutputFlowNode>>(
	function MasterOutputNode({ data }) {
		const setMasterMode = useDawStore(s => s.setMasterMode);
		const mode = data.mode ?? 'stereo';
		const isMulti = mode === 'multichannel';
		const handles = isMulti ? MULTI_HANDLES : STEREO_HANDLES;

		return (
			<Box
				sx={{
					px:          2,
					py:          1.5,
					border:      '1px solid',
					borderColor: 'primary.main',
					borderRadius: 1,
					bgcolor:     'rgba(34, 221, 34, 0.05)',
					boxShadow:   '0 0 8px rgba(34, 221, 34, 0.3)',
					minWidth:    isMulti ? 240 : 180,
					textAlign:   'center',
					position:    'relative',
				}}
			>
				{/* Input handles */}
				{handles.map(h => (
					<Handle
						key={h.id}
						type='target'
						position={Position.Top}
						id={h.id}
						style={{ left: h.pct, background: '#22dd22', border: '2px solid #22dd22' }}
					/>
				))}

				{/* Handle labels */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, px: isMulti ? 0 : '18%' }}>
					{handles.map(h => (
						<Typography key={h.id} variant='caption' color='text.secondary' sx={{ fontSize: 9, flex: 1 }}>
							{h.label}
						</Typography>
					))}
				</Box>

				<Typography variant='caption' color='primary' sx={{ fontWeight: 600, letterSpacing: 1 }}>
					MASTER OUTPUT
				</Typography>
				<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.25 }}>
					→ woahscope
				</Typography>

				{/* Mode toggle */}
				<Box
					className='nodrag'
					sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.75, gap: 0.5 }}
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
			</Box>
		);
	},
);
