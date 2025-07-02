/**
 * Audio Context Slice
 *
 * Manages the global audio context state and transport controls.
 * This slice handles the overall audio engine state and playback controls.
 */

import type { StateCreator } from 'zustand';
import * as Tone from 'tone';
import type { AppStore } from '../../shared/stores/types';

export interface AudioContextState {
	isStarted: boolean;
	isPlaying: boolean;
	bpm: number;
	timeSignature: [number, number]; // [numerator, denominator]
	swing: number; // 0-1
	lookAhead: number; // milliseconds
}

export interface AudioContextActions {
	initializeAudio: () => Promise<void>;
	startTransport: () => void;
	stopTransport: () => void;
	pauseTransport: () => void;
	togglePlayback: () => void;
	setBpm: (bpm: number) => void;
	setTimeSignature: (numerator: number, denominator: number) => void;
	setSwing: (swing: number) => void;
	setLookAhead: (lookAhead: number) => void;
	getTransportTime: () => string;
	setTransportPosition: (position: string) => void;
}

export interface AudioContextSlice
	extends AudioContextState,
		AudioContextActions {}

export const createAudioContextSlice: StateCreator<
	AppStore,
	[],
	[],
	AudioContextSlice
> = (set, get) => ({
	// Initial state
	isStarted: false,
	isPlaying: false,
	bpm: 120,
	timeSignature: [4, 4],
	swing: 0,
	lookAhead: 25,

	// Actions
	initializeAudio: async () => {
		try {
			// Start the audio context
			await Tone.start();

			// Configure transport
			const state = get();
			Tone.Transport.bpm.value = state.bpm;
			Tone.Transport.timeSignature = state.timeSignature;
			Tone.Transport.swing = state.swing;
			// Note: lookAhead is handled by Tone.js internally

			// Also initialize the audio registry system
			await get().initializeAudioSystem();

			set({ isStarted: true });
		} catch (error) {
			console.error('❌ Failed to initialize audio context:', error);
			throw error;
		}
	},

	startTransport: () => {
		try {
			Tone.Transport.start();
			set({ isPlaying: true });
		} catch (error) {
			console.error('❌ Failed to start transport:', error);
		}
	},

	stopTransport: () => {
		try {
			Tone.Transport.stop();
			set({ isPlaying: false });
		} catch (error) {
			console.error('❌ Failed to stop transport:', error);
		}
	},

	pauseTransport: () => {
		try {
			Tone.Transport.pause();
			set({ isPlaying: false });
		} catch (error) {
			console.error('❌ Failed to pause transport:', error);
		}
	},

	togglePlayback: () => {
		const state = get();
		if (state.isPlaying) {
			state.stopTransport();
		} else {
			if (!state.isStarted) {
				state
					.initializeAudio()
					.then(() => {
						state.startTransport();
					})
					.catch((error) => {
						console.error('❌ Failed to initialize and start audio:', error);
					});
			} else {
				state.startTransport();
			}
		}
	},

	setBpm: (bpm) => {
		try {
			Tone.Transport.bpm.value = bpm;
			set({ bpm });
		} catch (error) {
			console.error('❌ Failed to set BPM:', error);
		}
	},

	setTimeSignature: (numerator, denominator) => {
		try {
			const timeSignature: [number, number] = [numerator, denominator];
			Tone.Transport.timeSignature = timeSignature;
			set({ timeSignature });
		} catch (error) {
			console.error('❌ Failed to set time signature:', error);
		}
	},

	setSwing: (swing) => {
		try {
			Tone.Transport.swing = swing;
			set({ swing });
		} catch (error) {
			console.error('❌ Failed to set swing:', error);
		}
	},

	setLookAhead: (lookAhead) => {
		try {
			// Note: Tone.js handles look-ahead internally
			// This is kept for UI state management
			set({ lookAhead });
		} catch (error) {
			console.error('❌ Failed to set look-ahead:', error);
		}
	},

	getTransportTime: () => {
		try {
			return Tone.Transport.position.toString();
		} catch (error) {
			console.error('❌ Failed to get transport time:', error);
			return '0:0:0';
		}
	},

	setTransportPosition: (position) => {
		try {
			Tone.Transport.position = position;
		} catch (error) {
			console.error('❌ Failed to set transport position:', error);
		}
	},
});
