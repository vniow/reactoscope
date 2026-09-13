import { useCallback, useMemo } from 'react';
import { useMems } from '../../contexts/MemsContext';
import { createQuasistaticAxis } from '../../mems/quasistaticModel';
import { LaserSceneR3F, type LaserOptics } from './LaserSceneR3F';

// ─── MEMS Laser Beam Emulator ───────────────────────────────────────────────
// Sibling to GalvoSceneR3F, sharing LaserSceneR3F — the two devices differ
// only in their Scanner Model. See docs/mems-laser-emulator.md for the signal
// chain and ADR-0012 for why a MEMS mirror is not simply a slower galvo.

export function MemsSceneR3F() {
	const {
		enabled, quasistaticX, effectiveQuasistaticY,
		trackingBlankThreshold, trackingBlankSoftness,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
	} = useMems();

	const makeAxisX = useCallback(
		(sampleRate: number) => createQuasistaticAxis(sampleRate, quasistaticX),
		[quasistaticX],
	);
	const makeAxisY = useCallback(
		(sampleRate: number) => createQuasistaticAxis(sampleRate, effectiveQuasistaticY),
		[effectiveQuasistaticY],
	);

	const optics = useMemo<LaserOptics>(() => ({
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
		trackingBlankThreshold, trackingBlankSoftness,
	}), [
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
		trackingBlankThreshold, trackingBlankSoftness,
	]);

	return (
		<LaserSceneR3F
			makeAxisX={makeAxisX}
			makeAxisY={makeAxisY}
			scannerEnabled={enabled}
			optics={optics}
		/>
	);
}
