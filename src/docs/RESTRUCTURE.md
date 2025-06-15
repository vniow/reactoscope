# Reactoscope - Reorganized Project Structure

This document outlines the new organization of the Reactoscope codebase, separating concerns into distinct domains.

## New Structure Overview

```
src/
├── audio/                          # 🎵 Audio Domain
│   ├── hooks/                      # Audio-specific hooks
│   │   ├── useToneOscillator.ts
│   │   ├── useToneGain.ts
│   │   ├── useToneDestination.ts
│   │   ├── useToneAnalyser.ts
│   │   ├── useToneConnections.ts
│   │   ├── useToneConnectionsZustand.ts
│   │   ├── useCoordinateAudioWorklet.ts
│   │   ├── useMultiChannelCoordinateAudioWorklet.ts
│   │   └── useNoiseWorklet.ts
│   ├── stores/                     # Audio state management
│   │   └── audioSlice.ts
│   ├── worklets/                   # Audio worklets and processors
│   │   ├── index.ts
│   │   ├── ToneWorkletBase.ts
│   │   ├── WorkletGlobalScope.ts
│   │   ├── WorkletTypes.ts
│   │   ├── nodes/
│   │   └── processors/
│   ├── AudioConnectionDebugPanel.tsx
│   ├── AudioVisualizer.tsx
│   ├── AudioWaveformLines.tsx
│   ├── VisualizerControls.ts
│   └── index.ts                    # Audio domain exports
├── flow/                           # 🌊 Flow/UI Domain
│   ├── components/                 # Flow-specific components
│   │   ├── FlowControls.tsx
│   │   ├── FlowDebugPanel.tsx
│   │   ├── ThemedMiniMap.tsx
│   │   ├── SaveRestoreModal.tsx
│   │   └── NodeAddPanel/
│   ├── edges/                      # Flow edge components
│   │   ├── FloatingEdge.tsx
│   │   └── index.ts
│   ├── hooks/                      # Flow-specific hooks
│   │   ├── useFloatingPositions.ts
│   │   ├── useNodeOperations.ts
│   │   └── useViewportSize.ts
│   ├── stores/                     # Flow state management
│   │   ├── flowSlice.ts
│   │   └── uiSlice.ts
│   └── index.ts                    # Flow domain exports
├── webgl/                          # 🎨 WebGL/Three.js Domain
│   ├── shaders/                    # GLSL shaders
│   │   ├── fsLine.glsl
│   │   └── vsLine.glsl
│   ├── materials/                  # Three.js materials
│   │   └── LineShaderMaterial.ts
│   ├── geometry/                   # Three.js geometry
│   │   └── AudioWaveformGeometry.ts
│   └── index.ts                    # WebGL domain exports
├── nodes/                          # 🔗 Node Components (Hybrid)
│   ├── OscillatorNode.tsx
│   ├── GainNode.tsx
│   ├── DestinationNode.tsx
│   ├── VisualizerNode.tsx
│   ├── ThreeFiberDemoNode.tsx
│   ├── NoiseWorkletNode.tsx
│   ├── DebugNode.tsx
│   ├── FileLoaderNode.tsx
│   ├── types.ts
│   └── index.ts
├── shared/                         # 🔧 Shared Utilities & Components
│   ├── components/                 # Shared UI components
│   │   ├── BaseNode.tsx
│   │   ├── NodeHeader.tsx
│   │   ├── DebugComponents.tsx
│   │   ├── GridBlock.tsx
│   │   ├── GridNodeHandle.tsx
│   │   └── ui/                     # Shared UI primitives
│   │       ├── GridButton.tsx
│   │       ├── GridSelect.tsx
│   │       ├── GridSlider.tsx
│   │       ├── NodeDeleteButton.tsx
│   │       ├── VariantButton.tsx
│   │       └── index.ts
│   ├── stores/                     # Main store combining all slices
│   │   ├── appStore.ts             # Main Zustand store
│   │   ├── useAppStore.ts          # Store hook
│   │   ├── types.ts                # Store type definitions
│   │   └── themeSlice.ts           # Theme management
│   ├── utils/                      # Shared utilities
│   │   ├── colorSystem.ts
│   │   ├── debugUtils.ts
│   │   ├── fileUtils.ts
│   │   ├── gridHandleUtils.ts
│   │   ├── nodeFactory.ts
│   │   ├── nodeStyles.ts
│   │   ├── nodeUtils.ts
│   │   ├── styleUtils.ts
│   │   ├── themeUtils.tsx
│   │   ├── buttonVariants.ts
│   │   ├── useNodeVariant.ts
│   │   └── useVariantColors.ts
│   ├── config/                     # Shared configuration
│   │   ├── grid.ts
│   │   ├── nodeTypes.ts
│   │   └── panelLayout.ts
│   ├── types/                      # Global types
│   │   └── ui.ts
│   └── index.ts                    # Shared domain exports
├── contexts/                       # React contexts
├── docs/                           # Documentation
└── App.tsx                         # Main application component
```

## Domain Separation Benefits

### 🎵 Audio Domain (`src/audio/`)

- **Responsibility**: All audio processing, Tone.js integration, worklets
- **Independence**: Can be developed and tested separately from UI
- **Reusability**: Audio logic can be extracted for other projects
- **Imports**: `import { useToneOscillator } from '@/audio'`

### 🌊 Flow Domain (`src/flow/`)

- **Responsibility**: React Flow integration, node graph UI, flow controls
- **Independence**: UI logic separated from audio processing
- **Reusability**: Flow components can work with different node types
- **Imports**: `import { FlowControls } from '@/flow'`

### 🎨 WebGL Domain (`src/webgl/`)

- **Responsibility**: Three.js/WebGL rendering, shaders, materials
- **Independence**: Graphics rendering separated from audio and flow
- **Reusability**: WebGL components can be used in different contexts
- **Imports**: `import { LineShaderMaterial } from '@/webgl'`

### 🔗 Node Components (`src/nodes/`)

- **Responsibility**: Individual node implementations that combine domains
- **Hybrid Nature**: Uses audio, flow, and WebGL domains as needed
- **Focused**: Each node encapsulates its specific functionality

### 🔧 Shared Domain (`src/shared/`)

- **Responsibility**: Common utilities, components, and configurations
- **Cross-Domain**: Used by all other domains
- **Foundation**: Provides base functionality for the entire application

## Import Patterns

With the new structure, imports follow clear patterns:

```typescript
// Audio-related imports
import { useToneOscillator } from '@/audio/hooks/useToneOscillator';
import { AudioSlice } from '@/audio/stores/audioSlice';

// Flow-related imports
import { FlowControls } from '@/flow/components/FlowControls';
import { useNodeOperations } from '@/flow/hooks/useNodeOperations';

// WebGL-related imports
import { LineShaderMaterial } from '@/webgl/materials/LineShaderMaterial';

// Shared imports
import { BaseNode } from '@/shared/components/BaseNode';
import { useAppStore } from '@/shared/stores/appStore';
import { GRID_UNIT } from '@/shared/config/grid';
```

## Migration Benefits

1. **Clear Separation of Concerns**: Each domain has a single responsibility
2. **Better Maintainability**: Easier to find and modify domain-specific code
3. **Independent Development**: Teams can work on different domains without conflicts
4. **Improved Testing**: Each domain can be tested in isolation
5. **Better Architecture**: Clear boundaries and dependencies between domains
6. **Scalability**: New features can be added to appropriate domains without affecting others

## Next Steps

- Set up path aliases in `tsconfig.json` for cleaner imports
- Create domain-specific documentation
- Set up domain-specific linting rules
- Consider creating separate test directories for each domain
