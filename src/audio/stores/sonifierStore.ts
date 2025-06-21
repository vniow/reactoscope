import { create } from 'zustand';

// As per ARCHITECTURE_BRAINSTORM.md, this will handle the state of the sonification engine.

export interface SonifierState {
	sharedBuffer: SharedArrayBuffer | null;
	isReady: boolean;
	isPlaying: boolean;
	init: (sab: SharedArrayBuffer) => void;
	setPlaying: (playing: boolean) => void;
	cleanup: () => void;
}

export const useSonifierStore = create<SonifierState>((set, get) => ({
	sharedBuffer: null,
	isReady: false,
	isPlaying: false,

	init: (sharedBuffer) => {
		set({ sharedBuffer, isReady: true, isPlaying: false });
	},

	setPlaying: (playing) => {
		const { isReady } = get();
		if (!isReady) {
			console.warn('Sonifier not ready, cannot change play state.');
			return;
		}
		set({ isPlaying: playing });
	},

	cleanup: () => {
		set({ sharedBuffer: null, isReady: false, isPlaying: false });
	},
}));
