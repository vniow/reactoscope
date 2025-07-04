/**
 * Generic React hook for managing worklet-based audio nodes
 *
 * Provides a reusable pattern for creating, initializing, and managing
 * worklet nodes with proper lifecycle handling and error boundaries.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generic worklet node hook options
 */
export interface UseWorkletNodeOptions {
	/** Initial parameters for the worklet node */
	initialParams?: Record<string, unknown>;
	/** Enable debug mode */
	debug?: boolean;
	/** Custom error handler */
	onError?: (error: Error) => void;
	/** Callback when node is ready */
	onReady?: (node: unknown) => void;
	/** Auto-dispose on unmount (default: true) */
	autoDispose?: boolean;
}

/**
 * Return type for useWorkletNode hook
 */
export interface UseWorkletNodeResult<T = unknown> {
	/** The worklet node instance (null until ready) */
	node: T | null;
	/** Whether the worklet is ready for use */
	isReady: boolean;
	/** Whether the worklet is currently initializing */
	isLoading: boolean;
	/** Error that occurred during initialization */
	error: Error | null;
	/** Manually retry initialization */
	retry: () => void;
	/** Manually dispose the node */
	dispose: () => void;
}

/**
 * Generic hook for creating and managing worklet-based audio nodes
 */
export function useWorkletNode<T = unknown>(
	NodeClass: new (options?: unknown) => T,
	options: UseWorkletNodeOptions = {}
): UseWorkletNodeResult<T> {
	const {
		initialParams,
		debug = false,
		onError,
		onReady,
		autoDispose = true,
	} = options;

	// State management
	const [node, setNode] = useState<T | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Refs for stable references
	const nodeRef = useRef<T | null>(null);
	const isDisposedRef = useRef(false);

	/**
	 * Create and initialize the worklet node
	 */
	const createNode = useCallback(async () => {
		if (isDisposedRef.current) return;

		setIsLoading(true);
		setError(null);
		setIsReady(false);

		try {
			console.log(`🎛️ Creating worklet node: ${NodeClass.name}`);

			// Create the node instance
			const newNode = new NodeClass({
				debug,
				...initialParams,
			});

			// Store reference immediately
			nodeRef.current = newNode;

			// Wait for worklet to be ready if it has a ready promise
			if (
				newNode &&
				typeof (newNode as unknown as { ready?: Promise<void> }).ready ===
					'object'
			) {
				await (newNode as unknown as { ready: Promise<void> }).ready;
			}

			// Check if we were disposed during initialization
			if (isDisposedRef.current) {
				if (
					newNode &&
					typeof (newNode as unknown as { dispose?: () => void }).dispose ===
						'function'
				) {
					(newNode as unknown as { dispose: () => void }).dispose();
				}
				return;
			}

			// Update state
			setNode(newNode);
			setIsReady(true);
			setIsLoading(false);

			// Call ready callback
			if (onReady) {
				onReady(newNode);
			}

			console.log(`✅ Worklet node ready: ${NodeClass.name}`);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));

			console.error(
				`❌ Failed to create worklet node ${NodeClass.name}:`,
				error
			);

			setError(error);
			setIsLoading(false);
			setIsReady(false);

			// Call error handler
			if (onError) {
				onError(error);
			}

			// Clean up failed node
			if (nodeRef.current) {
				try {
					if (
						typeof (nodeRef.current as unknown as { dispose?: () => void })
							.dispose === 'function'
					) {
						(nodeRef.current as unknown as { dispose: () => void }).dispose();
					}
				} catch (disposeError) {
					console.warn('Error disposing failed node:', disposeError);
				}
				nodeRef.current = null;
			}
		}
	}, [NodeClass, initialParams, debug, onError, onReady]);

	/**
	 * Dispose the current node
	 */
	const dispose = useCallback(() => {
		if (nodeRef.current) {
			try {
				console.log(`🧹 Disposing worklet node: ${NodeClass.name}`);
				if (
					typeof (nodeRef.current as unknown as { dispose?: () => void })
						.dispose === 'function'
				) {
					(nodeRef.current as unknown as { dispose: () => void }).dispose();
				}
			} catch (error) {
				console.warn('Error disposing worklet node:', error);
			}
		}

		nodeRef.current = null;
		setNode(null);
		setIsReady(false);
		setIsLoading(false);
		setError(null);
	}, [NodeClass.name]);

	/**
	 * Retry initialization
	 */
	const retry = useCallback(() => {
		dispose();
		createNode();
	}, [dispose, createNode]);

	// Initialize on mount
	useEffect(() => {
		isDisposedRef.current = false;
		createNode();

		// Cleanup on unmount
		return () => {
			isDisposedRef.current = true;
			if (autoDispose) {
				dispose();
			}
		};
	}, [createNode, autoDispose, dispose]);

	return {
		node,
		isReady,
		isLoading,
		error,
		retry,
		dispose,
	};
}

/**
 * Specialized hook for BitCrusher worklet nodes
 */
export function useBitCrusherWorklet(options: UseWorkletNodeOptions = {}) {
	// Placeholder implementation for now
	const hookResult = useWorkletNode(
		class PlaceholderBitCrusher {
			ready: Promise<void>;

			constructor(options: unknown) {
				console.log('Placeholder BitCrusher created', options);
				this.ready = Promise.resolve();
			}

			dispose() {
				console.log('Placeholder BitCrusher disposed');
			}
		},
		{
			...options,
			initialParams: {
				bits: 8,
				sampleRate: 8000,
				wet: 1.0,
				...options.initialParams,
			},
		}
	);

	return {
		...hookResult,
		// Add BitCrusher-specific methods
		setBits: (bits: number) => {
			console.log('setBits called with:', bits);
		},
		setSampleRate: (sampleRate: number) => {
			console.log('setSampleRate called with:', sampleRate);
		},
		setWet: (wet: number) => {
			console.log('setWet called with:', wet);
		},
	};
}
