# Reimagining the Audio Flow Architecture with Zustand

This document outlines a state management architecture for a virtual Digital Audio Workstation (DAW) built with React Flow, Tone.js, and Zustand. The primary goal is to create a robust system that elegantly handles multichannel audio routing by synchronizing the React Flow graph state with the Tone.js audio engine.

## Core Principles

1.  **Single Source of Truth**: The Zustand store will be the central hub for the application's state, including React Flow nodes, edges, and the corresponding audio graph representation. This ensures data consistency and simplifies state management.
2.  **State Colocation**: All relevant information for a single conceptual unit (like an audio node) will be stored together. This means a single state object will contain its React Flow properties, a reference to its Tone.js instance, and the mapping of its UI handles to audio channels.
3.  **Reactive Audio Routing**: State changes, driven by user interactions in the React Flow canvas (e.g., adding nodes, connecting handles), will trigger corresponding actions in the Tone.js audio engine.

## Proposed Zustand Store Structure

A single Zustand store is sufficient for managing the application's state. The state will be organized into logical slices, even if they are not technically separate stores.

```typescript
// zustandStore.ts
import { create } from 'zustand';
import * as Tone from 'tone';

// Keep non-serializable Tone.js nodes in a separate map
const audioNodeRegistry = new Map<string, Tone.AudioNode>();

export interface Handle {
	id: string; // React Flow handle ID
	channel: number; // Corresponding Tone.js channel index
	label: string; // e.g., 'L', 'R', 'Input 1'
}

export interface AudioNodeData {
	audioNodeId: string; // Unique ID for the Tone.js node
	inputs: Handle[];
	outputs: Handle[];
	// ... other node-specific parameters (e.g., gain value, frequency)
}

export interface AppState {
	nodes: Node<AudioNodeData>[];
	edges: Edge[];

	// Actions
	addNode: (type: string, position: { x: number; y: number }) => void;
	removeNode: (nodeId: string) => void;
	updateNodeConfig: (nodeId: string, config: Partial<AudioNodeData>) => void;

	onConnect: (connection: Connection) => void;
	onEdgesDelete: (edges: Edge[]) => void;
}

export const useStore = create<AppState>((set, get) => ({
	nodes: [],
	edges: [],

	// ... actions implementation
}));
```

## State Shape and Workflow Details

### 1. Node Management

- **State**: Each React Flow `Node` object in the `nodes` array will have a `data` property conforming to the `AudioNodeData` interface. This `data` object is the key to linking the visual node to the audio engine.
- **`audioNodeId`**: A unique identifier (e.g., a UUID) used as a key in our `audioNodeRegistry` to retrieve the actual `Tone.AudioNode` instance. This is crucial because storing non-serializable objects like Tone.js nodes directly in the state is not recommended.
- **`inputs` & `outputs`**: These arrays define the node's audio I/O. Each `Handle` object maps a visual handle (`id`) to a specific audio `channel`.

**Workflow: Adding a Node (`addNode`)**

1.  A user action triggers `addNode('GainNode', { x: 100, y: 100 })`.
2.  The action creates a new Tone.js node (e.g., `new Tone.Gain(0.5).toDestination()`). For multichannel nodes, this might be a `Tone.Merge` or `Tone.Split` or a custom multichannel node.
3.  A unique `audioNodeId` is generated.
4.  The new Tone.js node is stored in the `audioNodeRegistry`: `audioNodeRegistry.set(audioNodeId, toneNode)`.
5.  A new React Flow `Node` object is created with the necessary handles defined in its `data` property. For a stereo gain node, this would look like:
    ```json
    {
    	"id": "react-flow-node-1",
    	"type": "GainNode",
    	"position": { "x": 100, "y": 100 },
    	"data": {
    		"audioNodeId": "audio-node-uuid-1",
    		"inputs": [
    			{ "id": "handle-in-l", "channel": 0, "label": "L" },
    			{ "id": "handle-in-r", "channel": 1, "label": "R" }
    		],
    		"outputs": [
    			{ "id": "handle-out-l", "channel": 0, "label": "L" },
    			{ "id": "handle-out-r", "channel": 1, "label": "R" }
    		]
    	}
    }
    ```
6.  The new node is added to the `nodes` array in the Zustand store.

### 2. Connection Management (The Core Logic)

This is where the multichannel challenge is solved. The `onConnect` callback from React Flow provides all the information needed to make the correct audio connection.

**Workflow: Connecting Nodes (`onConnect`)**

1.  React Flow's `onConnect` is triggered with a `connection` object: `{ source: 'node-1', sourceHandle: 'handle-out-l', target: 'node-2', targetHandle: 'handle-in-r' }`.
2.  This `connection` object is passed to the `onConnect` action in the Zustand store.
3.  **Inside the action**:
    a. Find the source and target nodes in the `get().nodes` array.
    b. Look up their `Tone.AudioNode` instances from the `audioNodeRegistry` using their `audioNodeId`.
    c. Find the specific `sourceHandle` object in the source node's `data.outputs` array to get the `sourceChannel`.
    d. Find the specific `targetHandle` object in the target node's `data.inputs` array to get the `targetChannel`.
    e. **Make the audio connection**: `sourceAudioNode.connect(targetAudioNode, sourceChannel, targetChannel)`.
    f. Add the new edge to the `edges` array in the store.

**Workflow: Deleting an Edge (`onEdgesDelete`)**

1.  The `onEdgesDelete` callback from React Flow provides an array of edges being removed.
2.  For each edge:
    a. Use the edge's `source`, `sourceHandle`, `target`, and `targetHandle` properties.
    b. Repeat the process from `onConnect` to find the nodes and channel numbers.
    c. **Disconnect the audio**: `sourceAudioNode.disconnect(targetAudioNode, sourceChannel, targetChannel)`.
    d. The edge is removed from the `edges` array in the store.

## Conclusion

This architecture provides a clear and scalable pattern for managing a complex audio application. By using Zustand as a single source of truth and creating a well-defined mapping between React Flow handles and Tone.js channels, you can effectively manage multichannel audio routing. Keeping non-serializable audio objects in a separate registry ensures a clean, serializable state, which is beneficial for debugging and potential future features like saving/loading patches.
