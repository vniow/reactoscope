import { useState } from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import * as graph from '../audio/graph';

const speedMarks = [
	{ value: 0.5,  label: '0.5×' },
	{ value: 1,    label: '1×'   },
	{ value: 1.5,  label: '1.5×' },
	{ value: 2,    label: '2×'   },
];

export function SpeedControl() {
	const [playbackRate, setPlaybackRate] = useState(1);

	const handleSpeed = (_: Event, value: number | number[]) => {
		const rate = value as number;
		graph.setRate(rate);
		setPlaybackRate(rate);
	};

	return (
		<Box sx={{ px: 1, pb: 1 }}>
			<Typography variant='body2' color='text.secondary' gutterBottom>
				speed
			</Typography>
			<Slider
				aria-label='Playback speed'
				min={0.001}
				max={2}
				step={0.01}
				value={playbackRate}
				onChange={handleSpeed}
				marks={speedMarks}
				valueLabelDisplay='auto'
				size='small'
				color='primary'
				sx={{ mt: 1 }}
			/>
		</Box>
	);
}
