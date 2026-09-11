import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { ScannerParams } from '../galvo/scannerModel';

// ─── Galvo Laser settings ───────────────────────────────────────────────────
// Per ADR-0010 sub-decision 6: kept separate from WoahscopeContext, since
// none of this is CRT-specific and that context's own reshaping is a
// deferred follow-up, not something to fold new work into. GalvoSceneR3F
// reads device-neutral settings (swapXY, invertXY, intensity, nSamples,
// lanczos*) from useAxis()/useEffects() directly, same as SweepSceneR3F
// already does — they are NOT duplicated here.
//
// Every field is directly user-adjustable (ADR-0010, sub-decision 8) — no
// preset layer. Defaults below are plausible orders of magnitude, not
// calibrated values; see docs/galvo-laser-emulator.md's Parameters section
// for the full rationale behind each one, including per-field ranges.
//
// Live telemetry (kpps, tracking error, reset count, ...) deliberately does
// NOT live here: it changes every frame, and pushing that through Context
// would re-render every consumer at frame rate. It follows this codebase's
// existing "tap + readout" convention instead (a ref polled by rAF), not
// React state.

const DEFAULT_SCANNER: ScannerParams = { bandwidth: 1000, damping: 0.7, slewLimit: 2000 };

export interface GalvoContextType {
	enabled:  boolean; setEnabled:  (v: boolean) => void;
	linkAxes: boolean; setLinkAxes: (v: boolean) => void;

	scannerX: ScannerParams; setScannerX: (p: ScannerParams) => void;
	scannerY: ScannerParams; setScannerY: (p: ScannerParams) => void;
	/**
	 * The params GalvoSceneR3F should actually drive the Y axis with: `scannerY`
	 * when unlinked, `scannerX` mirrored when linked. `scannerY`'s own stored
	 * value is untouched while linked — unlinking resumes from wherever it was
	 * left, not from a reset default.
	 */
	effectiveScannerY: ScannerParams;
	/**
	 * Forces the beam blank whenever the Scanner Model's actual output
	 * position differs from the commanded position by more than this (in the
	 * same normalised units as X/Y). Real laser systems blank via TTL during
	 * fast repositioning moves for the same reason this exists: without it, Z
	 * unblanks exactly when the *commanded* position reaches a blank-travel
	 * target, while the lagged, slew-limited *actual* position is still
	 * mid-transit — rendering a bright streak while the beam is still visibly
	 * moving. Small enough to leave ordinary corner-rounding lag (a much
	 * smaller, intentional artifact — see GalvoSceneR3F's header comment)
	 * unaffected.
	 */
	trackingBlankThreshold: number; setTrackingBlankThreshold: (v: number) => void;
	/**
	 * Softens the tracking-blank gate from a hard cutoff into a smoothstep
	 * ramp. At 0, the gate is a step function — alpha jumps from fully blank
	 * to whatever Z says the instant tracking error crosses back under
	 * `trackingBlankThreshold`, which is itself a small but real artifact (a
	 * "pop-in" right at the threshold boundary, since crossing the threshold
	 * only means the servo is close enough, not settled). At 1, the ramp
	 * spans the full range from 0 tracking error up to the threshold, fading
	 * the beam in gradually as the servo actually settles instead.
	 */
	trackingBlankSoftness: number; setTrackingBlankSoftness: (v: number) => void;

	spotSize:   number; setSpotSize:   (v: number) => void;
	power:      number; setPower:      (v: number) => void;
	gainR:      number; setGainR:      (v: number) => void;
	gainG:      number; setGainG:      (v: number) => void;
	gainB:      number; setGainB:      (v: number) => void;
	blankFloor: number; setBlankFloor: (v: number) => void;
	zGamma:     number; setZGamma:     (v: number) => void;

	exposureTime: number; setExposureTime: (v: number) => void;
	glowStrength: number; setGlowStrength: (v: number) => void;
	hazeStrength: number; setHazeStrength: (v: number) => void;
	whitePoint:   number; setWhitePoint:   (v: number) => void;

	/**
	 * Corner-safety path generation (ADR-0011, docs/galvo-corner-safety.md):
	 * replaces orderSegments/buildCoordBuffer's fixed-size greedy walk with a
	 * variable-length, Eulerian-circuit-ordered, corner/blank-dwell-aware
	 * buffer. Off by default — un-toggling it reproduces today's exact
	 * behaviour, since it changes a load-bearing buffer-size contract every
	 * consumer depends on and hasn't been stress-tested against real scenes
	 * yet (ADR-0011, decision 3).
	 */
	cornerSafetyEnabled: boolean; setCornerSafetyEnabled: (v: boolean) => void;
	/** Points added at a lit corner per radian of turn (lasy: radians_per_point). */
	radiansPerPoint: number; setRadiansPerPoint: (v: number) => void;
	/** Density floor for a lit edge, in points per unit NDC distance (lasy: distance_per_point). */
	distancePerPoint: number; setDistancePerPoint: (v: number) => void;
	/** Extra points held at the end of every blank transition (lasy: blank_delay_points). */
	blankDelayPoints: number; setBlankDelayPoints: (v: number) => void;
	/**
	 * The practical ceiling on points/sec a frame's buffer may grow to before
	 * lit-edge fidelity gets scaled down (real projectors run ~20-40kpps
	 * typically, ~60-100kpps at the high end — see
	 * docs/architecture-comparison.md's kpps section). The audio-rate
	 * anti-foldover ceiling (sampleRate / scanFrequency) always applies too,
	 * whichever is smaller.
	 */
	kppsCeiling: number; setKppsCeiling: (v: number) => void;
}

