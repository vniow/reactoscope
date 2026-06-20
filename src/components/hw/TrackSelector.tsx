import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { hwSelectSx, hwSelectMenuProps } from '../../daw/nodes/shared/hwStyles';

interface Track {
	label: string;
	file: string;
}

interface TrackSelectorProps {
	tracks: Track[];
	currentTrack: string;
	onTrackChange: (file: string) => void;
	color: string;
}

export function TrackSelector({ tracks, currentTrack, onTrackChange, color }: TrackSelectorProps) {
	const handleChange = (e: SelectChangeEvent) => onTrackChange(e.target.value);

	return (
		<Box>
			<Select
				value={currentTrack}
				onChange={handleChange}
				size='small'
				fullWidth
				displayEmpty
				sx={hwSelectSx(color)}
				MenuProps={hwSelectMenuProps(color)}
			>
				<MenuItem value='' disabled sx={{ fontSize: 11, color: 'text.disabled' }}>select a track</MenuItem>
				{tracks.map(track => (
					<MenuItem key={track.file} value={track.file} sx={{ fontSize: 11 }}>
						{track.label}
					</MenuItem>
				))}
			</Select>
		</Box>
	);
}
