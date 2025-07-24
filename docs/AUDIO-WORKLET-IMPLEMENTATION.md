# Audio Worklet Implementation Guide

_Date: July 23, 2025_

This guide documents how audio worklets are implemented in the Reactoscope project. It covers:

- Directory structure and key modules
- Tone.js + Web Audio API integration
- `NoiseNode` (white noise generator)
- `ReactoscopeAudioProcessorNode` (XYRGB vector-scope signal generator)
- Worklet processor code
- React hook integration and data flow

---

## 1. Directory Structure

```
src/
└─ audio/
  ├─ components/            # UI and wrapper components for audio nodes
  ├─ core/                  # Core AudioWorkletNode wrappers
  │  ├─ NoiseNode.ts
  │  ├─ ReactoscopeAudioProcessorNode.ts
  │  ├─ index.ts
  │  └─ worklet/
  │     ├─ NoiseProcessor.worklet.ts
  │     └─ ReactoscopeAudioProcessor.worklet.ts
  ├─ factories/             # Audio node factory functions
  │  └─ audioNodeFactory.ts
  ├─ hooks/                 # React hooks for audio nodes
  │  ├─ useReactoscopeAudioProcessor.ts
  │  └─ useNoiseWorklet.ts
  ├─ stores/                # Zustand store slices for audio context & registry
  │  ├─ audioContextSlice.ts
  │  └─ audioRegistrySlice.ts
  ├─ types/                 # TypeScript types for audio data
  └─ utils/                 # Utility functions (e.g., vertex interpolation)
```

