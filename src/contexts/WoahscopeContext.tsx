import {
	createContext,
	useState,
	useCallback,
	useEffect,
	type ReactNode,
	useContext,
	useMemo,
} from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { GALVO_PRESETS, DEFAULT_PRESET_ID, type GalvoPresetId } from '../laser/presets';
import { setGalvoParams } from '../audio/engine';


export interface PlaybackContextType {
	isPlaying: boolean;
	setIsPlaying: (value: boolean) => void;
}


export interface AxisContextType {
	swapXY: boolean;
	setSwapXY: (value: boolean) => void;
	invertXY: boolean;
	setInvertXY: (value: boolean) => void;
	intensity: number;
	setIntensity: (value: number) => void;
	hue: number;
	setHue: (value: number) => void;
}


export type VizMode = 'oscilloscope' | 'laser';

export interface EffectsContextType {
	vizMode: VizMode;
	setVizMode: (mode: VizMode) => void;
	crtEnabled: boolean;
	setCrtEnabled: (value: boolean) => void;
	persistence: number;
	setPersistence: (value: number) => void;
	glowStrength: number;
	setGlowStrength: (value: number) => void;
	scatterStrength: number;
	setScatterStrength: (value: number) => void;
	lanczosEnabled: boolean;
	setLanczosEnabled: (value: boolean) => void;
	lanczosSteps: number;
	setLanczosSteps: (value: number) => void;
	nSamples: number;
	setNSamples: (value: number) => void;
	coordBufferSize: number;
	setCoordBufferSize: (value: number) => void;
	// ── Laser-mode galvo / modulator emulator params ─────────────────────────
	galvoPresetId: GalvoPresetId;
	setGalvoPresetId: (id: GalvoPresetId) => void;
	galvoBandwidthHz: number;
	setGalvoBandwidthHz: (hz: number) => void;
	galvoDampingRatio: number;
	setGalvoDampingRatio: (zeta: number) => void;
	galvoModulatorTauUs: number;
	setGalvoModulatorTauUs: (us: number) => void;
	galvoPps: number;
	setGalvoPps: (pps: number) => void;
	galvoAnchorAggressiveness: number;
	setGalvoAnchorAggressiveness: (a: number) => void;
}

export type VizContextType = PlaybackContextType & AxisContextType & EffectsContextType;


const PlaybackCtx = createContext<PlaybackContextType | undefined>(undefined);
const AxisCtx     = createContext<AxisContextType     | undefined>(undefined);
const EffectsCtx  = createContext<EffectsContextType  | undefined>(undefined);


interface VizProviderProps { children: ReactNode }

