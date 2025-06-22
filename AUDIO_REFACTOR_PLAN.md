# Audio Architecture Refactor Plan

This document provides a step-by-step guide to refactor the Reactoscope audio architecture. The goal is to align the existing implementation with the principles outlined in `AUDIO_ARCHITECTURE_REIMAGINED.md`, focusing on creating a fully serializable state, robust multichannel audio routing, and a clean separation of concerns.

## 1. Core Refactor: `src/audio/stores/audioSlice.ts`

The most significant changes will happen in the audio slice. We will introduce an external registry for non-serializable `Tone.js` objects and update the state to support explicit handle-to-channel mapping.

### Step 1.1: Create the External Audio Node Registry

At the top of `audioSlice.ts`, create a `Map` to store all `Tone.js` instances. This is the most critical step for making your Zustand state serializable.

```typescript
// src/audio/stores/audioSlice.ts
import * as Tone from 'tone';
import { StateCreator } from 'zustand';
// ... other imports

// This registry will hold all non-serializable Tone.js instances,
// keeping the Zustand store clean.
const audioNodeRegistry = new Map<
	string,
	Tone.AudioNode | Tone.ToneAudioNode
>();
```

### Step 1.2: Redefine State Shape for Multichannel I/O

Introduce a new `NodeHandle` type and add `inputs` and `outputs` arrays to `AudioNodeData`. This creates a clear, state-driven definition of a node's audio interface.

```typescript
// src/audio/stores/audioSlice.ts

// New type for defining audio I/O handles
export interface NodeHandle {
	id: string; // Must match the id of a <GridNodeHandle> component
	channel: number; // The corresponding Tone.js channel index
	label: string; // UI label for the handle
}

// Update AudioNodeData to include handle definitions
export interface AudioNodeData {
	id: string;
	type: AudioNodeType;
	params: AudioNodeParams;
	// Add explicit definitions for inputs and outputs
	inputs: NodeHandle[];
	outputs: NodeHandle[];
}

// Update the AudioSlice interface and addAudioNode signature
export interface AudioSlice {
	// ...
	addAudioNode: (
		nodeId: string,
		type: AudioNodeType,
		params: AudioNodeParams,
		// Pass handle definitions when creating a node
		inputs: NodeHandle[],
		outputs: NodeHandle[]
	) => void;
	// ...
}
```

### Step 1.3: Refactor State Actions to Use the Registry

Modify the slice's actions to interact with the new `audioNodeRegistry` and use the handle definitions for connection logic.

```typescript
// src/audio/stores/audioSlice.ts

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (
	set,
	get
) => ({
	// ... existing state ...

	// 1. Update addAudioNode to accept handle definitions
	addAudioNode: (nodeId, type, params, inputs, outputs) => {
		set((state) => {
			if (state.audioNodes[nodeId]) return state; // Already exists
			return {
				audioNodes: {
					...state.audioNodes,
					[nodeId]: { id: nodeId, type, params, inputs, outputs },
				},
			};
		});
	},

	// 2. Refactor instance management to use the external registry
	setAudioNodeInstance: (nodeId, instance) => {
		audioNodeRegistry.set(nodeId, instance);
	},

	getAudioNodeInstance: (nodeId) => {
		return audioNodeRegistry.get(nodeId);
	},

	removeAudioNodeInstance: (nodeId) => {
		const instance = audioNodeRegistry.get(nodeId);
		if (instance) {
			if (typeof (instance as any).dispose === 'function') {
				(instance as any).dispose();
			}
			audioNodeRegistry.delete(nodeId);
		}
	},

	// 3. Refactor connection logic for multichannel routing
	connectAudioNodes: (sourceId, targetId, sourceHandle, targetHandle) => {
		const sourceNodeData = get().audioNodes[sourceId];
		const targetNodeData = get().audioNodes[targetId];
		const sourceAudioNode = get().getAudioNodeInstance(sourceId);
		const targetAudioNode = get().getAudioNodeInstance(targetId);

		if (
			!sourceNodeData ||
			!targetNodeData ||
			!sourceAudioNode ||
			!targetAudioNode
		) {
			console.error(
				`Connection failed: node data or instance not found for ${sourceId} -> ${targetId}`
			);
			return;
		}

		// Find the channel numbers from the handle IDs
		const sourceChannel = sourceNodeData.outputs.find(
			(h) => h.id === sourceHandle
		)?.channel;
		const targetChannel = targetNodeData.inputs.find(
			(h) => h.id === targetHandle
		)?.channel;

		if (sourceChannel === undefined || targetChannel === undefined) {
			console.error(
				`Connection failed: Could not map handles to channels for ${sourceHandle} -> ${targetHandle}`
			);
			return;
		}

		// Perform the precise, multichannel Tone.js connection
		sourceAudioNode.connect(targetAudioNode, sourceChannel, targetChannel);

		// Update state with the new connection info
		// (Your existing logic for updating audioConnections should be fine)
	},

	disconnectAudioNodes: (connectionId) => {
		const connection = get().audioConnections.find(
			(c) => c.id === connectionId
		);
		if (!connection) return;

		const { sourceNodeId, targetNodeId, sourceHandleId, targetHandleId } =
			connection;
		const sourceNodeData = get().audioNodes[sourceNodeId];
		const sourceAudioNode = get().getAudioNodeInstance(sourceNodeId);
		const targetAudioNode = get().getAudioNodeInstance(targetNodeId);

		if (sourceNodeData && sourceAudioNode && targetAudioNode) {
			const sourceChannel = sourceNodeData.outputs.find(
				(h) => h.id === sourceHandleId
			)?.channel;
			// The target channel is needed for a complete disconnect call
			const targetChannel = get().audioNodes[targetNodeId]?.inputs.find(
				(h) => h.id === targetHandleId
			)?.channel;

			if (sourceChannel !== undefined && targetChannel !== undefined) {
				sourceAudioNode.disconnect(
					targetAudioNode,
					sourceChannel,
					targetChannel
				);
			}
		}

		// Update state to remove the connection
		// (Your existing logic for updating audioConnections should be fine)
	},
	// ... other actions
});
```

