import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { setDCSignalValue, useDawStore } from '../../store/daw';
import type { DCSignalFlowNode } from '../../store/dawTypes';

export const DCSignalNode = memo(function DCSignalNode({
	id,
	data,
	selected,
}: NodeProps<DCSignalFlowNode>) {
	const [value, setValue] = useState(data.value ?? 1);

	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	const handleChange = (_: Event, v: number | number[]) => {
		const val = v as number;
		setValue(val);
		setDCSignalValue(id, val);
	};

	return (
		<Box
			sx={{
				p:           1.5,
				border:      '1px solid',
				borderColor: 'divider',
				borderRadius: 1,
				bgcolor:     'background.paper',
				minWidth:    180,
				position:    'relative',
			}}
		>
			{selected && (
				<IconButton
					size='small'
					onClick={handleDelete}
					aria-label='Delete node'
					className='nodrag'
					sx={{
						position:  'absolute',
						top:       4,
						right:     4,
						zIndex:    10,
						color:     'text.secondary',
						p:         0.25,
						'&:hover': { color: 'error.main' },
					}}
				>
					<CloseIcon sx={{ fontSize: 14 }} />
				</IconButton>
			)}

			<Typography
				variant='caption'
				color='text.secondary'
				sx={{ fontWeight: 600, letterSpacing: 0.5, mb: 1, display: 'block' }}
			>
				DC SIGNAL
			</Typography>

			<Box className='nodrag nowheel' sx={{ px: 0.5 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
					<Typography variant='caption' color='text.secondary'>value</Typography>
					<Typography variant='caption' color='text.secondary'>{value.toFixed(2)}</Typography>
				</Box>
				<Slider
					aria-label='DC value'
					min={-1}
					max={1}
					step={0.01}
					value={value}
					onChange={handleChange}
					size='small'
					color='primary'
				/>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>−1</Typography>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>0</Typography>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>+1</Typography>
				</Box>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
		</Box>
	);
});
