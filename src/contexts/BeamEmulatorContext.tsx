import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ─── Beam Emulator selection ───────────────────────────────────────────────
// Which device the scope panel is currently rendering: CRT, Galvo Laser or
// MEMS Laser (see CONTEXT.md, ADR-0010, ADR-0012). This is its own small context rather than a
// field on WoahscopeContext, for two reasons: it isn't CRT-specific the way
// everything in that context currently is (renaming/reshaping that context
// is a deferred follow-up, not part of this work — ADR-0010's non-goals),
// and it has to be reactive state shared between two sibling subtrees that
// don't otherwise share a parent closer than the app root — the canvas
// (WoahscopePanel, left column) and its settings popover (VizSettingsOverlay,
// nested inside DawCanvas, right column). useLocalStorage alone can't do
// this: it only persists to storage on write, it doesn't broadcast between
// separately-mounted call sites — which is exactly why WoahscopeContext
// exists as a Context in the first place, and why this does too.

export type BeamEmulatorDevice = 'crt' | 'galvo' | 'mems';

interface BeamEmulatorContextType {
	device: BeamEmulatorDevice;
	setDevice: (device: BeamEmulatorDevice) => void;
}

const BeamEmulatorCtx = createContext<BeamEmulatorContextType | undefined>(undefined);

export function BeamEmulatorProvider({ children }: { children: ReactNode }) {
	const [device, setDevice] = useLocalStorage<BeamEmulatorDevice>('beamEmulator.device', 'crt');

	const value = useMemo<BeamEmulatorContextType>(
		() => ({ device, setDevice }),
		// setDevice is useCallback-wrapped in useLocalStorage and never changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[device],
	);

	return <BeamEmulatorCtx.Provider value={value}>{children}</BeamEmulatorCtx.Provider>;
}

export function useBeamEmulator(): BeamEmulatorContextType {
	const ctx = useContext(BeamEmulatorCtx);
	if (ctx === undefined) throw new Error('useBeamEmulator must be used within BeamEmulatorProvider');
	return ctx;
}
