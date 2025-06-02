# React Flow State Migration Plan

## Objective

Replace Zustand's custom flow state management with React Flow's built-in `useNodesState` and `useEdgesState` hooks while preserving all existing functionality.

## Migration Strategy

### Phase 1: Prepare React Flow State Hooks ✅ READY

1. Update `App.tsx` to use React Flow's native state hooks
2. Create a bridge pattern to maintain compatibility during transition

### Phase 2: Remove Zustand Flow Dependencies

1. Update components that depend on Zustand flow state
2. Remove flow-related actions from Zustand store
3. Update `useFlow.ts` to work with React Flow state

### Phase 3: Clean Up

1. Remove unused flow state from Zustand
2. Remove custom handle position management
3. Remove complex synchronization logic

## What Stays in Zustand

- `themeSlice.ts` - Theme management ✅
- `uiSlice.ts` - UI interaction state ✅
- `audioSlice.ts` - Audio state and connections ✅

## What Moves to React Flow

- `nodes` array - Now managed by `useNodesState`
- `edges` array - Now managed by `useEdgesState`
- Node/edge change handlers - Now using React Flow's built-in callbacks

## What Gets Removed

- `nodeHandlePositions` - React Flow handles this internally
- `gridHandles` - Replaced by React Flow's native handle system
- Complex caching and synchronization logic
- Custom `applyNodesChange`/`applyEdgesChange` actions

## Files to Modify

1. `src/App.tsx` - Primary entry point
2. `src/hooks/useFlow.ts` - Simplify to bridge pattern
3. `src/stores/slices/flowSlice.ts` - Remove flow state
4. `src/stores/types.ts` - Update type definitions
5. Components using flow state - Update imports

## Implementation Steps

Ready to proceed with Phase 1...
