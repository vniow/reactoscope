# Audio Visualizer Node Implementation Plan

## Overview

This document outlines the implementation plan for integrating the AudioVisualizer from the `woscope-r3f-ts` project into `reactoscope` as a fully functional audio node. The visualizer will accept audio inputs through the existing Tone.js-based audio routing system and provide real-time waveform visualization.

## Project Analysis

### Current State

- **reactoscope**: Node-based audio synthesis environment using React Flow + Tone.js
- **woscope-r3f-ts**: Standalone audio visualizer using React Three Fiber + WebGL shaders
- **Dependencies**: All required dependencies already exist in reactoscope (R3F, drei, three, tone, leva, glsl)

### Existing Audio Node Architecture

reactoscope follows a consistent pattern for audio nodes:

1. **Node Component** (`GainNode.tsx`, `OscillatorNode.tsx`, `DestinationNode.tsx`)
2. **Tone.js Hook** (`useToneGain.ts`, `useToneOscillator.ts`, `useToneDestination.ts`)
3. **Audio Store Integration** (audioSlice.ts)
4. **Connection Management** (`useToneConnections.ts`)

## Implementation Strategy

### Phase 1: Core Infrastructure

#### 1.1 Audio Store Extension

**File**: `src/stores/slices/audioSlice.ts`

Add support for analyser nodes:

```typescript
export interface AnalyserParams {
	size: number; // FFT size (default: 1024)
	smoothing: number; // Time smoothing (0-1)
	isConnected: boolean;
}

// Update AudioNodeData type
export interface AudioNodeData {
	id: string;
	type: 'oscillator' | 'gain' | 'analyser';
	params: OscillatorParams | GainParams | AnalyserParams;
}

// Update AudioSlice interface
export interface AudioSlice {
	addAudioNode: (
		nodeId: string,
		type: 'oscillator' | 'gain' | 'analyser',
		params: OscillatorParams | GainParams | AnalyserParams
	) => void;
	// ... rest remains the same
}
```

#### 1.2 Tone.js Analyser Hook

**File**: `src/hooks/useToneAnalyser.ts`

Create a hook following the pattern of `useToneGain.ts`:

```typescript
export interface ToneAnalyserControls {
  updateSize: (size: number) => void;
  updateSmoothing: (smoothing: number) => void;
  getAnalyserL: () => Tone.Analyser | null;
  getAnalyserR: () => Tone.Analyser | null;
  params: AnalyserParams;
}

export const useToneAnalyser = (nodeId: string): ToneAnalyserControls
```

Key responsibilities:

- Create stereo Tone.Analyser instances
- Register in global `toneInstances` registry as `analyser-${nodeId}`
- Handle incoming audio connections
- Provide access to analyser data for visualization

#### 1.3 Node Type Definition

**File**: `src/nodes/types.ts`

```typescript
export type VisualizerNode = Node<BaseNodeData & AudioNodeData, 'visualizer'>;

export type AppNode =
	| BuiltInNode
	| PositionLoggerNode
	| ThemeDebugNode
	| OscillatorNode
	| GainNode
	| DestinationNode
	| VisualizerNode;
```

### Phase 2: Visualizer Components Migration

#### 2.1 Port Shader Files

**Files**:

- `src/shaders/vsLine.glsl` ✅ (already exists)
- `src/shaders/fsLine.glsl` ✅ (already exists)

No changes needed - files already exist in reactoscope.

#### 2.2 Port and Adapt Shader Material

**File**: `src/materials/LineShaderMaterial.ts`

Port from woscope-r3f-ts with minimal changes:

- Same uniforms and shader code
- Same R3F integration
- Already compatible with existing vite-plugin-glsl setup

#### 2.3 Port Geometry Management

**File**: `src/geometry/AudioWaveformGeometry.ts`

Port the `useWaveformGeometry` hook:

- Buffer attribute management
- Audio data processing
- Geometry updates

#### 2.4 Adapt Visualizer Controls

**File**: `src/components/VisualizerControls.tsx`

Transform from Leva-based controls to node-internal controls:

```typescript
// Instead of Leva, use local state + node parameters
interface VisualizerControlsProps {
	params: AnalyserParams;
	onUpdateSize: (size: number) => void;
	onUpdateSmoothing: (smoothing: number) => void;
}
```

#### 2.5 Core Visualizer Component

**File**: `src/components/AudioVisualizerCore.tsx`

Adapt `AudioWaveformLines.tsx` to work with Tone.js analysers:

```typescript
interface AudioVisualizerCoreProps {
	analyserL: Tone.Analyser | null;
	analyserR: Tone.Analyser | null;
	width: number;
	height: number;
	// Remove Leva-based controls, use props instead
	lineColor: string;
	lineThickness: number;
	lineIntensity: number;
	audioScale: number;
}
```

### Phase 3: Node Implementation

#### 3.1 Visualizer Node Component

**File**: `src/nodes/VisualizerNode.tsx`

Create the main node component following `GainNode.tsx` pattern:

