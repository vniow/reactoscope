import { useCallback, useMemo } from 'react';
import { useGalvo } from '../../contexts/GalvoContext';
import { createScannerAxis } from '../../galvo/scannerModel';
import { LaserSceneR3F, type LaserOptics } from './LaserSceneR3F';

// ─── Galvo Laser Beam Emulator ──────────────────────────────────────────────
// Everything this device does downstream of its Scanner Model is laser-generic
// and lives in LaserSceneR3F; all that is left here is binding the galvo's own
// servo model and parameters to it. See docs/galvo-laser-emulator.md for the
// signal chain and parameter tables, and ADR-0012 sub-decision 6 for why the
// renderer was shared rather than copied when MEMS Laser arrived.

export function GalvoSceneR3F() {
	const {
		enabled, scannerX, effectiveScannerY,
		trackingBlankThreshold, trackingBlankSoftness,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
	} = useGalvo();

	// Memoised on the parameter objects, because a new factory identity is what
	// tells LaserSceneR3F to rebuild the axis — that is how a slider edit
	// reaches the model.
	const makeAxisX = useCallback(
		(sampleRate: number) => createScannerAxis(sampleRate, scannerX),
		[scannerX],
	);
	const makeAxisY = useCallback(
		(sampleRate: number) => createScannerAxis(sampleRate, effectiveScannerY),
		[effectiveScannerY],
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
