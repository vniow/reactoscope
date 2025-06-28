/**
 * Custom hook for controlling audio node parameters
 *
 * This hook provides a convenient interface for React components to control
 * audio node parameters while maintaining sync with the audio registry.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppStore } from '../../shared/stores/appStore';

/**
 * Hook to control parameters of audio nodes with React state
 *
 * @param nodeId - The ID of the node
 * @param paramName - The name of the parameter to control
 * @param initialValue - Initial value for the parameter
 * @param options - Additional options like min/max values and scaling
 */
export function useAudioNodeParam<T>(
	nodeId: string,
	paramName: string,
	initialValue: T,
	options: {
		min?: number;
		max?: number;
		transform?: (value: T) => unknown;
		audioNodeIndex?: number; // For nodes that return arrays
		rampTime?: number; // Time in seconds to ramp to new value
	} = {}
): [T, (value: T) => void] {
	const [value, setValue] = useState<T>(initialValue);
	const getAudioNode = useAppStore((state) => state.getAudioNode);
	const updateAudioNodeParams = useAppStore(
		(state) => state.updateAudioNodeParams
	);

	// Update the audio parameter when value changes
	useEffect(() => {
		const node = getAudioNode(nodeId);
		if (!node) return;

		try {
			const actualNode = Array.isArray(node)
				? options.audioNodeIndex !== undefined
					? node[options.audioNodeIndex]
					: node[0]
				: node;

			// Transform the value if needed
			const transformedValue = options.transform
				? options.transform(value)
				: value;

			// Handle different parameter types
			if (paramName in actualNode) {
				const param = (actualNode as unknown as Record<string, unknown>)[
					paramName
				];

				// Check if it's a Tone.Param object (has setValueAtTime method)
				if (
					param &&
					typeof (param as { setValueAtTime?: unknown }).setValueAtTime ===
						'function'
				) {
					const rampTime = options.rampTime || 0;
					const toneParam = param as {
						rampTo: (value: unknown, time: number) => void;
						setValueAtTime: (value: unknown, time: number) => void;
					};
					if (rampTime > 0) {
						toneParam.rampTo(transformedValue, rampTime);
					} else {
						toneParam.setValueAtTime(transformedValue, Tone.now());
					}
				}
				// Check if it's a simple property
				else if (
					(actualNode as unknown as Record<string, unknown>)[paramName] !==
					undefined
				) {
					(actualNode as unknown as Record<string, unknown>)[paramName] =
						transformedValue;
				}
			}

			// Update the registry with the new parameter value
			updateAudioNodeParams(nodeId, { [paramName]: value });
		} catch (error) {
			console.error(`Error setting audio parameter ${paramName}:`, error);
		}
	}, [nodeId, paramName, value, getAudioNode, updateAudioNodeParams, options]);

	// Provide a setter that clamps values if min/max are specified
	const setValueClamped = useCallback(
		(newValue: T) => {
			if (
				typeof newValue === 'number' &&
				(options.min !== undefined || options.max !== undefined)
			) {
				const clampedValue = Math.max(
					options.min ?? -Infinity,
					Math.min(options.max ?? Infinity, newValue)
				) as T;
				setValue(clampedValue);
			} else {
				setValue(newValue);
			}
		},
		[options.min, options.max]
	);

	return [value, setValueClamped];
}

/**
 * Hook to get the current state of an audio node
 *
 * @param nodeId - The ID of the node
 */
export function useAudioNodeState(nodeId: string) {
	const getRegistryEntry = useAppStore((state) => state.getRegistryEntry);
	const [nodeState, setNodeState] = useState(getRegistryEntry(nodeId));

	useEffect(() => {
		// Update state when the node changes
		const entry = getRegistryEntry(nodeId);
		setNodeState(entry);
	}, [nodeId, getRegistryEntry]);

	return nodeState;
}