const GalvoCtx = createContext<GalvoContextType | undefined>(undefined);

export function GalvoProvider({ children }: { children: ReactNode }) {
	const [enabled,  setEnabled]  = useLocalStorage('galvo.enabled',  true);
	const [linkAxes, setLinkAxes] = useLocalStorage('galvo.linkAxes', true);

	const [scannerX, setScannerX] = useLocalStorage<ScannerParams>('galvo.scannerX', DEFAULT_SCANNER);
	const [scannerY, setScannerY] = useLocalStorage<ScannerParams>('galvo.scannerY', DEFAULT_SCANNER);
	const [trackingBlankThreshold, setTrackingBlankThreshold] =
		useLocalStorage('galvo.trackingBlankThreshold', 0.05);
	const [trackingBlankSoftness, setTrackingBlankSoftness] =
		useLocalStorage('galvo.trackingBlankSoftness', 0.5);

	const [spotSize,   setSpotSize]   = useLocalStorage('galvo.spotSize',   0.012);
	const [power,      setPower]      = useLocalStorage('galvo.power',      1);
	const [gainR,      setGainR]      = useLocalStorage('galvo.gainR',      1);
	const [gainG,      setGainG]      = useLocalStorage('galvo.gainG',      1);
	const [gainB,      setGainB]      = useLocalStorage('galvo.gainB',      1);
	const [blankFloor, setBlankFloor] = useLocalStorage('galvo.blankFloor', -0.9);
	const [zGamma,     setZGamma]     = useLocalStorage('galvo.zGamma',     1);

	const [exposureTime, setExposureTime] = useLocalStorage('galvo.exposureTime', 40);
	const [glowStrength, setGlowStrength] = useLocalStorage('galvo.glowStrength', 0.1);
	const [hazeStrength, setHazeStrength] = useLocalStorage('galvo.hazeStrength', 0.1);
	const [whitePoint,   setWhitePoint]   = useLocalStorage('galvo.whitePoint',   0);

	const [cornerSafetyEnabled, setCornerSafetyEnabled] = useLocalStorage('galvo.cornerSafetyEnabled', false);
	const [radiansPerPoint,     setRadiansPerPoint]     = useLocalStorage('galvo.radiansPerPoint',     0.6);
	const [distancePerPoint,    setDistancePerPoint]    = useLocalStorage('galvo.distancePerPoint',    5);
	const [blankDelayPoints,    setBlankDelayPoints]    = useLocalStorage('galvo.blankDelayPoints',    10);
	const [kppsCeiling,         setKppsCeiling]         = useLocalStorage('galvo.kppsCeiling',         60000);

	const effectiveScannerY = linkAxes ? scannerX : scannerY;

	const value = useMemo<GalvoContextType>(
		() => ({
			enabled, setEnabled, linkAxes, setLinkAxes,
			scannerX, setScannerX, scannerY, setScannerY, effectiveScannerY,
			trackingBlankThreshold, setTrackingBlankThreshold,
			trackingBlankSoftness, setTrackingBlankSoftness,
			spotSize, setSpotSize, power, setPower,
			gainR, setGainR, gainG, setGainG, gainB, setGainB,
			blankFloor, setBlankFloor, zGamma, setZGamma,
			exposureTime, setExposureTime,
			glowStrength, setGlowStrength, hazeStrength, setHazeStrength,
			whitePoint, setWhitePoint,
			cornerSafetyEnabled, setCornerSafetyEnabled,
			radiansPerPoint, setRadiansPerPoint,
			distancePerPoint, setDistancePerPoint,
			blankDelayPoints, setBlankDelayPoints,
			kppsCeiling, setKppsCeiling,
		}),
		// Setter functions from useLocalStorage are stable (useCallback-wrapped)
		// and never change — only the state values need to be in deps, same
		// convention as WoahscopeContext.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			enabled, linkAxes, scannerX, scannerY, effectiveScannerY,
			trackingBlankThreshold, trackingBlankSoftness,
			spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
			exposureTime, glowStrength, hazeStrength, whitePoint,
			cornerSafetyEnabled, radiansPerPoint, distancePerPoint, blankDelayPoints, kppsCeiling,
		],
	);

	return <GalvoCtx.Provider value={value}>{children}</GalvoCtx.Provider>;
}

export function useGalvo(): GalvoContextType {
	const ctx = useContext(GalvoCtx);
	if (ctx === undefined) throw new Error('useGalvo must be used within GalvoProvider');
	return ctx;
}
