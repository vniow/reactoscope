import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SettingsIcon from '@mui/icons-material/Settings';
import { useEffects } from '../contexts/WoahscopeContext';
import type { VizMode } from '../contexts/WoahscopeContext';
import { GainControl }           from '../components/GainControl';
import { PhosphorControl }       from '../components/PhosphorControl';
import { VisualizationControls } from '../components/VisualizationControls';
import { useDawStore }           from '../store/daw';

export function VizSettingsOverlay() {
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);

	const { vizMode, setVizMode } = useEffects();

	const masterMode = useDawStore(
		s => (s.nodes.find(n => n.type === 'masterOutput')?.data as { mode?: string } | undefined)?.mode ?? 'stereo'
	);
	const isMultichannel = masterMode === 'multichannel';

	return (
		<>
			<IconButton
				ref={anchorRef}
				onClick={() => setOpen(v => !v)}
				size='small'
				aria-label='Visualiser settings'
				sx={{
					color: open ? '#22dd22' : '#444',
					borderRadius: 1,
					'&:hover': { color: '#22dd22' },
				}}
			>
				<SettingsIcon fontSize='small' />
			</IconButton>

			<Popover
				open={open}
				anchorEl={anchorRef.current}
				onClose={() => setOpen(false)}
				anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
				transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				slotProps={{
					paper: {
						sx: {
							bgcolor: 'rgba(10,10,10,0.92)',
							backdropFilter: 'blur(8px)',
							border: '1px solid rgba(255,255,255,0.08)',
							borderRadius: 1,
							width: 260,
							p: 1.5,
						},
					},
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
					{/* Emulator mode toggle */}
					<ToggleButtonGroup
						value={vizMode}
						exclusive
						onChange={(_e, v: VizMode | null) => { if (v) setVizMode(v); }}
						size='small'
						fullWidth
						sx={{ '& .MuiToggleButton-root': { flex: 1, fontSize: '0.7rem', py: 0.5 } }}
					>
						<ToggleButton value='oscilloscope'>Oscilloscope</ToggleButton>
						<ToggleButton value='laser'>Laser</ToggleButton>
					</ToggleButtonGroup>

					<Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

					{/* Phosphor colour — hidden in multichannel (RGB from audio) */}
					{!isMultichannel && <PhosphorControl />}

					{/* Axis + effects toggles — CRT hidden in laser mode */}
					<VisualizationControls hideCrt={vizMode === 'laser'} />

					<Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

					<GainControl />
				</Box>
			</Popover>
		</>
	);
}
