# Shared tap+readout hook for canvas-drawing Analysis nodes

Tier 1 shipped four Analysis nodes that each pass audio through unchanged and poll a
`getValue()`-family method for a live readout, but they split into two genuinely different
rendering shapes, not one: FFT and Waveform each run their own `requestAnimationFrame` loop that
draws straight to a `<canvas>`, bypassing React state entirely for frame-rate reasons; Meter and
DCMeter instead poll via `setInterval(100ms)`, feeding a numeric readout and an `HwLevelMeter` bar
through plain React state. On inspection these aren't one duplicated pattern, they're two — and
only the first (FFT/Waveform) is what Analyser needs, since Analyser's `type` param toggles
between drawing an FFT spectrum and a waveform line, i.e. it's the union of exactly what FFT and
Waveform already each do.

We're extracting a shared hook for the rAF+canvas shape only — it owns the polling loop and
returns the latest value, each node keeps its own draw call (bar spectrum vs line trace) — and
refactoring `FFTNode.tsx`/`WaveformNode.tsx` onto it alongside building `AnalyserNode.tsx` on the
same hook. `MeterNode.tsx`/`DCMeterNode.tsx` are left as they are: forcing their
setInterval+React-state pattern into the same abstraction as the canvas one would be unifying two
things that only superficially look alike, not removing real duplication.
