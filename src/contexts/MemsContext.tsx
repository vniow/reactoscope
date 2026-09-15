import { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { FilterFamily } from '../dsp/filterDesign';
import type { QuasistaticParams } from '../mems/quasistaticModel';

// ─── MEMS Laser settings ────────────────────────────────────────────────────
// Mirrors GalvoContext, under a mems.* prefix, per ADR-0012 sub-decision 7.
// Sharing one laser context between the two devices was rejected for this
// task: it would mean renaming live galvo.* keys and silently discarding saved
// settings, the same trap ADR-0010 declined to walk into with woscope.*.
//
// MemsSceneR3F reads device-neutral settings (swapXY, invertXY, intensity,
// nSamples, lanczos*) from useAxis()/useEffects() directly, same as the galvo
// and sweep views — they are NOT duplicated here.
//
// The optics/integration fields are duplicated from GalvoContext deliberately:
// the two devices are compared by switching between them, so they need
// independently tunable exposure and beam settings.
//
// Every field is directly user-adjustable (ADR-0012, sub-decision 8) — no
// preset layer. Defaults are plausible orders of magnitude, not calibrated
// values; see docs/mems-laser-emulator.md's Parameters section.
//
// Live telemetry (resonance margin, clamped fraction, tracking error, ...)
// deliberately does NOT live here: it changes every frame, and pushing that
// through Context would re-render every consumer at frame rate.

// Sourced from PlayzerX's published specifications rather than guessed — see
// docs/mems-device-limits.html for each figure and where it came from.
const DEFAULT_QUASISTATIC: QuasistaticParams = {
	deviceSampleRate: 22000,   // "SetSampleRate ... default is 22000 samples/s"
	filterType:       'bessel',
	filterOrder:      5,
	cutoff:           2200,    // "Bandwidth: dc to ~2200Hz on both axes"
	zeroPhase:        true,    // FilterData's own default
	angleLimit:       1,
	// The vendor's rule is that the filter cutoff sits at f_res / 2.5, so a
	// 2200Hz bandwidth implies a mirror resonating near 5500Hz. Q = 25 is the
	// measured value for a 1mm Mirrorcle mirror (A7M10.2) in the Advanced MEMS
	// Control guide.
	resonanceEnabled: true,
	resonanceFreq:    5500,
	resonanceQ:       25,
};

export interface MemsContextType {
	enabled:  boolean; setEnabled:  (v: boolean) => void;
	linkAxes: boolean; setLinkAxes: (v: boolean) => void;

	quasistaticX: QuasistaticParams; setQuasistaticX: (p: QuasistaticParams) => void;
	quasistaticY: QuasistaticParams; setQuasistaticY: (p: QuasistaticParams) => void;
	/**
	 * The params MemsSceneR3F should actually drive the Y axis with:
	 * `quasistaticY` when unlinked, `quasistaticX` mirrored when linked.
	 * `quasistaticY`'s own stored value is untouched while linked — unlinking
	 * resumes from wherever it was left, not from a reset default.
	 */
	effectiveQuasistaticY: QuasistaticParams;
	/**
	 * Sets the Bessel order on both axes at once. Real drivers carry one filter
	 * per board, so an order that differs between X and Y has no hardware
	 * meaning — the control surfaces it once and writes it through.
	 */
	/**
	 * Settings that belong to the Controller rather than to one axis, so each
	 * writes through to both. `SetupSoftwareFilter` configures one filter across
	 * both channels and the device has a single output rate; whether the mirror
	 * resonates at all is likewise a property of the device. Cutoff, angle limit
	 * and the resonance frequency/Q stay per-axis — `RQWaveform` takes a separate
	 * `yBandwidth`, and two mirrors need not be identical.
	 */
	setDeviceSampleRate: (v: number) => void;
	setFilterType:       (v: FilterFamily) => void;
	setFilterOrder:      (v: number) => void;
	setZeroPhase:        (v: boolean) => void;
	setResonanceEnabled: (v: boolean) => void;

	/** See GalvoContext — identical meaning; the lag here is band-limiting rather than slew. */
	trackingBlankThreshold: number; setTrackingBlankThreshold: (v: number) => void;
	trackingBlankSoftness:  number; setTrackingBlankSoftness:  (v: number) => void;

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
}

const MemsCtx = createContext<MemsContextType | undefined>(undefined);

export function MemsProvider({ children }: { children: ReactNode }) {
	const [enabled,  setEnabled]  = useLocalStorage('mems.enabled',  true);
	const [linkAxes, setLinkAxes] = useLocalStorage('mems.linkAxes', true);

	const [quasistaticX, setQuasistaticX] =
		useLocalStorage<QuasistaticParams>('mems.quasistaticX', DEFAULT_QUASISTATIC);
	const [quasistaticY, setQuasistaticY] =
		useLocalStorage<QuasistaticParams>('mems.quasistaticY', DEFAULT_QUASISTATIC);

	const [trackingBlankThreshold, setTrackingBlankThreshold] =
		useLocalStorage('mems.trackingBlankThreshold', 0.05);
	const [trackingBlankSoftness, setTrackingBlankSoftness] =
		useLocalStorage('mems.trackingBlankSoftness', 0.5);

	const [spotSize,   setSpotSize]   = useLocalStorage('mems.spotSize',   0.012);
	const [power,      setPower]      = useLocalStorage('mems.power',      1);
	const [gainR,      setGainR]      = useLocalStorage('mems.gainR',      1);
	const [gainG,      setGainG]      = useLocalStorage('mems.gainG',      1);
	const [gainB,      setGainB]      = useLocalStorage('mems.gainB',      1);
	const [blankFloor, setBlankFloor] = useLocalStorage('mems.blankFloor', -0.9);
	const [zGamma,     setZGamma]     = useLocalStorage('mems.zGamma',     1);

	const [exposureTime, setExposureTime] = useLocalStorage('mems.exposureTime', 40);
	const [glowStrength, setGlowStrength] = useLocalStorage('mems.glowStrength', 0.1);
	const [hazeStrength, setHazeStrength] = useLocalStorage('mems.hazeStrength', 0.1);
	const [whitePoint,   setWhitePoint]   = useLocalStorage('mems.whitePoint',   0);

	const effectiveQuasistaticY = linkAxes ? quasistaticX : quasistaticY;

	const setBoth = useCallback(<K extends keyof QuasistaticParams>(
		key: K,
		value: QuasistaticParams[K],
	) => {
		setQuasistaticX({ ...quasistaticX, [key]: value });
		setQuasistaticY({ ...quasistaticY, [key]: value });
	}, [quasistaticX, quasistaticY, setQuasistaticX, setQuasistaticY]);

	const setDeviceSampleRate = useCallback((v: number) => setBoth('deviceSampleRate', v), [setBoth]);
	const setFilterType       = useCallback((v: FilterFamily) => setBoth('filterType', v), [setBoth]);
	const setFilterOrder      = useCallback((v: number) => setBoth('filterOrder', v), [setBoth]);
	const setZeroPhase        = useCallback((v: boolean) => setBoth('zeroPhase', v), [setBoth]);
	const setResonanceEnabled = useCallback((v: boolean) => setBoth('resonanceEnabled', v), [setBoth]);

	const value = useMemo<MemsContextType>(
		() => ({
			enabled, setEnabled, linkAxes, setLinkAxes,
			quasistaticX, setQuasistaticX, quasistaticY, setQuasistaticY,
			effectiveQuasistaticY,
			setDeviceSampleRate, setFilterType, setFilterOrder, setZeroPhase, setResonanceEnabled,
			trackingBlankThreshold, setTrackingBlankThreshold,
			trackingBlankSoftness, setTrackingBlankSoftness,
			spotSize, setSpotSize, power, setPower,
			gainR, setGainR, gainG, setGainG, gainB, setGainB,
			blankFloor, setBlankFloor, zGamma, setZGamma,
			exposureTime, setExposureTime,
			glowStrength, setGlowStrength, hazeStrength, setHazeStrength,
			whitePoint, setWhitePoint,
		}),
		// Setter functions from useLocalStorage are stable (useCallback-wrapped)
		// and never change — only the state values need to be in deps, same
		// convention as GalvoContext and WoahscopeContext.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			enabled, linkAxes, quasistaticX, quasistaticY, effectiveQuasistaticY,
			setDeviceSampleRate, setFilterType, setFilterOrder, setZeroPhase, setResonanceEnabled,
			trackingBlankThreshold, trackingBlankSoftness,
			spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
			exposureTime, glowStrength, hazeStrength, whitePoint,
		],
	);

	return <MemsCtx.Provider value={value}>{children}</MemsCtx.Provider>;
}

export function useMems(): MemsContextType {
	const ctx = useContext(MemsCtx);
	if (ctx === undefined) throw new Error('useMems must be used within MemsProvider');
	return ctx;
}
