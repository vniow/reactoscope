import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SettingsIcon from '@mui/icons-material/Settings';
import { useEffects } from '../contexts/WoahscopeContext';
import type { VizMode } from '../contexts/WoahscopeContext';
import { EffectsControl }        from '../components/GainControl';
import { PhosphorControl }       from '../components/PhosphorControl';
import { VisualizationControls } from '../components/VisualizationControls';
import { useDawStore, isMasterMultichannel } from '../store/daw';
import { NODE_COLORS } from './nodes/nodeColors';
import { METAL_BG }    from './nodes/metalBackground';
import { hwIconBtn, hwIconBtnLit, hwToggleSx } from './nodes/hwStyles';

const color = NODE_COLORS.scene;

function Sect({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
			<Typography variant='caption' color='text.disabled'
				sx={{ fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' }}>
				{label}
			</Typography>
			{children}
		</Box>
	);
}

export function VizSettingsOverlay({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const setOpenTracked = (v: boolean) => { setOpen(v); onOpenChange?.(v); };

	const { vizMode, setVizMode } = useEffects();

	const isMultichannel = useDawStore(s => isMasterMultichannel(s.edges));

	return (
		<>
			<IconButton
				ref={anchorRef}
				onClick={() => setOpenTracked(!open)}
				size='small'
				aria-label='Visualiser settings'
				sx={open ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}
			>
				<SettingsIcon sx={{ fontSize: 12 }} />
			</IconButton>

			<Popover
				open={open}
				anchorEl={anchorRef.current}
				onClose={() => setOpenTracked(false)}
				anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
				transformOrigin={{ vertical: 'center', horizontal: 'left' }}
				slotProps={{
					paper: {
						sx: {
							backgroundImage: METAL_BG,
							border:          `1px solid ${color}40`,
							boxShadow:       `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
							borderRadius:    1,
							width:           260,
							p:               1.5,
						},
					},
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

					<Sect label='mode'>
						<ToggleButtonGroup
							value={vizMode}
							exclusive
							onChange={(_e, v: VizMode | null) => { if (v) setVizMode(v); }}
							size='small'
							fullWidth
							sx={hwToggleSx(color)}
						>
							<ToggleButton value='oscilloscope' sx={{ flex: 1 }}>Oscilloscope</ToggleButton>
							<ToggleButton value='laser'        sx={{ flex: 1 }}>Laser</ToggleButton>
						</ToggleButtonGroup>
					</Sect>

					{!isMultichannel && (
						<Sect label='phosphor'>
							<PhosphorControl />
						</Sect>
					)}

					<Sect label='display'>
						<VisualizationControls hideCrt={vizMode === 'laser'} />
					</Sect>

					<Sect label='effects'>
						<EffectsControl />
					</Sect>

				</Box>
			</Popover>
		</>
	);
}
