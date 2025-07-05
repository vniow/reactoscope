/**
 * Audio Connection Hook for XYRGB Visualizer
 *
 * Manages audio connections to the XYRGB analyzer inputs.
 * Provides a bridge between the React Flow audio system and Tone.js analyzers.
 */

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

export interface AudioInput {
	x?: Tone.ToneAudioNode | null;
	y?: Tone.ToneAudioNode | null;
	r?: Tone.ToneAudioNode | null;
	g?: Tone.ToneAudioNode | null;
	b?: Tone.ToneAudioNode | null;
}

export interface UseAudioConnectionsOptions {
	/** Whether connections are enabled */
	enabled?: boolean;
	/** Default gain for each connection (0-1) */
	defaultGain?: number;
}

export function useAudioConnections(
	analyzers: {
		x: Tone.Analyser | null;
		y: Tone.Analyser | null;
		r: Tone.Analyser | null;
		g: Tone.Analyser | null;
		b: Tone.Analyser | null;
	},
	audioInputs: AudioInput,
	options: UseAudioConnectionsOptions = {}
) {
	const { enabled = true, defaultGain = 1.0 } = options;

	// Keep track of current connections to clean them up
	const connectionsRef = useRef<{
		x?: Tone.Gain;
		y?: Tone.Gain;
		r?: Tone.Gain;
		g?: Tone.Gain;
		b?: Tone.Gain;
	}>({});

	// Connect audio inputs to analyzers
	useEffect(() => {
		if (!enabled) return;

		const channels = ['x', 'y', 'r', 'g', 'b'] as const;

		channels.forEach((channel) => {
			const analyzer = analyzers[channel];
			const input = audioInputs[channel];

			// Clean up existing connection
			if (connectionsRef.current[channel]) {
				connectionsRef.current[channel]?.disconnect();
				connectionsRef.current[channel]?.dispose();
				delete connectionsRef.current[channel];
			}

			// Create new connection if both analyzer and input exist
			if (analyzer && input) {
				try {
					// Create a gain node for level control
					const gainNode = new Tone.Gain(defaultGain);
					connectionsRef.current[channel] = gainNode;

					// Connect: input -> gain -> analyzer
					input.connect(gainNode);
					gainNode.connect(analyzer);

					console.log(`Connected ${channel} audio input to analyzer`);
				} catch (error) {
					console.warn(`Failed to connect ${channel} audio input:`, error);
				}
			}
		});

		// Cleanup function
		return () => {
			Object.values(connectionsRef.current).forEach((gainNode) => {
				if (gainNode) {
					gainNode.disconnect();
					gainNode.dispose();
				}
			});
			connectionsRef.current = {};
		};
	}, [analyzers, audioInputs, enabled, defaultGain]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			const currentConnections = connectionsRef.current;
			Object.values(currentConnections).forEach((gainNode) => {
				if (gainNode) {
					gainNode.disconnect();
					gainNode.dispose();
				}
			});
		};
	}, []);

	// Get connection status
	const getConnectionStatus = () => {
		const channels = ['x', 'y', 'r', 'g', 'b'] as const;
		const status: Record<string, boolean> = {};

		channels.forEach((channel) => {
			status[channel] = !!(
				connectionsRef.current[channel] && audioInputs[channel]
			);
		});

		return status;
	};

	// Set gain for a specific channel
	const setChannelGain = (channel: keyof AudioInput, gain: number) => {
		const gainNode = connectionsRef.current[channel];
		if (gainNode) {
			gainNode.gain.value = Math.max(0, Math.min(1, gain));
		}
	};

	return {
		connectionStatus: getConnectionStatus(),
		connectedCount: Object.values(getConnectionStatus()).filter(Boolean).length,
		setChannelGain,
	};
}
