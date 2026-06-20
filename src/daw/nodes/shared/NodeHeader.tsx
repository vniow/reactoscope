import { useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useDawStore } from '../../../store/daw';
import { HEADER_HEIGHT } from './gridSystem';
import { hwDeleteIconBtn } from './hwStyles';

/** Exported for handle-position calc expressions in node components. */
export const NODE_HEADER_HEIGHT = HEADER_HEIGHT;

/** Standard handle top for nodes whose handles sit just below the header. */
export const BELOW_HEADER_HANDLE_TOP = `${HEADER_HEIGHT + 10}px`;

interface NodeHeaderProps {
	label:          string;
	/** Omit for non-deletable nodes. */
	id?:            string;
	selected?:      boolean;
	/** Hex accent color, e.g. '#4488ff'. Controls label color and header background tint. */
	accentColor?:   string;
	/** Fill the header with the accent color. Palette colors are light, so label uses dark text. */
	filledHeader?:  boolean;
}

export function NodeHeader({ label, id, selected, accentColor, filledHeader }: NodeHeaderProps) {
	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		if (id) onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	return (
		<Box sx={{
			px:           1.5,
			height:       HEADER_HEIGHT,
			boxSizing:    'border-box',
			display:      'flex',
			alignItems:   'center',
			borderBottom: '1px solid',
			borderColor:  filledHeader ? 'rgba(0,0,0,0.15)' : (accentColor ? `${accentColor}40` : 'divider'),
			bgcolor:      filledHeader ? accentColor : '#1c1c20',
			borderRadius: '4px 4px 0 0',
			flexShrink:   0,
		}}>
			<Typography
				variant='caption'
				sx={{
					fontWeight:    600,
					letterSpacing: 0.5,
					lineHeight:    1,
					flex:          1,
					color:         filledHeader ? 'rgba(0,0,0,0.72)' : (accentColor ?? '#888'),
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
					sx={hwDeleteIconBtn(filledHeader ? 'rgba(0,0,0,0.5)' : (accentColor ?? '#888'))}
				>
					<CloseIcon sx={{ fontSize: 12 }} />
				</IconButton>
			)}
		</Box>
	);
}