```typescript
export function VisualizerNode({
	id,
	data,
	selected,
}: NodeProps<VisualizerNode>) {
	// Hook integrations
	const { updateSize, updateSmoothing, getAnalyserL, getAnalyserR, params } =
		useToneAnalyser(id);
	useToneConnections(id); // Handle incoming audio connections

	// Handle positions
	const inputPosition = useHandlePosition(id, 'audio-in', Position.Top);

	return (
		<BaseNode
			variant='audio'
			gridWidth={data.gridWidth ?? 6}
			gridHeight={data.gridHeight ?? 8}
			// ... controls and Canvas integration
		>
			{/* Node controls */}
			{/* R3F Canvas with AudioVisualizerCore */}
			{/* Audio input handle */}
		</BaseNode>
	);
}
```

Key features:

- Audio input handle (like GainNode)
- Embedded R3F Canvas for visualization
- Local controls for visualizer parameters
- Responsive sizing within node bounds

### Phase 4: System Integration

#### 4.1 Register Node Type

**File**: `src/nodes/index.ts`

```typescript
import { VisualizerNode } from './VisualizerNode';

export const nodeTypes = {
	'position-logger': PositionLoggerNode,
	'theme-debug': ThemeDebugNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	destination: DestinationNode,
	visualizer: VisualizerNode,
} satisfies NodeTypes;
```

#### 4.2 Add to Node Creation Panel

**File**: `src/components/NodeAddPanel.tsx`

```typescript
{
  type: 'visualizer' as const,
  name: 'Audio Visualizer',
  description: 'Real-time waveform visualization',
  defaultData: {
    id: '',
    type: 'visualizer' as const,
    params: {
      size: 1024,
      smoothing: 0.8,
      isConnected: false,
    },
    label: 'Visualizer',
    gridWidth: 6,
    gridHeight: 8,
  },
}
```

#### 4.3 Update Connection System

**File**: `src/hooks/useToneConnections.ts`

Ensure the connection system recognizes and properly connects to analyser nodes:

```typescript
// Add 'analyser' to supported target types
if (
	sourceNode &&
	targetNode &&
	(targetNode.type === 'gain' || targetNode.type === 'analyser')
) {
	// Connection logic
}
```

## Technical Considerations

### Audio Routing Architecture

```
[Source Node] → [Analyser Node] → [Visualizer Display]
                      ↓
                [Optional Pass-through Output]
```

The analyser will:

1. Receive audio input from source nodes
2. Split audio into L/R channels for stereo analysis
3. Process audio for visualization
4. Optionally pass audio through to other nodes

### Performance Optimizations

1. **Selective Updates**: Only update geometry when audio is playing
2. **Frame Rate Control**: Sync with requestAnimationFrame
3. **Buffer Management**: Efficient typed array handling
4. **Canvas Sizing**: Responsive canvas within node bounds

### Styling Integration

- Follow existing Tailwind CSS patterns
- Dark mode support via theme context
- Consistent with other audio nodes
- Node resize capabilities

## File Structure Summary

```
src/
├── components/
│   ├── AudioVisualizerCore.tsx        # NEW - Core R3F visualizer
│   └── VisualizerControls.tsx         # NEW - Internal node controls
├── geometry/
│   └── AudioWaveformGeometry.ts       # NEW - Port from woscope-r3f-ts
├── hooks/
│   └── useToneAnalyser.ts             # NEW - Tone.js analyser management
├── materials/
│   └── LineShaderMaterial.ts          # NEW - Port from woscope-r3f-ts
├── nodes/
│   ├── VisualizerNode.tsx             # NEW - Main node component
│   ├── index.ts                       # MODIFY - Register new node
│   └── types.ts                       # MODIFY - Add VisualizerNode type
├── shaders/                           # EXISTING - Already have needed shaders
│   ├── fsLine.glsl
│   └── vsLine.glsl
└── stores/slices/
    └── audioSlice.ts                  # MODIFY - Add analyser support
```

## Implementation Timeline

### Week 1: Foundation

- [ ] Update audio store for analyser support
- [ ] Create `useToneAnalyser` hook
- [ ] Update node types and connection system

### Week 2: Component Migration

- [ ] Port shader material and geometry
- [ ] Create `AudioVisualizerCore` component
- [ ] Implement visualizer controls

### Week 3: Node Integration

- [ ] Build `VisualizerNode` component
- [ ] Integrate with node system
- [ ] Add to creation panel

### Week 4: Polish & Testing

- [ ] Performance optimization
- [ ] Visual polish and theming
- [ ] Connection testing with various audio sources
- [ ] Documentation updates

## Future Enhancements

1. **Multiple Visualization Modes**: Spectrum, waveform, circular patterns
2. **Color Customization**: Node-level color picker
3. **Recording Capability**: Export visualizations as video/gif
4. **Multiple Input Channels**: Support for more than stereo
5. **Audio Pass-through**: Optional output handle for chaining

## Success Criteria

- [ ] Audio visualizer functions as a proper reactoscope node
- [ ] Accepts audio input from oscillators and gain nodes
- [ ] Real-time visualization performance is smooth (60fps)
- [ ] Follows existing node patterns and conventions
- [ ] Properly integrates with theme system
- [ ] Maintains clean audio routing architecture