export function WoscopeProvider({ children }: VizProviderProps) {
	const [isPlaying, setIsPlaying] = useState(false);

	const [swapXY,    setSwapXY]    = useLocalStorage('woscope.swapXY',    false);
	const [invertXY,  setInvertXY]  = useLocalStorage('woscope.invertXY',  false);
	const [intensity, setIntensity] = useLocalStorage('woscope.intensity', 1);
	const [hue,       setHue]       = useLocalStorage('woscope.hue',       125);

	const [vizMode,         setVizModeRaw]      = useLocalStorage<VizMode>('woscope.vizMode',         'oscilloscope');
	const [crtEnabled,      setCrtEnabled]      = useLocalStorage('woscope.crtEnabled',      true);
	const [persistence,     setPersistence]     = useLocalStorage('woscope.persistence',     0.1);
	const [glowStrength,    setGlowStrength]    = useLocalStorage('woscope.glowStrength',    0.1);
	const [scatterStrength, setScatterStrength] = useLocalStorage('woscope.scatterStrength', 0.1);
	const [lanczosEnabled,  setLanczosEnabled]  = useLocalStorage('woscope.lanczosEnabled',  true);
	const [lanczosSteps,    setLanczosSteps]    = useLocalStorage('woscope.lanczosSteps',    6);
	const [nSamples,        setNSamples]        = useLocalStorage('woscope.nSamples',        2048);
	const [coordBufferSize, setCoordBufferSize] = useLocalStorage('woscope.coordBufferSize', 1024);

	const _defaultPreset = GALVO_PRESETS[DEFAULT_PRESET_ID as Exclude<GalvoPresetId, 'custom'>];
	const [galvoPresetId,             setGalvoPresetIdRaw]          = useLocalStorage<GalvoPresetId>('woscope.galvoPresetId',          DEFAULT_PRESET_ID);
	const [galvoBandwidthHz,          setGalvoBandwidthHz]          = useLocalStorage('woscope.galvoBandwidthHz',          _defaultPreset.params.bandwidthHz);
	const [galvoDampingRatio,         setGalvoDampingRatio]         = useLocalStorage('woscope.galvoDampingRatio',         _defaultPreset.params.dampingRatio);
	const [galvoModulatorTauUs,       setGalvoModulatorTauUs]       = useLocalStorage('woscope.galvoModulatorTauUs',       _defaultPreset.params.modulatorTauUs);
	const [galvoPps,                  setGalvoPps]                  = useLocalStorage('woscope.galvoPps',                  _defaultPreset.pps);
	const [galvoAnchorAggressiveness, setGalvoAnchorAggressiveness] = useLocalStorage('woscope.galvoAnchorAggressiveness', _defaultPreset.anchorAggressiveness);

	const setGalvoPresetId = useCallback((id: GalvoPresetId) => {
		setGalvoPresetIdRaw(id);
		if (id === 'custom') return;
		const preset = GALVO_PRESETS[id];
		setGalvoBandwidthHz         (preset.params.bandwidthHz);
		setGalvoDampingRatio        (preset.params.dampingRatio);
		setGalvoModulatorTauUs      (preset.params.modulatorTauUs);
		setGalvoPps                 (preset.pps);
		setGalvoAnchorAggressiveness(preset.anchorAggressiveness);
	}, [setGalvoPresetIdRaw, setGalvoBandwidthHz, setGalvoDampingRatio, setGalvoModulatorTauUs, setGalvoPps, setGalvoAnchorAggressiveness]);


	// Push current params to the worklet whenever they change. setGalvoParams
	// is a no-op until the worklet has finished initialising; the effect runs
	// again on every param change so the final value lands either way.
	useEffect(() => {
		setGalvoParams({
			bandwidthHz:    galvoBandwidthHz,
			dampingRatio:   galvoDampingRatio,
			modulatorTauUs: galvoModulatorTauUs,
		});
	}, [galvoBandwidthHz, galvoDampingRatio, galvoModulatorTauUs]);

	const OSCILLOSCOPE_PRESET = { crtEnabled: true,  persistence: 0.1, glowStrength: 0.1, scatterStrength: 0.1 };
	const LASER_PRESET        = { crtEnabled: false, persistence: 0.0, glowStrength: 0.4, scatterStrength: 0.0 };

	const setVizMode = useCallback((mode: VizMode) => {
		const preset = mode === 'laser' ? LASER_PRESET : OSCILLOSCOPE_PRESET;
		setVizModeRaw(mode);
		setCrtEnabled(preset.crtEnabled);
		setPersistence(preset.persistence);
		setGlowStrength(preset.glowStrength);
		setScatterStrength(preset.scatterStrength);
	}, [setVizModeRaw, setCrtEnabled, setPersistence, setGlowStrength, setScatterStrength]); // eslint-disable-line react-hooks/exhaustive-deps

	const playbackValue = useMemo<PlaybackContextType>(
		() => ({ isPlaying, setIsPlaying }),
		[isPlaying],
	);

	const axisValue = useMemo<AxisContextType>(
		() => ({
			swapXY, setSwapXY, invertXY, setInvertXY,
			intensity, setIntensity, hue, setHue,
		}),
		// Setter functions from useLocalStorage are stable (useCallback-wrapped)
		// and never change — only the state values need to be in deps.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[swapXY, invertXY, intensity, hue],
	);

	const effectsValue = useMemo<EffectsContextType>(
		() => ({
			vizMode, setVizMode,
			crtEnabled, setCrtEnabled,
			persistence, setPersistence,
			glowStrength, setGlowStrength,
			scatterStrength, setScatterStrength,
			lanczosEnabled, setLanczosEnabled,
			lanczosSteps, setLanczosSteps,
			nSamples, setNSamples,
			coordBufferSize, setCoordBufferSize,
			galvoPresetId, setGalvoPresetId,
			galvoBandwidthHz, setGalvoBandwidthHz,
			galvoDampingRatio, setGalvoDampingRatio,
			galvoModulatorTauUs, setGalvoModulatorTauUs,
			galvoPps, setGalvoPps,
			galvoAnchorAggressiveness, setGalvoAnchorAggressiveness,
		}),
		// Setter functions are stable — only state values in deps.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[vizMode, crtEnabled, persistence, glowStrength, scatterStrength, lanczosEnabled, lanczosSteps, nSamples, coordBufferSize,
		 galvoPresetId, galvoBandwidthHz, galvoDampingRatio, galvoModulatorTauUs, galvoPps, galvoAnchorAggressiveness],
	);

	return (
		<PlaybackCtx.Provider value={playbackValue}>
			<AxisCtx.Provider value={axisValue}>
				<EffectsCtx.Provider value={effectsValue}>
					{children}
				</EffectsCtx.Provider>
			</AxisCtx.Provider>
		</PlaybackCtx.Provider>
	);
}


export function usePlayback(): PlaybackContextType {
	const ctx = useContext(PlaybackCtx);
	if (ctx === undefined) throw new Error('usePlayback must be used within WoscopeProvider');
	return ctx;
}

export function useAxis(): AxisContextType {
	const ctx = useContext(AxisCtx);
	if (ctx === undefined) throw new Error('useAxis must be used within WoscopeProvider');
	return ctx;
}

export function useEffects(): EffectsContextType {
	const ctx = useContext(EffectsCtx);
	if (ctx === undefined) throw new Error('useEffects must be used within WoscopeProvider');
	return ctx;
}

/**
 * Composite convenience hook — subscribes to all three contexts.
 * Use in components that need the full settings surface (e.g. WoscopeSceneR3F).
 * UI controls should prefer the focused hooks to avoid unnecessary re-renders.
 */
export function useWoscope(): VizContextType {
	return { ...usePlayback(), ...useAxis(), ...useEffects() };
}

export { PlaybackCtx as WoscopeContext };