- **core/**: Wraps `AudioWorkletNode` creation & management.
- **core/worklet/**: Raw Worklet processor code as JavaScript strings.
- **hooks/**: React hook for lifecycle & control.

---

## 2. Tone.js + AudioWorklet Integration

Both nodes use **Tone.js**’s audio context to:

1. **Register** the worklet via `context.addAudioWorkletModule(blobURL)`.
2. **Instantiate** the node via `context.createAudioWorkletNode(name, options)`.
3. **Wire** parameters, ports, and connect to Tone.js `Gain` or native routing.

### 2.1 Worklet Module Registration Details

- Build a `Blob` from the worklet source string, setting `type: 'text/javascript'`.
- Generate a temporary URL via `URL.createObjectURL(blob)`.
- Call `Tone.getContext().addAudioWorkletModule(url)` to register; wrap in `try/finally` to always revoke the URL.
- On success, the processor class becomes available under its `workletName`.
- Errors during registration are caught and logged, preventing silent failures.
  This leverages Tone.js scheduling and ensures consistent context management.

### 2.2 Worklet Options & Parameter Setup

- Worklet classes define `static get parameterDescriptors()` that declare AudioParam descriptors: name, defaultValue, minValue, and maxValue.
- Initial parameter values are supplied via the `parameterData` option when creating the node (e.g. `{ amplitude: 0.5 }`, `{ scanRate: 60 }`).
- During runtime, parameters can be automated on the `AudioParam` using methods like `setValueAtTime`, and immediate changes can be communicated over the worklet port via `port.postMessage({ type, value })`.

### 2.3 Worklet Cleanup & Disposal

- Proper disposal prevents memory leaks and dangling worklet instances.
- Wrapper classes typically implement a `.dispose()` method that:
  1. Sends a `{ type: 'stop' }` message if active.
  2. Disconnects the `AudioWorkletNode` and revokes references.
  3. Disposes any associated Tone.js nodes (e.g. `Gain.dispose()`).
  4. Allows the browser to garbage-collect the underlying processor.

---

## 3. `NoiseNode` (White Noise Generator)

### 3.1 Overview

- **File:** `src/audio/core/NoiseNode.ts`
- Generates white noise via an AudioWorkletProcessor.
- Methods: `.start()`, `.stop()`, `.setAmplitude()`.
- Output routed through a `Tone.Gain` node.

### 3.2 Initialization

```ts
constructor(options: NoiseNodeOptions = {}) {
  this.output = new Tone.Gain({ context: Tone.getContext(), gain: 1 });
  this._readyPromise = new Promise(resolve => this._resolveReady = resolve);
  this._initializeWorklet();
  if (options.autostart) this._readyPromise.then(() => this.start());
}
```

1. Create `Tone.Gain` for volume control.
2. Build a `Blob` from `noiseProcessorWorklet` string.
3. Register via `addAudioWorkletModule`.
4. Instantiate node with `parameterData: { amplitude }`.
5. Connect worklet output to `this.output.input`.
6. Resolve a ready promise for deferred `.start()`.

### 3.3 Messaging & Parameters

- **AudioParam** `amplitude` defined in `parameterDescriptors`.
- **Port messages**:
  - `{ type: 'start' }` / `{ type: 'stop' }` to toggle noise.
  - `{ type: 'amplitude', value }` to update amplitude immediately.

```ts
// start generation
this._workletNode.port.postMessage({ type: 'start' });
// update amplitude (param + port)
param.setValueAtTime(...)
this._workletNode.port.postMessage({ type: 'amplitude', value });
```

---

## 4. `ReactoscopeAudioProcessorNode` (XYRGB Scope)

### 4.1 Overview

- **File:** `src/audio/core/ReactoscopeAudioProcessorNode.ts`
- Generates six-channel audio: x, y, r, g, b, z.
- Methods:
  - `.start()`, `.stop()`
  - `.setVertices(vertices)`
  - `.setScanRate(rateHz)`
  - `.setInterpolationSteps(steps)`

### 4.2 Initialization

```ts
constructor(options: ReactoscopeAudioProcessorNodeOptions = {}) {
  this._scanRate = options.scanRate ?? 60;
  this._interpolationSteps = options.interpolationSteps ?? 1;
  this.outputs = {
    x: new Tone.Gain({ context, gain: 1 }),
    …,
    z: new Tone.Gain({ context, gain: 1 }),
  };
  this._readyPromise = new Promise(resolve => this._resolveReady = resolve);
  this._initializeWorklet();
  if (options.autostart) this._readyPromise.then(() => this.start());
}
```

1. Create six `Tone.Gain` outputs.
2. Register `reactoscopeProcessorWorklet` via a Blob + `addAudioWorkletModule`.
3. Instantiate node with `channelCount: 6` and `parameterData: { scanRate }`.
4. Split multichannel output via `ChannelSplitterNode(6)`.
5. Connect each splitter output to its `Tone.Gain` input.
6. Post initial `scanRate` over the message port.

### 4.3 Data Flow & Messaging

- **Vertices**: `.setVertices()` → chunk & interpolate → `port.postMessage({ type: 'vertices', data })`.
- **Scan Rate**: sets `AudioParam` + `port.postMessage({ type: 'scanRate', data })`.
- **Playback**: `.start()` / `.stop()` → `{ type: 'start'| 'stop' }`.

## 5. Migration Plan: Supporting Tone.js PR #1334 Worklet Changes

### Summary of Upcoming Changes

- Tone.js will track worklet module loading promises per context, allowing multiple modules to be loaded independently and synchronously.
- Node creation must be deferred until the worklet module promise resolves.
- The new API uses a WeakMap to avoid duplicate loads and synchronize readiness.

### Migration Steps for Reactoscope

1. **Audit All Worklet Registration Calls**

- Find all usages of `Tone.getContext().addAudioWorkletModule(blobUrl)` and `Tone.getContext().createAudioWorkletNode(...)`.

2. **Update Registration Logic**

- Always await the promise returned by `addAudioWorkletModule`.
- Do not assume immediate processor availability after registration.
- Track promises per context to avoid duplicate loads.

3. **Defer Node Creation**

- Only call `createAudioWorkletNode` after the module promise resolves.
- Refactor constructors or initialization methods to be async, or use a ready promise to signal when the node is available.

4. **Handle Multiple Worklet Modules**

- Ensure each worklet is tracked and loaded independently.
- Use a per-context registry (WeakMap or similar).

5. **Update Disposal Logic**

- Clean up nodes and ensure no unresolved promises or dangling references remain.

6. **Testing**

- Test with the new Tone.js to ensure compatibility and no race conditions.

### Example Refactor (Pseudocode)

```typescript
// Before
await Tone.getContext().addAudioWorkletModule(blobUrl);
const node = Tone.getContext().createAudioWorkletNode(workletName, options);

// After (PR #1334 style)
let workletPromise = workletRegistry.get(context);
if (!workletPromise) {
	workletPromise = context.addAudioWorkletModule(blobUrl);
	workletRegistry.set(context, workletPromise);
}
await workletPromise;
const node = context.createAudioWorkletNode(workletName, options);
```

### Refactor Checklist

- [ ] Refactor all worklet registration logic to use the new promise-based approach.
- [ ] Ensure node creation is deferred until the module is loaded.
- [ ] Track worklet module promises per context.
- [ ] Update disposal logic for clean shutdown.
- [ ] Test thoroughly with the new Tone.js release.
- If inactive or no vertices → write zeros.
- Else for each frame:
  1. Compute `vertexIndex = floor(_index * vertices.length) % length`.
  2. Read `screen.x`, `screen.y`, map color to –1..1.
  3. Compute `z = 1 – screen.z`.
  4. Increment `_index`, wrap at 1.

---

## 5. React Hook Integration

- **File:** `src/audio/hooks/useReactoscopeAudioProcessor.ts`
- On mount: creates `ReactoscopeAudioProcessorNode({ debug: true })`.
- Exposes hook return values:
  - `node`, `isReady`, `isPlaying`
  - `updateVertices(vertices)`, `start()`, `stop()`
  - `setScanRate(rate)`, `setInterpolationSteps(steps)`
  - `ready` promise

```tsx
const { isReady, updateVertices, start } = useReactoscopeAudioProcessor();
// Once ready, call `updateVertices(data)` to feed scene data.
```

---

## 6. Data Flow Diagram

```text
[Scene Vertex Data]
        ↓
 useReactoscopeAudioProcessor.updateVertices(vertices)
        ↓
ReactoscopeAudioProcessorNode
  • chunk & interpolate → port post
        ↓
AudioWorkletProcessor (ReactoscopeProcessor)
  • process frames → 6-channel buffer
        ↓
ChannelSplitterNode(6)
        ↓
Tone.Gain x, y, r, g, b, z
        ↓
Audio Output (speakers)
```

White noise is similar:

```text
Tone.getContext().createAudioWorkletNode('noise-processor')
  • messages control start/stop/amplitude
        ↓
NoiseProcessor.process() → white noise samples
        ↓
Tone.Gain → audio output
```

---

## 7. Summary

- **Dynamic worklet registration** via Blob URLs.
- **Wrapper classes** hide Web Audio boilerplate, integrate with Tone.js.
- **Port messaging & AudioParams** manage runtime control.
- **React hook** simplifies lifecycle & data binding.

This pipeline delivers high-performance, synchronized audio signals for Reactoscope’s audiovisual node editor.

# Plan: New NoiseWorkletNode with Tone.js “external worklet” API

## Goal

Replicate the current white-noise AudioWorklet node (`.start()`, `.stop()`, `.setAmplitude()`, `ready` promise, `output: Tone.Gain`) using the new Tone.js worklet registry and loading strategy.

---

## 1. Create a Worklet Registry Utility (if not already)

- In `src/audio/utils/workletRegistry.ts`, export:
  - A `WeakMap<AudioContext, Map<string, Promise<void>>>`
  - A helper `getWorkletRegistry(context: AudioContext): Map<string,Promise<void>>`
  - An `async ensureWorkletModule(context, name, blobUrl)` that:
    1. Looks up the registry map for this context and worklet name.
    2. If absent, calls `context.audioWorklet.addModule(blobUrl)`, stores the returned promise.
    3. Awaits the promise.

---

## 2. New `NoiseWorkletNode` Class

- File: `src/audio/core/NoiseWorkletNode.ts`

### 2.1 Constructor

1. Build the worklet blob and URL from your existing `noiseProcessorWorklet` string.
2. Call `await ensureWorkletModule(rawContext, workletName, blobUrl)` so the module is guaranteed loaded.
3. Create the `AudioWorkletNode` via `rawContext.createAudioWorkletNode(workletName, { numberOfOutputs:1, outputChannelCount:[1], parameterData:{ amplitude } })`.
4. Connect it into a new `Tone.Gain` (`this.output = new Tone.Gain({ gain: 1, context })`).
5. Store a `ready` promise that resolves once module loading + node creation is done.

### 2.2 API Methods

- `.start()` / `.stop()`: `this._node.port.postMessage({ type:'start' })` etc.
- `.setAmplitude(value)`: update `AudioParam` and send `{ type:'amplitude', value }`
- Getters: `isReady`, `isPlaying`, `amplitude`
- `ready: Promise<void>`
- `.connect(dest)` / `.disconnect()`
- `.dispose()`:
  1. Send stop if playing
  2. Disconnect worklet node
  3. Dispose `Tone.Gain`
  4. Null out references

---

## 3. Integration in Factory & Registry Slice

- In your `audioNodeFactory.createAudioNode('custom-noise', params)` branch:
  - Swap the old `new NoiseNode()` for `new NoiseWorkletNode(params)`.
  - It will handle its own registry‐based module loading.

---

## 4. Testing & Verification

1. Replace all imports of `NoiseNode` with `NoiseWorkletNode`.
2. Start your flow, verify:
   - The worklet module blob URL is loaded once.
   - `.ready` resolves before you `.start()`.
   - No console errors or race conditions.
3. Confirm amplitude control and start/stop via UI work as before.
4. Run automated tests if any; check manual sanity in browser.

---

## 5. Checklist

- [ ] Create `workletRegistry.ts` util
- [ ] Implement `NoiseWorkletNode` using `ensureWorkletModule`
- [ ] Update factory `custom-noise` branch to use the new class
- [ ] Update docs & examples to reference `NoiseWorkletNode`
- [ ] Smoke‐test in browser; validate audio generation
- [ ] Clean up old `NoiseNode` if fully replaced

Once these steps are done, your white-noise worklet will leverage the new Tone.js external-worklet support, avoid duplicate module loads, and play nicely with the updated context API.

# Plan: New NoiseWorkletNode with Tone.js “external worklet” API

## Goal

Replicate the current white-noise AudioWorklet node (`.start()`, `.stop()`, `.setAmplitude()`, `ready` promise, `output: Tone.Gain`) using the new Tone.js worklet registry and loading strategy.

---

## 1. Create a Worklet Registry Utility (if not already)

- In `src/audio/utils/workletRegistry.ts`, export:
  - A `WeakMap<AudioContext, Map<string, Promise<void>>>`
  - A helper `getWorkletRegistry(context: AudioContext): Map<string,Promise<void>>`
  - An `async ensureWorkletModule(context, name, blobUrl)` that:
    1. Looks up the registry map for this context and worklet name.
    2. If absent, calls `context.audioWorklet.addModule(blobUrl)`, stores the returned promise.
    3. Awaits the promise.

---

## 2. New `NoiseWorkletNode` Class

- File: `src/audio/core/NoiseWorkletNode.ts`

### 2.1 Constructor

1. Build the worklet blob and URL from your existing `noiseProcessorWorklet` string.
2. Call `await ensureWorkletModule(rawContext, workletName, blobUrl)` so the module is guaranteed loaded.
3. Create the `AudioWorkletNode` via `rawContext.createAudioWorkletNode(workletName, { numberOfOutputs:1, outputChannelCount:[1], parameterData:{ amplitude } })`.
4. Connect it into a new `Tone.Gain` (`this.output = new Tone.Gain({ gain: 1, context })`).
5. Store a `ready` promise that resolves once module loading + node creation is done.

### 2.2 API Methods

- `.start()` / `.stop()`: `this._node.port.postMessage({ type:'start' })` etc.
- `.setAmplitude(value)`: update `AudioParam` and send `{ type:'amplitude', value }`
- Getters: `isReady`, `isPlaying`, `amplitude`
- `ready: Promise<void>`
- `.connect(dest)` / `.disconnect()`
- `.dispose()`:
  1. Send stop if playing
  2. Disconnect worklet node
  3. Dispose `Tone.Gain`
  4. Null out references

---

## 3. Integration in Factory & Registry Slice

- In your `audioNodeFactory.createAudioNode('custom-noise', params)` branch:
  - Swap the old `new NoiseNode()` for `new NoiseWorkletNode(params)`.
  - It will handle its own registry‐based module loading.

---

## 4. Testing & Verification

1. Replace all imports of `NoiseNode` with `NoiseWorkletNode`.
2. Start your flow, verify:
   - The worklet module blob URL is loaded once.
   - `.ready` resolves before you `.start()`.
   - No console errors or race conditions.
3. Confirm amplitude control and start/stop via UI work as before.
4. Run automated tests if any; check manual sanity in browser.

---

## 5. Checklist

- [ ] Create `workletRegistry.ts` util
- [ ] Implement `NoiseWorkletNode` using `ensureWorkletModule`
- [ ] Update factory `custom-noise` branch to use the new class
- [ ] Update docs & examples to reference `NoiseWorkletNode`
- [ ] Smoke‐test in browser; validate audio generation
- [ ] Clean up old `NoiseNode` if fully replaced

Once these steps are done, your white-noise worklet will leverage the new Tone.js external-worklet support, avoid duplicate module loads, and play nicely with the updated context
