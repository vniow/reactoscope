import Box from '@mui/material/Box';
import { VisualizationCanvasR3F } from '../../components';
import { useSquareSize } from '../../hooks/useSquareSize';

/**
 * Oscilloscope panel. Always renders the canvas as a 1:1 square, centred inside
 * whatever space the parent column gives it.
 *
 * useSquareSize measures the container with ResizeObserver and returns
 * Math.min(width, height), so the square is correct regardless of whether the
 * column is taller-than-wide or wider-than-tall — and regardless of how many
 * other panels share the column.
 */
export function WoahscopePanel() {
	const { ref, size } = useSquareSize();

	return (
		<Box
			ref={ref}
			sx={{
				width:          '100%',
				height:         '100%',
				bgcolor:        '#000',
				display:        'flex',
				alignItems:     'center',
				justifyContent: 'center',
				overflow:       'hidden',
			}}
		>
			<Box sx={{ width: size, height: size, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
				<VisualizationCanvasR3F />
			</Box>
		</Box>
	);
}
