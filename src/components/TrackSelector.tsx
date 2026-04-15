import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';

interface Track {
	label: string;
	file: string;
}

interface TrackSelectorProps {
	tracks: Track[];
	currentTrack: string;
	onTrackChange: (file: string) => void;
}

export function TrackSelector({
	tracks,
	currentTrack,
	onTrackChange,
}: TrackSelectorProps) {
	const handleChange = (e: SelectChangeEvent) => {
		onTrackChange(e.target.value);
	};

	return (
		<Box sx={{ display: 'flex', justifyContent: 'center' }}>
			<FormControl size='small' sx={{ width: '100%' }}>
				<InputLabel id='track-select-label'>select a track</InputLabel>
				<Select
					labelId='track-select-label'
					id='trackSelect'
					value={currentTrack}
					label='Select a track'
					onChange={handleChange}
				>
					{tracks.map((track) => (
						<MenuItem key={track.file} value={track.file}>
							{track.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Box>
	);
}
