# Shared tap+readout hook for Analysis nodes

Tier 1 shipped four Analysis nodes (FFT, Meter, DCMeter, Waveform) that each pass audio through
unchanged and poll a `getValue()`-family method via their own `requestAnimationFrame` loop,
duplicated near-identically across `FFTNode.tsx`/`MeterNode.tsx`/`DCMeterNode.tsx`/
`WaveformNode.tsx`. Tier 2 adds a fifth, Analyser. Rather than add a fifth bespoke copy, we're
extracting a shared hook that owns the rAF polling loop and returns the latest value; each node
keeps its own draw/render logic (bar spectrum, line waveform, needle meter, etc. genuinely
differ), and the four existing nodes get refactored onto it in the same batch. Five instances of
the same polling loop is the point where the duplication risk (one copy silently drifting from
the other four) outweighs the cost of the refactor touching already-shipped files.