## 2. Centralize Node I/O in `src/shared/config/nodeTypes.ts`

To make this system maintainable, define the `inputs` and `outputs` for each node type in one place.

```typescript
// src/shared/config/nodeTypes.ts
import type { NodeHandle } from '../../audio/stores/audioSlice';

export interface NodeTypeOption {
  type: string;
  name: string;
  // ... other properties
  inputs: NodeHandle[];  // Add this
  outputs: NodeHandle[]; // Add this
  defaultData: any;
}

// Example for GainNode (stereo)
{
  type: 'gain',
  name: 'Gain',
  // ...
  inputs: [
    { id: 'gain-in-l', channel: 0, label: 'L' },
    { id: 'gain-in-r', channel: 1, label: 'R' },
  ],
  outputs: [
    { id: 'gain-out-l', channel: 0, label: 'L' },
    { id: 'gain-out-r', channel: 1, label: 'R' },
  ],
  defaultData: { /* ... */ },
},

// Example for ThreeWorkletNode (stereo source)
{
  type: 'three-worklet',
  name: 'Three Worklet',
  // ...
  inputs: [], // It's a source node
  outputs: [
    { id: 'outputX', channel: 0, label: 'X' },
    { id: 'outputY', channel: 1, label: 'Y' },
  ],
  defaultData: { /* ... */ },
}
```

## 3. Update Node Lifecycle Hooks

Modify your custom hooks (`useToneOscillator`, `useThreeWorklet`, etc.) to pass the new handle data when creating an audio node.

```typescript
// Example in src/audio/hooks/useToneOscillator.ts
import { AUDIO_NODES } from '../../shared/config/nodeTypes';

// ... inside the hook ...
useEffect(() => {
	if (!isInitializedInStoreRef.current && !getAudioNode(nodeId)) {
		// Find the node's static configuration
		const nodeConfig = AUDIO_NODES.find((n) => n.type === 'oscillator');
		if (nodeConfig) {
			// Call addAudioNode with the new handle data
			addAudioNode(
				nodeId,
				'oscillator',
				defaultParams,
				nodeConfig.inputs,
				nodeConfig.outputs
			);
			isInitializedInStoreRef.current = true;
		}
	}
}, [nodeId, addAudioNode, defaultParams, getAudioNode]);
```

## 4. Bridge UI and Audio Engine in `src/flow/stores/flowSlice.ts`

Finally, connect the React Flow events to your newly refactored audio actions.

```typescript
// src/flow/stores/flowSlice.ts
import { addEdge, applyEdgeChanges, type EdgeChange, type Connection } from '@xyflow/react';

// ... inside createFlowSlice ...
onConnect: (connection) => {
	const { source, target, sourceHandle, targetHandle } = connection;

	// Ensure all parts of the connection are valid
	if (source && target && sourceHandle && targetHandle) {
		// Call the refactored audio connection action
		get().connectAudioNodes(source, target, sourceHandle, targetHandle);
	}

	// Update React Flow state
	set((state) => ({
		edges: addEdge(connection, state.edges),
	}));
},

onEdgesChange: (changes) => {
	// Find edges that are being removed to trigger disconnection
	for (const change of changes) {
		if (change.type === 'remove') {
			const edge = get().edges.find(e => e.id === change.id);
			if (edge) {
				// The audio slice can look up the connection by its ID
				get().disconnectAudioNodes(edge.id);
			}
		}
	}

	// Apply the changes to the React Flow edges state
	set((state) => ({
		edges: applyEdgeChanges(changes, state.edges),
	}));
},
```

By following these steps, you will successfully migrate your application to a more robust, scalable, and maintainable audio architecture that is ready for complex, multichannel routing.
