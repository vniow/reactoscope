import { useCallback, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { EditInput, useBoundsEdit } from './hwSliderShared';

// ─── Geometry ─────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
	const rad = (deg * Math.PI) / 180;
	return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

/**
 * SVG arc path. startDeg and sweep are in SVG-space (0° = 3 o'clock, clockwise).
 * sweep is clamped to 359.99 so a "full" arc doesn't collapse to nothing.
 */
function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
	if (sweepDeg <= 0) return '';
	const sweep       = Math.min(sweepDeg, 359.99);
	const [sx, sy]    = polar(cx, cy, r, startDeg);
	const [ex, ey]    = polar(cx, cy, r, startDeg + sweep);
	const largeArc    = sweep > 180 ? 1 : 0;
	return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
}

// 270° arc — gap at 6 o'clock (SVG 90°).
// In SVG-space: start = 135° (7:30 position), sweep CW 270° to 45° (4:30 position).
const ARC_START = 135;
const ARC_SWEEP = 270;
const STROKE    = 5;

/** Extra grab margin (px) around the visible stroke — the ring is the hit target, not the whole square. */
const HIT_PAD = 7;

/** Is a point `dist` px from center within the padded ring band at radius `r`? */
function isOnRing(dist: number, r: number) {
	return Math.abs(dist - r) <= STROKE / 2 + HIT_PAD;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface HwArcSliderProps {
	label:            string;
	value:            number;
	min:              number;
	max:              number;
	step:             number;
	color:            string;
	onChange:         (value: number) => void;
	format?:          (v: number) => string;
	unit?:            string;
	allowValueEdit?:  boolean;
	allowBoundsEdit?: boolean;
	/** Place the label centred below the arc instead of top-left. */
	labelBelow?:      boolean;
	/** Outer diameter of the arc (px). Default 64. */
	size?:            number;
}

export function HwArcSlider({
	label, value, min, max, step, color, onChange,
	format, unit, allowValueEdit, allowBoundsEdit, labelBelow, size = 64,
}: HwArcSliderProps) {
	const uid = useId();

	const [editingValue, setEditingValue] = useState(false);
	const {
		editingMin, setEditingMin,
		editingMax, setEditingMax,
		localMin, localMax,
		commitMin, commitMax,
	} = useBoundsEdit(min, max, value, onChange);

	const decimals     = (step.toString().split('.')[1] ?? '').length;
	const norm         = Math.max(0, Math.min(1, (value - localMin) / (localMax - localMin)));
	const cx           = size / 2;
	const cy           = size / 2;
	const r            = cx - STROKE / 2 - 2;
	const displayValue = format ? format(value) : value.toFixed(decimals);
	const displayLabel = unit ? `${displayValue} ${unit}` : displayValue;
	const filterId     = `arc-glow${uid.replace(/:/g, '_')}`;

	const applyValue = useCallback((raw: number) => {
		const stepped = Math.round(raw / step) * step;
		const clamped = Math.max(localMin, Math.min(localMax, stepped));
		onChange(parseFloat(clamped.toFixed(decimals)));
	}, [step, localMin, localMax, decimals, onChange]);

	const draggingRef = useRef(false);
	const [hoveringRing, setHoveringRing] = useState(false);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		const rect    = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const centerX = rect.left + rect.width  / 2;
		const centerY = rect.top  + rect.height / 2;
		const r       = rect.width / 2 - STROKE / 2 - 2;

		const dist0 = Math.hypot(e.clientX - centerX, e.clientY - centerY);
		if (!isOnRing(dist0, r)) return;

		e.preventDefault();
		e.stopPropagation();
		draggingRef.current = true;

		const angleNorm = (clientX: number, clientY: number) => {
			const angleDeg  = (Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI + 360) % 360;
			const fromStart = (angleDeg - ARC_START + 360) % 360;
			if (fromStart <= ARC_SWEEP) return fromStart / ARC_SWEEP;
			// In the gap — snap to whichever end is closer
			return fromStart < ARC_SWEEP + (360 - ARC_SWEEP) / 2 ? 1 : 0;
		};

		const apply = (clientX: number, clientY: number) => {
			applyValue(localMin + angleNorm(clientX, clientY) * (localMax - localMin));
		};

		// Grab is gated to the ring, but once dragging the value tracks the cursor
		// anywhere on screen — same as the current native window listeners below.
		let rafId: number | null = null;
		let pendingXY: [number, number] | null = null;

		const onMove = (me: MouseEvent) => {
			pendingXY = [me.clientX, me.clientY];
			if (rafId != null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				if (pendingXY) apply(...pendingXY);
			});
		};
		const onUp = () => {
			if (rafId != null) cancelAnimationFrame(rafId);
			draggingRef.current = false;
			setHoveringRing(false);
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);

		apply(e.clientX, e.clientY);
	}, [localMin, localMax, applyValue]);

	const handleHoverMove = useCallback((e: React.MouseEvent) => {
		if (draggingRef.current) return;
		const rect    = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const centerX = rect.left + rect.width  / 2;
		const centerY = rect.top  + rect.height / 2;
		const r       = rect.width / 2 - STROKE / 2 - 2;
		const dist    = Math.hypot(e.clientX - centerX, e.clientY - centerY);
		setHoveringRing(isOnRing(dist, r));
	}, []);

	const handleHoverLeave = useCallback(() => {
		if (draggingRef.current) return;
		setHoveringRing(false);
	}, []);

	const commitValue = useCallback((raw: string) => {
		setEditingValue(false);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed)) onChange(Math.min(localMax, Math.max(localMin, parsed)));
	}, [onChange, localMin, localMax]);

	const thumbAngle  = ARC_START + norm * ARC_SWEEP;
	const [tx, ty]    = polar(cx, cy, r, thumbAngle);
	const [sx, sy]    = polar(cx, cy, r, ARC_START);
	const gradientId  = `${filterId}-grad`;
	const grooveId    = `${filterId}-groove`;

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.25, width: size }}>

			{/* Label + value row (label omitted here when labelBelow) */}
			<Box sx={{ display: 'flex', justifyContent: labelBelow ? 'center' : 'space-between', alignItems: 'center', gap: 0.5 }}>
				{!labelBelow && (
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
						{label}
					</Typography>
				)}
				{allowValueEdit && editingValue ? (
					<EditInput
						defaultValue={displayValue}
						onCommit={commitValue}
						onCancel={() => setEditingValue(false)}
						fontSize={10} width={36}
					/>
				) : (
					<Typography
						variant='caption' color='text.disabled'
						sx={{ fontSize: 10, cursor: allowValueEdit ? 'text' : 'default', userSelect: 'none' }}
						onClick={allowValueEdit ? () => setEditingValue(true) : undefined}
					>
						{displayLabel}
					</Typography>
				)}
			</Box>

			{/* Arc SVG */}
			<Box
				component='svg'
				width={size} height={size}
				viewBox={`0 0 ${size} ${size}`}
				sx={{ cursor: hoveringRing ? 'crosshair' : 'default', display: 'block', overflow: 'visible', userSelect: 'none' }}
				className='nodrag'
				onMouseDown={handleMouseDown}
				onMouseMove={handleHoverMove}
				onMouseLeave={handleHoverLeave}
			>
				<defs>
					<filter id={filterId} x='-80%' y='-80%' width='260%' height='260%'>
						<feGaussianBlur in='SourceGraphic' stdDeviation='1.8' result='blur' />
						<feMerge>
							<feMergeNode in='blur' />
							<feMergeNode in='SourceGraphic' />
						</feMerge>
					</filter>
					<linearGradient id={gradientId} gradientUnits='userSpaceOnUse'
						x1={sx} y1={sy} x2={tx} y2={ty}>
						<stop offset='0%'   stopColor={`${color}80`} />
						<stop offset='100%' stopColor={color} />
					</linearGradient>
					{/* Fixed top-down light source, independent of the arc's rotation — matches the slider rail's inset shading. */}
					<linearGradient id={grooveId} gradientUnits='userSpaceOnUse'
						x1={cx} y1={cy - r} x2={cx} y2={cy + r}>
						<stop offset='0%'   stopColor='#0a0a0c' />
						<stop offset='50%'  stopColor='#0d0d0f' />
						<stop offset='100%' stopColor='#131316' />
					</linearGradient>
				</defs>

				{/* Background track — carved groove: dark walls, top-lit face, thin outer-edge highlight */}
				<path
					d={arcPath(cx, cy, r, ARC_START, ARC_SWEEP)}
					fill='none'
					stroke='#0d0d0f'
					strokeWidth={STROKE + 2}
					strokeLinecap='round'
				/>
				<path
					d={arcPath(cx, cy, r, ARC_START, ARC_SWEEP)}
					fill='none'
					stroke={`url(#${grooveId})`}
					strokeWidth={STROKE}
					strokeLinecap='round'
				/>
				<path
					d={arcPath(cx, cy, r + STROKE / 2 - 0.5, ARC_START, ARC_SWEEP)}
					fill='none'
					stroke='rgba(255,255,255,0.05)'
					strokeWidth={1}
					strokeLinecap='round'
				/>

				{/* Value track */}
				{norm > 0.005 && (
					<path
						d={arcPath(cx, cy, r, ARC_START, norm * ARC_SWEEP)}
						fill='none'
						stroke={`url(#${gradientId})`}
						strokeWidth={STROKE}
						strokeLinecap='round'
						filter={`url(#${filterId})`}
					/>
				)}

				{/* Thumb */}
				<circle
					cx={tx} cy={ty} r={STROKE - 1}
					fill='#3a3a42'
					stroke={color}
					strokeWidth={1.5}
					filter={norm > 0.005 ? `url(#${filterId})` : undefined}
				/>
			</Box>

			{/* Below-arc label */}
			{labelBelow && (
				<Typography variant='caption' color='text.secondary'
					sx={{ fontSize: 10, textAlign: 'center', mt: 0.25 }}>
					{label}
				</Typography>
			)}

			{/* Bounds row */}
			{allowBoundsEdit && (
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
					{editingMin ? (
						<EditInput
							defaultValue={String(localMin)}
							onCommit={commitMin}
							onCancel={() => setEditingMin(false)}
							compact width={24}
						/>
					) : (
						<Typography
							variant='caption'
							sx={{ fontSize: 8, color: 'text.disabled', cursor: 'text', userSelect: 'none' }}
							onClick={() => setEditingMin(true)}
						>
							{localMin}{unit ? ` ${unit}` : ''}
						</Typography>
					)}
					{editingMax ? (
						<EditInput
							defaultValue={String(localMax)}
							onCommit={commitMax}
							onCancel={() => setEditingMax(false)}
							compact width={24}
						/>
					) : (
						<Typography
							variant='caption'
							sx={{ fontSize: 8, color: 'text.disabled', cursor: 'text', userSelect: 'none' }}
							onClick={() => setEditingMax(true)}
						>
							{localMax}{unit ? ` ${unit}` : ''}
						</Typography>
					)}
				</Box>
			)}

		</Box>
	);
}
