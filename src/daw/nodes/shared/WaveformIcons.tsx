import type { OscType } from '../../../store/dawTypes';

export function SineIcon({ active, color }: { active: boolean; color: string }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,6 C 3.5,6 3.5,1 7,1 C 10.5,1 10.5,11 14,11 C 17.5,11 17.5,1 21,1 C 24.5,1 24.5,6 28,6'
				stroke={c} strokeWidth={1.5} strokeLinecap='round'
			/>
		</svg>
	);
}

export function SquareIcon({ active, color }: { active: boolean; color: string }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,2 L 14,2 L 14,10 L 28,10'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

export function TriangleIcon({ active, color }: { active: boolean; color: string }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,6 L 7,1 L 21,11 L 28,6'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

export function SawtoothIcon({ active, color }: { active: boolean; color: string }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,11 L 13,1 L 13,11 L 26,1'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

export const WAVE_ICONS: Record<OscType, (active: boolean, color: string) => React.ReactNode> = {
	sine:     (active, color) => <SineIcon     active={active} color={color} />,
	square:   (active, color) => <SquareIcon   active={active} color={color} />,
	triangle: (active, color) => <TriangleIcon active={active} color={color} />,
	sawtooth: (active, color) => <SawtoothIcon active={active} color={color} />,
};

export const OSC_TYPES: readonly OscType[] = ['sine', 'square', 'triangle', 'sawtooth'];
