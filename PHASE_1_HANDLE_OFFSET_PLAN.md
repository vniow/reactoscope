# Phase 1: Data Structure & Node Modification for Handle Offsets

This phase focuses on establishing the necessary data structures to support multiple, offset handles on nodes.

## Objectives:

1.  **Standardize Handle Configuration Types**: Define clear TypeScript interfaces for handle configurations and node data that includes these configurations.
2.  **Prepare Node Definitions**: Ensure that custom node components are structured to accept and utilize this new handle configuration data.

## Tasks:

### 1. Define/Update Core Types

- **File**: `/Users/ani/github/reactoscope/src/utils/handleCoordinates.ts` (or a new shared types file like `src/types.ts` or `src/nodes/types.ts` if preferred for broader use).
- **Action**:
  - Verify and update the `HandleConfig` interface to include `id`, `position`, and `type`.
  - Verify the `MyNodeDataWithHandles` interface.
- **Details**:

  ```typescript
  import { Position } from '@xyflow/react'; // Ensure this import is present

  export interface HandleConfig {
  	id: string; // Unique identifier for the handle within the node
  	position: Position; // React Flow Position (Top, Bottom, Left, Right)
  	type: 'source' | 'target'; // Type of the handle
  	// variant?: string; // Optional: if handles can have different visual styles (e.g., colors)
  	// Add any other handle-specific properties needed
  }

  export interface MyNodeDataWithHandles extends Record<string, unknown> {
  	configuredHandles?: HandleConfig[]; // Array of handle configurations for the node
  	// ... other existing node data properties (e.g., label, specific content)
  }
  ```

### 2. Update Node Definitions to Use `configuredHandles`

- **Files**: All custom node definition files that will support multiple handles. Examples based on workspace structure:
  - Files within `/Users/ani/github/reactoscope/src/nodes/`
  - Potentially `/Users/ani/github/reactoscope/src/components/BaseNode.tsx` if it defines or passes through node data.
  - `/Users/ani/github/reactflow-r3f-sandbox/src/nodes/PositionLoggerNode.tsx`
  - `/Users/ani/github/reactflow-r3f-sandbox/src/nodes/R3FTestNode.tsx`
- **Action**:
  - For each relevant node type, modify its data structure (or the initial data provided when creating instances of that node) to include the `configuredHandles` array.
  - Populate `configuredHandles` with the desired set of handles for that node type.
- **Example**:
  If you have a node, say `DualOutputNode`, that needs two source handles at the top and one target handle on the left, its data setup would look like this:

  ```typescript
  // In the file where you define or create 'DualOutputNode' instances
  import { Position } from '@xyflow/react';
  import type {
  	MyNodeDataWithHandles,
  	HandleConfig,
  } from './path/to/your/types'; // Adjust path

  const dualOutputNodeInitialData: MyNodeDataWithHandles = {
  	// ... other node properties like label, etc.
  	label: 'Dual Output Node',
  	configuredHandles: [
  		{ id: 'dual-out-top-1', type: 'source', position: Position.Top },
  		{ id: 'dual-out-top-2', type: 'source', position: Position.Top },
  		{ id: 'dual-out-left-target', type: 'target', position: Position.Left },
  	],
  };

  // If creating nodes dynamically:
  // const newNode = {
  //   id: 'some-unique-id',
  //   type: 'dualOutputNodeType', // Your custom node type string
  //   position: { x: 100, y: 100 },
  //   data: dualOutputNodeInitialData,
  // };
  ```

- **Guidance**:
  - Identify which of your existing or new node types will require multiple handles.
  - For each, decide on the number, `id`, `type`, and `position` for each handle.
  - Update the `data` property of these nodes accordingly. If you have a central place where initial node data is defined (e.g., a palette or a function that creates new nodes), that's where these changes will primarily occur.

## Next Steps (Phase 2 Preview):

Once these data structures are in place, Phase 2 will involve modifying the React components (e.g., `BaseNode.tsx` or specific node components) to dynamically render these configured handles, applying the necessary styles for offsetting.
