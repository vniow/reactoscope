# WaveShaper ships preset-driven, not a curve editor

Tone.js's `WaveShaper.mapping` is a JS function or raw sample array, not a slider-able value —
there's no numeric range to expose. v1 ships three named curve presets (identity, soft clip, hard
clip) via a dropdown, plus a live `oversample` (none/2x/4x) setter. Building an actual curve editor
(freehand or control-point curve drawing) is out of scope; presets cover the common
distortion/saturation use case without inventing a new curve-editing UI from scratch.

This establishes a pattern distinct from every other dropdown in the codebase. Filter's `type`
dropdown, for example, is a live Tone.js `Param`/getter-setter the UI reads back and displays —
the dropdown's value *is* the persisted state. WaveShaper's dropdown value is just a preset
*name*, stored in node data purely for serialization/redraw; selecting a preset triggers an
imperative `setMap()` call rather than setting a watched param directly. Worth recording explicitly
so a future curve/shape-selection node (there's real precedent coming — Sampler's note-to-buffer
mapping, Pattern's cycling algorithms) reuses this preset-name-drives-imperative-call shape rather
than reinventing it, and so a reader diffing this against Filter's dropdown doesn't wonder why
WaveShaper's "doesn't work like the others."
