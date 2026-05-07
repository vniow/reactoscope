import { useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useDawStore } from '../../store/daw';

/** px height of the header row — use to offset left-handle top positions into the body. */
export const NODE_HEADER_HEIGHT = 34;

interface NodeHeaderProps {
	label:        string;
	/** Omit for non-deletable nodes. */
	id?:          string;
	selected?:    boolean;
	/** Hex accent color, e.g. '#4488ff'. Controls label color and header background tint. */
	accentColor?: string;
}

export function NodeHeader({ label, id, selected, accentColor }: NodeHeaderProps) {
	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		if (id) onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	return (
		<Box sx={{
			px:           1.5,
			py:           1.25,
			display:      'flex',
			alignItems:   'center',
			borderBottom: '1px solid',
			borderColor:  accentColor ? `${accentColor}40` : 'divider',
			bgcolor:      accentColor ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
			borderRadius: '4px 4px 0 0',
		}}>
			<Typography
				variant='caption'
				sx={{
					fontWeight:   600,
					letterSpacing: 0.5,
					lineHeight:   1,
					flex:         1,
					color:        accentColor ?? '#888',
				}}
			>
				{label.toUpperCase()}
			</Typography>

			{id && selected && (
				<IconButton
					size='small'
					onClick={handleDelete}
					aria-label='Delete node'
					className='nodrag'
					sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
				>
					<CloseIcon sx={{ fontSize: 12 }} />
				</IconButton>
			)}
		</Box>
	);
}
