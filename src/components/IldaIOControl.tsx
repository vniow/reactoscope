import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { exportCurrentSceneAsIlda } from '../laser/ildaIO';
import { NODE_COLORS } from '../daw/nodes/nodeColors';
import { hwBtn } from '../daw/nodes/hwStyles';

const color = NODE_COLORS.scene;

export function IldaIOControl() {
	const [status, setStatus] = useState<string>('');

	const handleExport = () => {
		const ok = exportCurrentSceneAsIlda();
		setStatus(ok ? 'exported' : 'no scene data');
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
			<Button size='small' onClick={handleExport} sx={hwBtn(color)}>
				Export .ild
			</Button>
			<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, letterSpacing: 0.3 }}>
				{status || 'load .ild via Add Node → ILDA Frame'}
			</Typography>
		</Box>
	);
}
