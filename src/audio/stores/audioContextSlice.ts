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

			// Configure transport using correct Tone.js API
			const state = get();
			const transport = Tone.getTransport();
			transport.bpm.value = state.bpm;
			transport.timeSignature = state.timeSignature;
			transport.swing = state.swing;
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
			const transport = Tone.getTransport();
			transport.start();
			set({ isPlaying: true });
		} catch (error) {
			console.error('❌ Failed to start transport:', error);
		}
	},

	stopTransport: () => {
		try {
			const transport = Tone.getTransport();
			transport.stop();
			set({ isPlaying: false });
		} catch (error) {
			console.error('❌ Failed to stop transport:', error);
		}
	},

	pauseTransport: () => {
		try {
			const transport = Tone.getTransport();
			transport.pause();
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
			const transport = Tone.getTransport();
			transport.bpm.value = bpm;
			set({ bpm });
		} catch (error) {
			console.error('❌ Failed to set BPM:', error);
		}
	},

	setTimeSignature: (numerator, denominator) => {
		try {
			const timeSignature: [number, number] = [numerator, denominator];
			const transport = Tone.getTransport();
			transport.timeSignature = timeSignature;
			set({ timeSignature });
		} catch (error) {
			console.error('❌ Failed to set time signature:', error);
		}
	},

	setSwing: (swing) => {
		try {
			const transport = Tone.getTransport();
			transport.swing = swing;
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
			const transport = Tone.getTransport();
			return transport.position.toString();
		} catch (error) {
			console.error('❌ Failed to get transport time:', error);
			return '0:0:0';
		}
	},

	setTransportPosition: (position) => {
		try {
			const transport = Tone.getTransport();
			transport.position = position;
		} catch (error) {
			console.error('❌ Failed to set transport position:', error);
		}
	},
});
