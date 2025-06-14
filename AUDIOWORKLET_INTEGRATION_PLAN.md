# AudioWorklet Integration Plan for Reactoscope

## Overview

This document outlines the plan to integrate the AudioWorklet functionality from `tone-audioworklet-demo` into the `reactoscope` project. The goal is to create demo nodes that serve as interfaces for custom AudioWorklets within the React Flow visual interface.

## Current State Analysis

### tone-audioworklet-demo Architecture

- **ToneWorkletBase**: Abstract base class extending `Tone.ToneAudioNode` that wraps AudioWorklet functionality
- **WorkletGlobalScope**: Registry system for managing worklet code compilation and registration
- **Specific Worklet Nodes**: NoiseNode, BitCrusherNode, DelayNode - concrete implementations
- **Worklet Processors**: JavaScript code as strings that run in the AudioWorklet context
- **React Hooks**: Custom hooks (e.g., `useNoiseWorklet`) for managing worklet lifecycle in React components

### reactoscope Architecture

- **React Flow Integration**: Node-based visual audio editor using `@xyflow/react`
- **Zustand Store**: State management with audio slice for nodes and connections
- **Tone.js Integration**: Existing hooks like `useToneOscillator`, `useToneGain` for standard Tone.js nodes
- **Node System**: BaseNode component with grid-based layout and type-specific nodes
- **Registry System**: `toneRegistry` for managing Tone.js node instances

## Integration Strategy

### Phase 1: Core Infrastructure Migration ✅ COMPLETED

#### 1.1 AudioWorklet Base System ✅

- **Location**: `src/lib/worklets/`
- **Files Created**:
  - `ToneWorkletBase.ts` - Base class for all worklet nodes ✅
  - `WorkletGlobalScope.ts` - Registry and compilation system ✅
  - `WorkletTypes.ts` - TypeScript interfaces and types ✅

#### 1.2 Worklet Processors ✅

- **Location**: `src/lib/worklets/processors/`
- **Files Created**:
  - `ToneAudioWorkletProcessor.worklet.ts` - Base processor class ✅
  - `SingleIOProcessor.worklet.ts` - Single input/output processor ✅
  - `NoiseProcessor.worklet.ts` - White noise generator ✅

#### 1.3 Worklet Node Implementations ✅

- **Location**: `src/lib/worklets/nodes/`
- **Files Created**:
  - `NoiseWorkletNode.ts` - Noise generator worklet wrapper ✅

#### 1.4 Additional Infrastructure ✅

- **Files Created**:
  - `index.ts` - Module exports and public API ✅
  - `test.ts` - Testing utilities for worklet functionality ✅

### Phase 2: React Flow Node Integration ✅ COMPLETED

#### 2.1 Node Type Definitions ✅

- **Location**: `src/nodes/types.ts`
- **Updates**: Added worklet node types and updated AppNode union ✅

#### 2.2 Store Integration ✅

- **Location**: `src/stores/slices/audioSlice.ts`
- **Updates**: Added worklet parameter types and updated AudioNodeData ✅

#### 2.3 React Hook Creation ✅

- **Location**: `src/hooks/useNoiseWorklet.ts`
- **Files Created**: Noise worklet management hook ✅

#### 2.4 Node Component Creation ✅

- **Location**: `src/nodes/NoiseWorkletNode.tsx`
- **Files Created**: React Flow node component for noise generator ✅

#### 2.5 Node Configuration ✅

- **Location**: `src/config/nodeTypes.ts`
- **Updates**: Added noise worklet to AUDIO_NODES and updated helpers ✅

#### 2.6 Node Registration ✅

- **Location**: `src/nodes/index.ts`
- **Updates**: Registered NoiseWorkletNode component in nodeTypes ✅

### Phase 3: React Hooks for Worklet Management

#### 3.1 Worklet-Specific Hooks

- **Location**: `src/hooks/`
- **Files to Create**:
  - `useNoiseWorklet.ts` - Hook for managing noise generator worklet
  - `useBitCrusherWorklet.ts` - Hook for managing bit crusher worklet
  - `useDelayWorklet.ts` - Hook for managing delay worklet
  - `useWorkletBase.ts` - Shared logic for all worklet hooks

#### 3.2 Hook Pattern Standardization

```typescript
// Standard worklet hook interface
export interface WorkletHookResult<T> {
	workletNode: T | null;
	isInitialized: boolean;
	isReady: boolean;
	params: WorkletParams;
	updateParams: (params: Partial<WorkletParams>) => void;
	start?: () => void;
	stop?: () => void;
}
```

### Phase 4: Store Integration

#### 4.1 Audio Slice Updates

- **Location**: `src/stores/slices/audioSlice.ts`
- **Updates**:

  ```typescript
  // Add worklet parameter types
  export interface NoiseWorkletParams {
  	isPlaying: boolean;
  	volume: number;
  }

  export interface BitCrusherWorkletParams {
  	bits: number;
  	wet: number;
  }

  export interface DelayWorkletParams {
  	delayTime: number;
  	feedback: number;
  	wet: number;
  }

  // Update AudioNodeData union
  export interface AudioNodeData {
  	id: string;
  	type:
  		| 'oscillator'
  		| 'gain'
  		| 'analyser'
  		| 'visualizer'
  		| 'destination'
  		| 'noise-worklet'
  		| 'bitcrusher-worklet'
  		| 'delay-worklet';
  	params:
  		| OscillatorParams
  		| GainParams
  		| AnalyserParams
  		| NoiseWorkletParams
  		| BitCrusherWorkletParams
  		| DelayWorkletParams;
  }
  ```

#### 4.2 Registry Integration

- **Location**: `src/utils/toneRegistry.ts`
- **Updates**: Extend registry to handle worklet nodes alongside standard Tone.js nodes

