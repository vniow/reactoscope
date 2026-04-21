import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { setGainValue, useDawStore } from '../../store/daw';
import type { GainFlowNode } from '../../store/dawTypes';

export const GainNode = memo(function GainNode({
	id,
	data,
	selected,
}: NodeProps<GainFlowNode>) {
	const [gain, setGain] = useState(data.gain ?? 1.0);

	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	const handleGainChange = (_: Event, value: number | number[]) => {
		const g = value as number;
		setGain(g);
		setGainValue(id, g);
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
				GAIN
			</Typography>

			<Box className='nodrag nowheel' sx={{ px: 0.5 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
					<Typography variant='caption' color='text.secondary'>gain</Typography>
					<Typography variant='caption' color='text.secondary'>
						{gain.toFixed(2)}
					</Typography>
				</Box>
				<Slider
					aria-label='Gain'
					min={0}
					max={2}
					step={0.01}
					value={gain}
					onChange={handleGainChange}
					size='small'
					color='primary'
				/>
			</Box>

			<Handle
				type='target'
				position={Position.Top}
				id='in-0'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
		</Box>
	);
});
