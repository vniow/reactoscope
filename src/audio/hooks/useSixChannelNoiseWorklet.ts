/**
 * React hook for managing a SixChannelNoise worklet node
 */
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { SixChannelNoiseNode } from '../core/SixChannelNoiseNode';

export interface UseSixChannelNoiseWorkletOptions {
	debug?: boolean;
}

export interface UseSixChannelNoiseWorkletResult {
	noiseNode: SixChannelNoiseNode | null;
	isReady: boolean;
	isPlaying: boolean;
	amplitude: number;
	activeChannels: boolean[];
	start: () => Promise<void>;
	stop: () => void;
	setAmplitude: (value: number) => void;
	setActiveChannels: (channels: boolean[]) => void;
}

export function useSixChannelNoiseWorklet(
	options: UseSixChannelNoiseWorkletOptions = {}
): UseSixChannelNoiseWorkletResult {
	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [amplitude, setAmplitudeState] = useState(0.5);
	const [activeChannels, setActiveChannelsState] = useState<boolean[]>([
		true,
		true,
		true,
		true,
		true,
		true,
	]);

	const nodeRef = useRef<SixChannelNoiseNode | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		const init = async () => {
			try {
				if (Tone.getContext().state !== 'running') {
					await Tone.start();
				}
				const node = new SixChannelNoiseNode({ debug: options.debug });
				await node.ready;
				if (!mountedRef.current) {
					node.dispose();
					return;
				}
				nodeRef.current = node;
				setIsReady(true);
			} catch (err) {
				console.error('Failed to init SixChannelNoiseWorklet', err);
				setIsReady(false);
			}
		};
		init();

		return () => {
			mountedRef.current = false;
			if (nodeRef.current) {
				nodeRef.current.dispose();
				nodeRef.current = null;
			}
			setIsReady(false);
			setIsPlaying(false);
		};
	}, [options.debug]);

	const start = async () => {
		if (nodeRef.current && isReady && !isPlaying) {
			await nodeRef.current.start();
			setIsPlaying(true);
		}
	};

	const stop = () => {
		if (nodeRef.current && isReady && isPlaying) {
			nodeRef.current.stop();
			setIsPlaying(false);
		}
	};

	const setAmplitude = (value: number) => {
		const clamped = Math.max(0, Math.min(1, value));
		setAmplitudeState(clamped);
		if (nodeRef.current && isReady) {
			nodeRef.current.setAmplitude(clamped);
		}
	};

	const setActiveChannels = (channels: boolean[]) => {
		if (channels.length === 6) {
			setActiveChannelsState(channels);
			if (nodeRef.current && isReady) {
				nodeRef.current.setActiveChannels(channels);
			}
		}
	};

	return {
		noiseNode: nodeRef.current,
		isReady,
		isPlaying,
		amplitude,
		activeChannels,
		start,
		stop,
		setAmplitude,
		setActiveChannels,
	};
}
