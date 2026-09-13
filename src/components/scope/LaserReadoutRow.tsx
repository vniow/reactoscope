import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { useLaserReadout } from './laserReadout';

// Live, display-only telemetry shared by both laser Beam Emulators. Nothing
// here clamps or corrects anything (ADR-0010 sub-decision 9, ADR-0012
// sub-decision 9) — it exists so the view can be read as an instrument rather
// than just looked at.

function Stat({ label, value, tooltip, warn }: {
	label: string; value: string; tooltip: string; warn?: boolean;
}) {
	return (
		<Tooltip title={tooltip} placement='top' arrow>
			<Box sx={{ display: 'flex', gap: 0.5, cursor: 'help', alignItems: 'baseline' }}>
				<Box component='span' sx={{ opacity: 0.6 }}>{label}</Box>
				<Box component='span' sx={{
					fontVariantNumeric: 'tabular-nums',
					color: warn ? '#e0736a' : undefined,
				}}>{value}</Box>
			</Box>
		</Tooltip>
	);
}

export function LaserReadoutRow() {
	const { trackingRms, trackingPeak, clampedFraction, resetCount } = useLaserReadout();

	return (
		<Box sx={{
			display: 'flex', flexWrap: 'wrap', gap: 1.25,
			fontSize: 10, opacity: 0.85, px: 0.25,
		}}>
			<Stat
				label='track'
				value={trackingRms.toFixed(4)}
				tooltip='RMS distance between where the beam was commanded to be and where the Scanner Model puts it, over the last frame. Large values are not a defect here — they are the lag being measured.'
			/>
			<Stat
				label='peak'
				value={trackingPeak.toFixed(4)}
				tooltip='Worst single-sample tracking error in the last frame.'
			/>
			{clampedFraction !== null && (
				<Stat
					label='clamp'
					value={`${Math.round(clampedFraction * 100)}%`}
					warn={clampedFraction > 0.02}
					tooltip='Share of samples driven past the safe deflection limit and clamped. Anything above a few percent means the figure is being squared off by the angle limit, not merely softened by the filter.'
				/>
			)}
			<Stat
				label='resets'
				value={String(resetCount)}
				warn={resetCount > 0}
				tooltip='Times the Scanner Model was warm-started because the waveform tap lost continuity. A rising count means the view is partly showing seams rather than physics.'
			/>
		</Box>
	);
}
