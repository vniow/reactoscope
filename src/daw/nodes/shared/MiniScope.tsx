import { useEffect, useRef } from 'react';
import { useAxis } from '../../../contexts/WoahscopeContext';
import { readWaveformTap } from '../../../audio/engine';
import type { TapCursor } from '../../../audio/engine';
import { isMasterMultichannel, useDawStore } from '../../../store/daw';
import { getColourFromHue } from '../../../woahscope/utils';

interface MiniScopeProps {
	width:  number
	height: number
}

const STRIDE   = 1;
const INTERVAL = 1000 / 60;
const PT       = 2;

export function MiniScope({ width, height }: MiniScopeProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { hue }   = useAxis();
	const multichannel = useDawStore(s => isMasterMultichannel(s.edges));
	const hueRef    = useRef(hue);
	const multiRef  = useRef(multichannel);

	useEffect(() => { hueRef.current = hue; },  [hue]);
	useEffect(() => { multiRef.current = multichannel; }, [multichannel]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio ?? 1;
		canvas.width  = width  * dpr;
		canvas.height = height * dpr;
		const ctx = canvas.getContext('2d')!;
		ctx.scale(dpr, dpr);

		let rafId: number;
		let last = 0;
		const tapCursor: TapCursor = { last: 0 };

		function loop(now: number) {
			rafId = requestAnimationFrame(loop);
			if (now - last < INTERVAL) return;
			last = now;

			const waveform = readWaveformTap(tapCursor);
			if (waveform === null) return;

			ctx.clearRect(0, 0, width, height);

			const { x, y, r, g, b, z } = waveform;
			const multi = multiRef.current;

			let stereoR = 0, stereoG = 0, stereoB = 0;
			if (!multi) {
				const [hr, hg, hb] = getColourFromHue(hueRef.current);
				stereoR = Math.round(hr * 255);
				stereoG = Math.round(hg * 255);
				stereoB = Math.round(hb * 255);
			}

			for (let i = 0; i < x.length; i += STRIDE) {
				const ca = (0.5 + 0.5 * z[i]).toFixed(3);
				if (multi) {
					const cr = Math.round((0.5 + 0.5 * r[i]) * 255);
					const cg = Math.round((0.5 + 0.5 * g[i]) * 255);
					const cb = Math.round((0.5 + 0.5 * b[i]) * 255);
					ctx.fillStyle = `rgba(${cr},${cg},${cb},${ca})`;
				} else {
					ctx.fillStyle = `rgba(${stereoR},${stereoG},${stereoB},${ca})`;
				}
				const px = ( x[i] * 0.5 + 0.5) * width;
				const py = (-y[i] * 0.5 + 0.5) * height;
				ctx.fillRect(px - PT / 2, py - PT / 2, PT, PT);
			}
		}

		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	}, [width, height]);

	return (
		<canvas
			ref={canvasRef}
			style={{ width, height, display: 'block' }}
		/>
	);
}
