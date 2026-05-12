import Box from '@mui/material/Box';
import { HW_INSET, HW_RAISED, hwLit } from './hwStyles';

export function HwSwitch({ checked, color, onChange }: { checked: boolean; color: string; onChange: () => void }) {
	const lit = hwLit(color);
	return (
		<Box onClick={onChange} sx={{
			...HW_INSET,
			...(checked ? { ...lit, borderRadius: '9px' } : { borderRadius: '9px' }),
			width: 32, height: 18,
			position: 'relative', cursor: 'pointer', flexShrink: 0,
		}}>
			<Box sx={{
				position: 'absolute',
				top: '50%',
				transform: 'translateY(-50%)',
				left: checked ? '14px' : '2px',
				width: 14, height: 14,
				borderRadius: '50%',
				transition: 'left 120ms ease, background 120ms ease, box-shadow 120ms ease',
				...(checked ? {
					background: `linear-gradient(to bottom, ${color}, ${color}bb)`,
					boxShadow:  `0 0 6px ${color}99, 0 1px 2px rgba(0,0,0,0.4)`,
				} : {
					background: 'linear-gradient(to bottom, #484850, #343438)',
					boxShadow:  '0 1px 3px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
				}),
			}} />
		</Box>
	);
}

export function HwLed({ checked, round, color, onClick }: { checked: boolean; round?: boolean; color: string; onClick: () => void }) {
	const lit = hwLit(color);
	return (
		<Box onClick={onClick} sx={{
			width: 14, height: 14, cursor: 'pointer', flexShrink: 0,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			...(checked ? lit : HW_RAISED), borderRadius: round ? '50%' : '2px',
		}}>
			{checked && (
				<Box sx={{
					width: round ? 5 : 6, height: round ? 5 : 6,
					borderRadius: round ? '50%' : '1px',
					bgcolor: color, boxShadow: `0 0 5px ${color}e0`,
				}} />
			)}
		</Box>
	);
}

export function HwLevelMeter({ value, color }: { value: number; color: string }) {
	return (
		<Box sx={{ ...HW_INSET, height: 6, overflow: 'hidden' }}>
			<Box sx={{
				width: `${value}%`, height: '100%',
				background: `linear-gradient(to right, ${color}80, ${color})`,
				boxShadow:  `0 0 4px ${color}40`,
				transition: 'width 100ms ease',
			}} />
		</Box>
	);
}
