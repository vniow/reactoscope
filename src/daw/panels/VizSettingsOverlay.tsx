import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import { EffectsControl }        from '../../components/scope/GainControl';
import { PhosphorControl }       from '../../components/scope/PhosphorControl';
import { VisualizationControls } from '../../components/scope/VisualizationControls';
import { useDawStore, isMasterMultichannel } from '../../store/daw';
import { NODE_COLORS } from '../nodes/shared/nodeColors';
import { METAL_BG }    from '../nodes/shared/metalBackground';
import { hwIconBtn, hwIconBtnLit } from '../nodes/shared/hwStyles';

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

			{/* eslint-disable-next-line react-hooks/refs */}
			<Popover open={open} anchorEl={anchorRef.current} onClose={() => setOpenTracked(false)}
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

					{!isMultichannel && (
						<Sect label='phosphor'>
							<PhosphorControl />
						</Sect>
					)}

					<Sect label='display'>
						<VisualizationControls />
					</Sect>

					<Sect label='effects'>
						<EffectsControl />
					</Sect>

				</Box>
			</Popover>
		</>
	);
}
