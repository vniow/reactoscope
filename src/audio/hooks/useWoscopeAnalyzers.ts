/**
 * Woscope Analyzer Hook
 *
 * Creates and manages 2 Tone.js analyzers for L, R stereo audio inputs.
 * Provides real-time waveform data for woscope visualization.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as Tone from 'tone';

export interface WoscopeAnalyzerData {
	l: Float32Array;
	r: Float32Array;
}

export interface UseWoscopeAnalyzersOptions {
	/** FFT size for waveform analysis (default: 1024) */
	fftSize?: number;
	/** Analysis type: always 'waveform' for woscope visualization */
	type?: 'waveform';
	/** Update rate in Hz (default: 60) */
	updateRate?: number;
}

export function useWoscopeAnalyzers(
	enabled: boolean = true,
	options: UseWoscopeAnalyzersOptions = {}
) {
	const { fftSize = 1024, type = 'waveform', updateRate = 60 } = options;

	// Analyzer instances
	const analyzersRef = useRef<{
		l: Tone.Analyser | null;
		r: Tone.Analyser | null;
	}>({
		l: null,
		r: null,
	});

	// Current analyzer data
	const [analyzerData, setAnalyzerData] = useState<WoscopeAnalyzerData>({
		l: new Float32Array(fftSize),
		r: new Float32Array(fftSize),
	});

	// Animation frame for updates
	const animationFrameRef = useRef<number | undefined>(undefined);
	const lastUpdateRef = useRef<number>(0);

	// Track initialization state
	const [isInitialized, setIsInitialized] = useState<boolean>(false);

	// Initialize analyzers
	useEffect(() => {
		if (!enabled) return;

		const channels = ['l', 'r'] as const;
		let needsInitialization = false;

		channels.forEach((channel) => {
			if (!analyzersRef.current[channel]) {
				analyzersRef.current[channel] = new Tone.Analyser({
					type,
					size: fftSize,
				});
				needsInitialization = true;
			}
		});

		// Mark as initialized only if we actually created new analyzers
		if (needsInitialization) {
			setIsInitialized(true);
		}

		// Start update loop
		const updateAnalyzerData = (timestamp: number) => {
			if (timestamp - lastUpdateRef.current >= 1000 / updateRate) {
				const newData: WoscopeAnalyzerData = {
					l:
						(analyzersRef.current.l?.getValue() as Float32Array) ||
						new Float32Array(fftSize),
					r:
						(analyzersRef.current.r?.getValue() as Float32Array) ||
						new Float32Array(fftSize),
				};

				setAnalyzerData(newData);
				lastUpdateRef.current = timestamp;
			}

			if (enabled) {
				animationFrameRef.current = requestAnimationFrame(updateAnalyzerData);
			}
		};

		animationFrameRef.current = requestAnimationFrame(updateAnalyzerData);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [enabled, fftSize, type, updateRate]);

	// Get analyzer input nodes for audio connections (memoized for stable references)
	const analyzers = useMemo(() => {
		if (!isInitialized) {
			return {
				l: null,
				r: null,
			};
		}
		return {
			l: analyzersRef.current.l,
			r: analyzersRef.current.r,
		};
	}, [isInitialized]);

	// Cleanup on unmount
	useEffect(() => {
		const currentAnalyzers = analyzersRef.current;
		return () => {
			Object.values(currentAnalyzers).forEach((analyzer) => {
				if (analyzer) {
					analyzer.dispose();
				}
			});
		};
	}, []);

	return {
		analyzerData,
		analyzers,
		isReady:
			enabled &&
			isInitialized &&
			Object.values(analyzersRef.current).every(
				(analyzer) => analyzer !== null
			),
	};
}
