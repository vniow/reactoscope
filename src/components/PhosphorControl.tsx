import { useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAxis } from '../contexts/WoahscopeContext';
import { getColourFromHue, hueToHex, hexToHue } from '../woahscope/utils';

export function PhosphorControl() {
	const { hue, setHue } = useAxis();
	const inputRef = useRef<HTMLInputElement>(null);

	const { css, glow } = useMemo(() => {
		const [r, g, b] = getColourFromHue(hue);
		const base = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
		return { css: `rgb(${base})`, glow: `rgba(${base}, 0.6)` };
	}, [hue]);

	return (
		<Box sx={{ px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<Typography variant='body2' color='text.secondary'>
				phosphor
			</Typography>

			<Box
				component='button'
				onClick={() => inputRef.current?.click()}
				aria-label='Pick phosphor colour'
				sx={{
					width: 28,
					height: 28,
					borderRadius: '50%',
					bgcolor: css,
					boxShadow: `0 0 8px 3px ${glow}`,
					border: 'none',
					cursor: 'pointer',
					p: 0,
					flexShrink: 0,
					transition: 'box-shadow 0.15s ease',
					'&:hover': {
						boxShadow: `0 0 14px 5px ${glow}`,
					},
				}}
			/>

			<input
				ref={inputRef}
				type='color'
				value={hueToHex(hue)}
				onChange={(e) => setHue(hexToHue(e.target.value))}
				style={{
					position: 'absolute',
					opacity: 0,
					width: 0,
					height: 0,
					pointerEvents: 'none',
				}}
			/>
		</Box>
	);
}