### Phase 5: UI Components and Controls

#### 5.1 Worklet-Specific Controls

- **Location**: `src/components/ui/`
- **Files to Create/Update**:
  - `WorkletControls.tsx` - Base worklet control component
  - `NoiseControls.tsx` - Controls for noise generator
  - `BitCrusherControls.tsx` - Controls for bit crusher
  - `DelayControls.tsx` - Controls for delay effect

#### 5.2 Node Panel Integration

- **Location**: `src/components/NodeAddPanel/`
- **Updates**: Add worklet nodes to the node creation panel with appropriate categories

### Phase 6: Example Implementations

#### 6.1 Demo Nodes

Create three initial worklet nodes as proof of concept:

1. **Noise Generator Worklet Node**

   - Simple white noise source
   - Volume control
   - Start/stop functionality
   - Visual indicator for generation state

2. **Bit Crusher Effect Worklet Node**

   - Bit depth control (1-16 bits)
   - Wet/dry mix control
   - Real-time parameter updates
   - Input/output connections

3. **Delay Effect Worklet Node**
   - Delay time control
   - Feedback control
   - Wet/dry mix control
   - Multiple input/output routing

#### 6.2 Node Styling and Layout

- Use existing `BaseNode` component structure
- Implement grid-based control layouts
- Match visual style with existing nodes
- Include variant-based theming

## Implementation Details

### File Structure

```
src/
├── lib/
│   └── worklets/
│       ├── ToneWorkletBase.ts
│       ├── WorkletGlobalScope.ts
│       ├── WorkletTypes.ts
│       ├── nodes/
│       │   ├── NoiseWorkletNode.ts
│       │   ├── BitCrusherWorkletNode.ts
│       │   └── DelayWorkletNode.ts
│       └── processors/
│           ├── ToneAudioWorkletProcessor.worklet.ts
│           ├── SingleIOProcessor.worklet.ts
│           ├── NoiseProcessor.worklet.ts
│           ├── BitCrusherProcessor.worklet.ts
│           └── DelayProcessor.worklet.ts
├── nodes/
│   ├── NoiseWorkletNode.tsx
│   ├── BitCrusherWorkletNode.tsx
│   └── DelayWorkletNode.tsx
├── hooks/
│   ├── useWorkletBase.ts
│   ├── useNoiseWorklet.ts
│   ├── useBitCrusherWorklet.ts
│   └── useDelayWorklet.ts
└── components/
    └── ui/
        ├── WorkletControls.tsx
        ├── NoiseControls.tsx
        ├── BitCrusherControls.tsx
        └── DelayControls.tsx
```

### Key Integration Points

#### 1. Worklet Registration System

- Maintain compatibility with existing Tone.js architecture
- Use blob URLs for worklet code injection
- Handle worklet loading states and errors gracefully
- Provide debug logging consistent with existing patterns

#### 2. State Management

- Integrate worklet parameters into existing Zustand store
- Maintain parameter synchronization between React state and worklet instances
- Handle worklet lifecycle within React component lifecycle

#### 3. Audio Routing

- Connect worklets through existing connection system
- Support multiple input/output configurations
- Integrate with visualization system for worklet-generated audio

#### 4. Error Handling

- Implement comprehensive error handling for worklet failures
- Provide user-friendly feedback for worklet loading issues
- Graceful degradation when AudioWorklet is not supported

#### 5. Performance Considerations

- Lazy load worklet code to avoid blocking main thread
- Implement worklet pooling if needed for multiple instances
- Monitor memory usage for worklet instances

## Development Phases

### Phase 1 (Foundation): 2-3 days

- Migrate core worklet infrastructure
- Set up basic worklet processor system
- Create ToneWorkletBase and WorkletGlobalScope

### Phase 2 (Nodes): 3-4 days

- Implement React Flow node components
- Create worklet-specific hooks
- Integrate with existing store architecture

### Phase 3 (UI): 2-3 days

- Build control components
- Integrate with BaseNode system
- Implement parameter visualization

### Phase 4 (Polish): 1-2 days

- Error handling and edge cases
- Performance optimization
- Documentation and examples

## Testing Strategy

### Unit Tests

- Test worklet processor logic in isolation
- Test React hooks with mock AudioContext
- Test store integration and state updates

### Integration Tests

- Test worklet nodes within React Flow
- Test audio routing and connections
- Test parameter synchronization

### Browser Compatibility

- Test AudioWorklet support detection
- Test graceful fallback for unsupported browsers
- Test performance across different devices

## Future Extensibility

### Custom Worklet Development

- Provide template for creating new worklet processors
- Document worklet development workflow
- Create development tools for worklet debugging

### Advanced Features

- Multi-channel worklet support
- Worklet parameter automation
- Visual worklet code editor
- Worklet performance profiling

## Success Criteria

1. **Functional Integration**: All three demo worklet nodes working within React Flow
2. **Performance**: No noticeable performance impact on existing functionality
3. **User Experience**: Intuitive controls and visual feedback
4. **Code Quality**: Well-documented, maintainable code following existing patterns
5. **Compatibility**: Works across supported browsers with graceful fallbacks

## Risk Mitigation

### Technical Risks

- **AudioWorklet Browser Support**: Implement feature detection and fallbacks
- **Performance Impact**: Profile and optimize worklet loading and execution
- **Memory Leaks**: Implement proper cleanup in component lifecycle

### Integration Risks

- **Breaking Changes**: Maintain backward compatibility with existing nodes
- **State Complexity**: Keep store updates atomic and predictable
- **UI Consistency**: Follow existing design patterns and component structure

This plan provides a comprehensive roadmap for integrating AudioWorklet functionality into reactoscope while maintaining the existing architecture and user experience.
