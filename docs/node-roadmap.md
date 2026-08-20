# Node implementation roadmap

Reference catalogue for the remaining Tone.js-backed node types in reactoscope. `Source` and
`Effect` (the two largest catalogue categories) are **fully implemented** already — everything
left lives in `Dynamics`, `Processing`, `Analysis`, `Signal`, `Instrument`, and `Event`.

## How to use this doc

This is a flat reference, not a build plan — there's no imposed phase order. Pick whatever
you're in the mood to build. When you're ready to build one, turn its entry into a GitHub issue
(`ready-for-agent` once you're confident it's fully specified — see
`docs/agents/issue-tracker.md`).

Every entry below was written against the exact installed Tone.js version
(`node_modules/tone`, v15.1.22) — read the `.d.ts` path given if you want to verify or dig
deeper, don't trust the numbers here blindly if the Tone.js dependency has since been upgraded.

## Legend

**Complexity tier** — a rough sense of how much new plumbing a node needs, not raw param count:

- **Tier 1** — standard 1-in/1-out (or already-solved multi-io) topology, few/no params, no new
  UI pattern required. Fastest to build.
- **Tier 2** — more params (enums, multiple sliders) or a topology already proven by an existing
  stub/implemented node, but still following established conventions.
- **Tier 3** — needs a UI or wiring pattern that doesn't exist anywhere in the codebase yet
  (nested param panels, non-standard connection points, async file loading, global
  cross-instance state, polling readouts, curve editors). Build one of these to *establish* the
  pattern, then the rest in its family drop a tier.

**Classification** — how the node behaves in the graph:

- **Source** — emits signal, no audio input (matches `makeSingleUseSourceHandler` pattern if it
  can only run once — see `src/audio/nodes/singleUseSource.ts`).
- **Processor** — takes audio in, transforms it, passes it on. The overwhelming majority of what
  follows.
- **Tap** — passes audio through unchanged, exposes a read value for the UI (`getValue()`-style).
  No existing implemented node does this yet; see the "Tap + readout" note under Analysis.
- **Sink** — takes audio in, has no audio output. Terminal node.

**Topology** — described as handle counts (`in-0`, `in-1`, ... / `out-0`, `out-1`, ...), per the
convention in `src/audio/nodes/nodeHandler.ts`. Where `StubNode.tsx`'s `STUB_TOPOLOGY` map
already has an entry for a kind, that's called out explicitly since it's an existing contract the
handler must satisfy.

---

## Scene / geometry authoring (not started — known future direction)

Everything below this point is about the audio-processing side of the graph. There is currently
**no node type that generates or manipulates 3D scene geometry at all.** `SceneInputPanel`
(`src/daw/panels/InputPanel.tsx`) hard-codes a single wireframe cube — built once at module load,
colored by position — as the only thing `useSceneToAudio`/`collectSegments` ever scans. The
`sceneInput` node in the graph wraps this fixed scene's audio lifecycle; it doesn't source
geometry from the graph itself.

A real shape-authoring story — node types that generate or import geometry (parametric curves,
Lissajous generators, primitive shapes, imported meshes) and feed `Scene Input`, replacing the
hardcoded cube — is a known future direction, not a rejected idea. Not scoped or sequenced yet.
See `docs/architecture-comparison.md` for how the two reference projects handle this differently
(vectorsynthesis: static per-shape wavetables authored offline; xyscope.js: no shape concept at
all, just whatever audio already exists) — reactoscope's live-scene-graph model doesn't have a
direct precedent in either, so this will likely need its own design pass when it's picked up.
Per-vertex color already flows correctly through `collectSegments` once real geometry exists
(`geometry.attributes.color`) — no separate color-mode work is needed once shape-authoring nodes
land.

---

## Dynamics (5 nodes)

### Compressor (`compressor`) — Tier 2
- **Tone.js**: `Compressor` — `component/dynamics/Compressor.d.ts`
- **Params**:

  | name | type | default | range |
  |---|---|---|---|
  | threshold | dB | -24 | -100 to 0 |
  | ratio | number | 12 | 1–20 |
  | attack | s | 0.003 | 0–1 |
  | release | s | 0.25 | 0–1 |
  | knee | dB | 30 | 0–40 |

- **Topology**: `in-0` → `out-0`.
- **Notes**: read-only `reduction` getter (dB gain-reduction telemetry) — no UI control needed for
  v1, but a natural fit for a live meter readout later. `threshold`/`ratio`/`attack`/`release`/
  `knee` are plain getter/setters, write directly (not `.value`).

### Limiter (`limiter`) — Tier 1
- **Tone.js**: `Limiter` — `component/dynamics/Limiter.d.ts`
- **Params**: `threshold` (dB, default -12, range -60 to 0).
- **Topology**: `in-0` → `out-0`.
- **Notes**: internally just a `Compressor` pinned to `ratio: 20` with fast attack/release not
  exposed — same "wraps another node's class, pins some params" pattern as `delay.ts`'s
  FeedbackDelay. Build after Compressor if you want the pattern fresh.

### Gate (`gate`) — Tier 1
- **Tone.js**: `Gate` — `component/dynamics/Gate.d.ts`
- **Params**: `threshold` (dB, default -40, range -100 to 0), `smoothing` (s, default 0.1, range
  0–1).
- **Topology**: `in-0` → `out-0`.
- **Notes**: plain getter/setters, not `Param`/`Signal` objects — write directly.

### MidSideCompressor (`midSideCompressor`) — Tier 3
- **Tone.js**: `MidSideCompressor` — `component/dynamics/MidSideCompressor.d.ts`
- **Params**: nested `mid.*` / `side.*`, each a full Compressor param set (threshold, ratio,
  attack, release, knee) — 10 params total. Defaults: mid threshold -24 / side -30, mid ratio 3 /
  side 6, mid attack 0.02 / side 0.03, mid release 0.03 / side 0.25, mid knee 16 / side 10 (all
  same ranges as Compressor above).
- **Topology**: `in-0` → `out-0` at the handle level (internally `MidSideSplit` in,
  `MidSideMerge` out), but **requires a genuinely stereo input signal** — mid/side encoding is
  meaningless on mono. Flag this requirement in the node's UI/docs.
- **Notes**: `mid`/`side` are read-only child `Compressor` instances
  (`e.toneNode.mid.threshold.value = ...`) — this is the first node needing a **nested/grouped
  param panel** rather than a flat control list. Establishes that UI pattern for
  MultibandCompressor below.

### MultibandCompressor (`multibandCompressor`) — Tier 3
- **Tone.js**: `MultibandCompressor` — `component/dynamics/MultibandCompressor.d.ts`
- **Params**: `lowFrequency` (Hz, default 250, range 20–2000), `highFrequency` (Hz, default 2000,
  range 200–20000), plus `low.*`/`mid.*`/`high.*` — full Compressor param sets per band (15 more
  params). Heaviest param surface in this batch — **recommend v1 UI exposes only
  threshold + ratio per band**, defaulting attack/release/knee, rather than 17 live controls.
- **Topology**: `in-0` → `out-0` (internally splits via `MultibandSplit`, recombines via `Gain`).
- **Notes**: `lowFrequency`/`highFrequency` are `Signal<"frequency">` (`.value` write); `low`/
  `mid`/`high` are read-only child `Compressor` instances, same nested-panel need as
  MidSideCompressor.

---

## Processing (15 nodes — `Gain` already implemented)

### Filter (`filter`) — Tier 2
- **Tone.js**: `Filter` — `component/filter/Filter.d.ts`
- **Params**: `frequency` (Hz, default 350, range 20–20000), `type` (enum: lowpass/highpass/
  bandpass/lowshelf/highshelf/notch/allpass/peaking, default lowpass), `rolloff` (enum: -12/-24/
  -48/-96, default -12), `Q` (default 1, range 0.001–100), `detune` (cents, default 0, range
  -1200–1200), `gain` (dB, default 0, range -40–40, only meaningful for lowshelf/highshelf/
  peaking).
- **Topology**: `in-0` → `out-0`. Already present as a `StubKind` (`'filter'`), no
  `STUB_TOPOLOGY` override — default 1-in/1-out is correct.
- **Notes**: `rolloff` setter rebuilds an internal cascade of native `BiquadFilterNode`s to
  achieve steeper-than-12dB/oct response — cheap but not instantaneous like the other params.

### BiquadFilter (`biquadFilter`) — Tier 1
- **Tone.js**: `BiquadFilter` — `component/filter/BiquadFilter.d.ts`
- **Params**: same shape as Filter minus `rolloff` — `frequency`, `type`, `Q`, `detune`, `gain`.
- **Topology**: `in-0` → `out-0`.
- **Notes**: direct thin wrapper around native `BiquadFilterNode` — simpler handler than Filter's,
  build this one first if you want the filter-family pattern without the rolloff complication.

### EQ3 (`eq3`) — Tier 2
- **Tone.js**: `EQ3` — `component/filter/EQ3.d.ts` (lives under `filter/`, not `channel/`, despite
  being a channel-strip EQ).
- **Params**: `low`/`mid`/`high` (dB, default 0, range -40–40 each), `lowFrequency` (Hz, default
  400, range 20–2000), `highFrequency` (Hz, default 2500, range 200–20000).
- **Topology**: `in-0` → `out-0` (internal `MultibandSplit` + summing `Gain`).
- **Notes**: `low`/`mid`/`high` are `Param<"decibels">` (`.value` write); `lowFrequency`/
  `highFrequency` are `Signal` (`.value` write). Internal crossover `Q` is fixed at 1, not
  exposed.

### Channel (`channel`) — Tier 3
- **Tone.js**: `Channel` — `component/channel/Channel.d.ts`
- **Params**: `volume` (dB, default 0, range -60–6), `pan` (default 0, range -1–1), `mute`
  (boolean, default false), `solo` (boolean, default false).
- **Topology**: `in-0` → `out-0`.
- **Notes**: soloing this node mutes every *other* `Channel`/`Solo` instance sharing the audio
  context (`Channel`/`Solo` share a static registry) — real cross-instance mutable state, not
  local param state. A UI toggle here needs to update other node components' displayed
  muted-status too. Also exposes `send(name, volume)`/`receive(name)` bus routing — worth a
  footnote, out of scope for v1 params. Internally composed of `Solo` → `PanVol`.

### PanVol (`panVol`) — Tier 1
- **Tone.js**: `PanVol` — `component/channel/PanVol.d.ts`
- **Params**: `pan` (default 0, range -1–1), `volume` (dB, default 0, range -60–6), `mute`
  (boolean, default false).
- **Topology**: `in-0` → `out-0`.
- **Notes**: Channel minus solo/send/receive — simplest of the channel-strip family, good
  candidate to build before Channel/Solo/Volume.

### Panner (`panner`) — Tier 3
- **Tone.js**: `Panner` — `component/channel/Panner.d.ts`
- **Params**: `pan` (default 0, range -1–1) — single control, simplest param-wise in the batch.
- **Topology**: **`STUB_TOPOLOGY` explicit entry**: `in-0` → `out-0`, `out-1`. This is a
  reactoscope design choice, not native to Tone — `Panner` wraps a single stereo
  `StereoPannerNode` output, it doesn't expose separate L/R taps. The handler will need to
  internally `Split` the Panner's output to satisfy the existing two-output contract.
- **Notes**: topology is the most involved part of this one despite the trivial param surface.

### Panner3D (`panner3d`) — Tier 3
- **Tone.js**: `Panner3D` — `component/channel/Panner3D.d.ts`
- **Params**: large surface — `positionX/Y/Z` (default 0/0/0), `panningModel` (enum: equalpower/
  HRTF, default equalpower). **Recommend v1 UI exposes only these 4** and defaults the rest
  (`orientationX/Y/Z`, `distanceModel`, `refDistance`, `maxDistance`, `rolloffFactor`,
  `coneInnerAngle/OuterAngle/OuterGain`) rather than ~14 live controls.
- **Topology**: `in-0` → `out-0` (wraps native `PannerNode`).
- **Notes**: `positionX/Y/Z`/`orientationX/Y/Z` are `Param<"number">` (`.value` write); the rest
  are plain getter/setters.

### CrossFade (`crossFade`) — Tier 3
- **Tone.js**: `CrossFade` — `component/channel/CrossFade.d.ts`
- **Params**: `fade` (default 0.5, range 0–1).
- **Topology**: **`STUB_TOPOLOGY` explicit entry, confirmed exact match**: `in-0`, `in-1` →
  `out-0`.
- **Notes**: `input` is literally `undefined` on the Tone class — there is no single input to
  connect. The handler must wire `in-0` → `toneNode.a` and `in-1` → `toneNode.b` directly, not a
  generic `toneNode.input`. `fade` is a `Signal<"normalRange">`.

### Split (`split`) — Tier 1
- **Tone.js**: `Split` — `component/channel/Split.d.ts`
- **Params**: none worth exposing (`channels`, default 2, is construction-time only).
- **Topology**: **`STUB_TOPOLOGY` explicit entry, confirmed exact match**: `in-0` → `out-0`,
  `out-1`.
- **Notes**: native `ChannelSplitterNode` wrapper — trivial handler, no `setAudioParam` body
  needed.

### Merge (`merge`) — Tier 1
- **Tone.js**: `Merge` — `component/channel/Merge.d.ts`
- **Params**: none worth exposing.
- **Topology**: **`STUB_TOPOLOGY` explicit entry, confirmed exact match**: `in-0`, `in-1` →
  `out-0`.
- **Notes**: native `ChannelMergerNode` wrapper. `.connect(merge, outputIndex, inputIndex)`
  matters for which physical channel a source lands on — map `in-0`/`in-1` to `inputIndex` 0/1
  respectively.

### Mono (`mono`) — Tier 1
- **Tone.js**: `Mono` — `component/channel/Mono.d.ts`
- **Params**: none — `MonoOptions` adds nothing beyond base options.
- **Topology**: `in-0` → `out-0`.
- **Notes**: zero-param structural node, duplicates its mono input to both channels of an
  internal `Merge`. Trivial handler like Split/Merge.

### MultibandSplit (`multibandSplit`) — Tier 2
- **Tone.js**: `MultibandSplit` — `component/channel/MultibandSplit.d.ts`
- **Params**: `lowFrequency` (Hz, default 400, range 20–2000), `highFrequency` (Hz, default 2500,
  range 200–20000), `Q` (default 1, range 0.1–10).
- **Topology**: **`STUB_TOPOLOGY` explicit entry, confirmed exact match**: `in-0` → `out-0`
  (low), `out-1` (mid), `out-2` (high).
- **Notes**: `output` is `undefined` on the Tone class (same shape as CrossFade) — the handler
  must track `.low`/`.mid`/`.high` as three separate output refs, not one `toneNode.output`.

### Solo (`solo`) — Tier 2
- **Tone.js**: `Solo` — `component/channel/Solo.d.ts`
- **Params**: `solo` (boolean, default false).
- **Topology**: `in-0` → `out-0`.
- **Notes**: same cross-instance side-effect behavior called out under Channel — a static
  registry mutes every other `Solo`/`Channel` instance in the context when one is soloed. Simple
  to implement (one shared registry) but genuinely new state-sharing behavior, unlike every other
  node's purely local params.

### Volume (`volume`) — Tier 1
- **Tone.js**: `Volume` — `component/channel/Volume.d.ts`
- **Params**: `volume` (dB, default 0, range -60–6), `mute` (boolean, default false).
- **Topology**: `in-0` → `out-0`.
- **Notes**: `volume` is dB-scaled (a `Param<"decibels">` on an internal `Gain`), not the linear
  0–2 factor `GainNodeData` uses — don't reuse `GainNodeData`'s convention here by mistake,
  they're different units.

### Convolver (`convolver`) — Tier 2
- **Tone.js**: `Convolver` — `component/filter/Convolver.d.ts`
- **Params**: `normalize` (boolean, default true), `url` (string/AudioBuffer — an impulse-response
  file, not a numeric slider).
- **Topology**: `in-0` → `out-0`.
- **Notes**: needs an impulse-response file loaded asynchronously (`load(url): Promise<void>`,
  or an `onload` constructor callback) before it's audible — no synchronous default the way
  Reverb auto-`generate()`s. Reuse the async-URL-loading pattern already established by
  `GrainPlayerNodeData`/`player.ts`'s `trackUrl` rather than inventing a new one. Ship either a
  bundled default IR asset or start silent until the user picks a file. `buffer` getter/setter
  also exists for swapping IRs post-construction.

---

## Analysis (7 buildable — AmplitudeEnvelope/FrequencyEnvelope moved to Blocked, see below)

All five of Analyser/FFT/Meter/DCMeter/Waveform share one shape: **pass-through tap** (`in-0` →
`out-0`, audio unchanged) plus a `getValue()`-family read method with **no push/subscribe API** —
a live UI readout requires polling (rAF or interval). None of this exists in the codebase yet.
**Recommend building Analyser first to establish one shared "tap + readout" UI component**, then
FFT/Meter/DCMeter/Waveform become straightforward reuses of it — that's why they're tiered lower
than Analyser despite similar param counts.

### Analyser (`analyser`) — Tier 2
- **Tone.js**: `Analyser` — `component/analysis/Analyser.d.ts`
- **Params**: `size` (power-of-two, default 1024, range 16–16384 — a stepped dropdown, not a
  slider), `type` (enum: fft/waveform, default fft), `smoothing` (default 0.8, range 0–1).
- **Topology**: tap, `in-0` → `out-0` + readout.
- **Notes**: `getValue()` returns `Float32Array`; this is the general-purpose primitive Tone's own
  `Meter`/`FFT`/`Waveform` are built on internally. `channels` is constructor-only, no live
  setter.

### FFT (`fft`) — Tier 1
- **Tone.js**: `FFT` (extends `MeterBase`) — `component/analysis/FFT.d.ts`
- **Params**: `size` (power-of-two, default 1024, range 16–16384), `smoothing` (default 0.8,
  range 0–1), `normalRange` (boolean, default false — toggles dB output vs 0–1).
- **Topology**: tap, `in-0` → `out-0` + readout.
- **Notes**: `getValue()` → one dB (or 0–1) value per frequency bin; `getFrequencyOfIndex(index)`
  maps bin→Hz for labeling a spectrum display. Internally wraps `Analyser` in `"fft"` mode.

### Meter (`meter`) — Tier 1
- **Tone.js**: `Meter` (extends `MeterBase`) — `component/analysis/Meter.d.ts`
- **Params**: `smoothing` (default 0.8, range 0–1), `normalRange` (boolean, default false).
- **Topology**: tap, `in-0` → `out-0` + readout.
- **Notes**: `getValue()` → RMS level. Use `getValue()`, **not** `getLevel()` — the latter is
  deprecated in v15. Natural fit for a VU-meter-style bar widget.

### DCMeter (`dcMeter`) — Tier 1
- **Tone.js**: `DCMeter` (extends `MeterBase`) — `component/analysis/DCMeter.d.ts`
- **Params**: none.
- **Topology**: tap, `in-0` → `out-0` + readout.
- **Notes**: simplest of the meters — `getValue()` returns the raw instantaneous sample value
  (not RMS), no smoothing/normalRange options at all. Good fit for checking DC offset on the
  scope-driving six-channel bus.

### Waveform (`waveform`) — Tier 1
- **Tone.js**: `Waveform` (extends `MeterBase`) — `component/analysis/Waveform.d.ts`
- **Params**: `size` (power-of-two, default 1024, range 16–16384).
- **Topology**: tap, `in-0` → `out-0` + readout.
- **Notes**: `getValue()` returns one raw sample per array index (not FFT). This is the closest
  Tone.js primitive to reactoscope's own domain concept "Waveform Tap" (see `CONTEXT.md`) — worth
  naming this node something that won't collide/confuse with that existing glossary term (e.g.
  keep the catalogue label `Waveform` but disambiguate in any UI copy).

### Follower (`follower`) — Tier 2
- **Tone.js**: `Follower` — `component/analysis/Follower.d.ts`
- **Params**: `smoothing` (Time in seconds, no stated numeric default in the `.d.ts` — treat as
  ~0.05s, sensible UI range 0.001–1).
- **Topology**: `in-0` → `out-0` — **not a tap**. Unlike the other five Analysis nodes, Follower
  has no `getValue()` — it outputs a real continuous envelope-follower signal (internally `Abs →
  OnePoleFilter`) meant to be wired into another node like any other processor.
- **Notes**: despite living in the "Analysis" catalogue bucket, build this like a normal
  processor handler (`gain.ts`-shaped), not like the tap pattern above.

### Recorder (`recorder`) — Tier 3
- **Tone.js**: `Recorder` — `component/channel/Recorder.d.ts`
- **Params**: `mimeType` (string, default browser-chosen, e.g. `"audio/webm"` — low-priority
  dropdown).
- **Topology**: **sink** — `in-0` only, **no output**. Cannot chain further downstream.
- **Notes**: wraps `MediaRecorder`, explicitly **not sample-accurate** per Tone.js's own docs.
  Needs an async `start()`/`stop(): Promise<Blob>`/`pause()`/`state` lifecycle — distinct from
  `NodeTypeHandler.start/stop` (today only used for single-use *sources*) and distinct from the
  Envelope trigger problem below. Gate UI availability on the `Recorder.supported` static getter.
  The node's "readout" is a downloadable Blob/anchor link, not a numeric display.

---

## Signal (11 nodes)

### Signal (`signal`) — Tier 1
- **Tone.js**: `Signal` — `signal/Signal.d.ts`
- **Params**: `value` (number, default 0, range depends on chosen `units` — start with a plain
  numeric range like -1000 to 1000).
- **Topology**: `in-0` → `out-0`.
- **Notes**: this is the base class `dcSignal.ts` already wraps (with `units: 'audioRange'`) — as
  a standalone catalogue node it would duplicate DCSignal unless exposed with a different `units`
  choice (e.g. `"frequency"`, `"time"`) to support typed modulation targets. v1 exposure is just
  `.value`; full scheduling API (`rampTo`, etc.) is out of scope for now.

### WaveShaper (`waveShaper`) — Tier 3
- **Tone.js**: `WaveShaper` — `signal/WaveShaper.d.ts`
- **Params**: `mapping` is a JS function/array, not slider-able — realistic v1 exposure is a small
  set of **named curve presets** (e.g. "identity", "soft clip", "hard clip") that internally call
  `setMap()`. `oversample` (enum: none/2x/4x) is a live setter, not a constructor option.
- **Topology**: `in-0` → `out-0`.
- **Notes**: needs a new UI pattern (preset dropdown driving a function, not a plain param) —
  nothing in the codebase does this yet. Used internally by `Abs`/`AudioToGain`/`GainToAudio`
  below.

### Scale (`scale`) — Tier 1
- **Tone.js**: `Scale` — `signal/Scale.d.ts`
- **Params**: `min` (default 0, range -100–100), `max` (default 1, range -100–100).
- **Topology**: `in-0` → `out-0`.
- **Notes**: linear NormalRange→[min,max] remap, internally `Multiply` + `Add`. Straightforward.

### ScaleExp (`scaleExp`) — Tier 1
- **Tone.js**: `ScaleExp` (extends `Scale`) — `signal/ScaleExp.d.ts`
- **Params**: `min`, `max` (same as Scale) + `exponent` (default 1, range 0.1–8).
- **Topology**: `in-0` → `out-0`.

### Abs (`abs`) — Tier 1
- **Tone.js**: `Abs` — `signal/Abs.d.ts`
- **Params**: none.
- **Topology**: `in-0` → `out-0`.
- **Notes**: pure `|x|` via internal WaveShaper. No sliders needed.

### Negate (`negate`) — Tier 1
- **Tone.js**: `Negate` — `signal/Negate.d.ts`
- **Params**: none.
- **Topology**: `in-0` → `out-0`.
- **Notes**: `x * -1` internally via `Multiply`. No sliders needed.

### AudioToGain (`audioToGain`) — Tier 1
- **Tone.js**: `AudioToGain` — `signal/AudioToGain.d.ts`
- **Params**: none.
- **Topology**: `in-0` → `out-0`.
- **Notes**: converts AudioRange [-1,1] → NormalRange [0,1]. Pairs with GainToAudio.

### GainToAudio (`gainToAudio`) — Tier 1
- **Tone.js**: `GainToAudio` — `signal/GainToAudio.d.ts`
- **Params**: none.
- **Topology**: `in-0` → `out-0`.
- **Notes**: inverse of AudioToGain, NormalRange [0,1] → AudioRange [-1,1].

### Add (`add`) — Tier 2
- **Tone.js**: `Add` (extends `Signal`) — `signal/Add.d.ts`
- **Params**: `value` (default 0, range -100–100 — the constant addend).
- **Topology**: `in-0` → `out-0` for v1.
- **Notes**: Tone's `addend` is a `Param<"number">` — settable via slider **or** connectable by
  wiring another node into it (`.connect(add.addend)`), which is a different attachment point
  than the standard `in-N → toneNode.input` convention every other node uses. **v1: ship as a
  single audio-in + `value` slider** (matches the `gain.ts` pattern exactly). **v2 stretch**:
  expose a second handle wired specifically to `.addend` for true two-signal addition — flag this
  explicitly as a deviation from the standard wiring rule in `nodeHandler.ts`, don't build it
  silently.

### Multiply (`multiply`) — Tier 2
- **Tone.js**: `Multiply` (extends `Signal`) — `signal/Multiply.d.ts`
- **Params**: `value` (default 0, range -100–100 — the constant multiplicand).
- **Topology**: `in-0` → `out-0` for v1.
- **Notes**: same `Param`-vs-`InputNode` caveat as Add — the second operand is `.factor`, a
  `Param`. Same v1 (slider)/v2 (second-handle-to-`.factor`) split.

### GreaterThan (`greaterThan`) — Tier 2
- **Tone.js**: `GreaterThan` (extends `Signal`) — `signal/GreaterThan.d.ts`
- **Params**: `value` (default 0, range -100–100 — the comparison threshold).
- **Topology**: `in-0` → `out-0` for v1.
- **Notes**: same `Param` pattern, threshold operand is `.comparator`. Outputs strictly 1 or 0 (a
  binary gate signal) — worth remembering if a future "trigger/gate" mechanism gets designed for
  the blocked Envelope/Instrument nodes below, this could become a building block for it.

---

## Blocked — needs a trigger/schedule model that doesn't exist yet (18 nodes)

Reactoscope's audio engine has **no concept of note-triggering or `Tone.Transport` scheduling**
anywhere (`grep -rn "triggerAttack\|Transport\|triggerRelease" src/audio/nodes/*.ts` turns up
nothing but a comment in `player.ts` explaining Transport is deliberately avoided — an earlier
version that used it as a shared clock caused starting one Player to reset every other Player's
position readout). Every existing source is continuous and always-on. These 18 node kinds are
fundamentally trigger- or schedule-driven in Tone.js and don't fit that model. Documented here for
completeness, not full-specced — building any of these first requires designing a trigger/gate
concept for the graph (what would a "trigger" edge/handle even look like?), which is a separate
design effort.

### Instrument family (11) — all need `triggerAttack(note, time?, velocity?)` / `triggerRelease`

- **Synth** — basic subtractive voice (oscillator → amplitude envelope). Base voice type the rest
  compose or extend.
- **MonoSynth** — Synth + filter, separate amp/filter envelopes.
- **PolySynth** — voice-allocation manager wrapping N instances of *any* Monophonic voice
  (default `Synth`) — depends transitively on whichever voice type it wraps.
- **FMSynth** / **AMSynth** — each internally composes two `Synth` instances (carrier +
  modulator).
- **DuoSynth** — composes two `MonoSynth` instances in parallel.
- **MembraneSynth** — kick/tom drum voice, extends Synth directly with a pitch-sweep envelope.
- **MetalSynth** — inharmonic/metallic percussion, FM oscillator array through a highpass filter.
- **NoiseSynth** — percussive noise hit, no pitch concept, `triggerAttack(time?, velocity?)` (no
  note argument).
- **PluckSynth** — Karplus-Strong plucked string via noise burst + feedback comb filter.
- **Sampler** — note-to-buffer map, retunes/repitches the nearest sample for unmapped notes.
  **Partially separable**: its multi-buffer loading (`urls`/`baseUrl` → per-note `ToneAudioBuffer`
  map, `loaded` state, `add(note, url)`) is the same shape as `player.ts`'s existing single-buffer
  `trackUrl` loading, just generalized to multiple named buffers — that loading/caching piece
  could reasonably be built and tested independently of the trigger question. Only
  `triggerAttack`/`triggerRelease`/`triggerAttackRelease` playback is actually blocked.

### Event family (5) — Transport-scheduled callbacks, not note-triggered

- **Loop** — repeats an arbitrary callback at a fixed interval via `start()`/`stop()`/`interval`.
  **Least blocked of the whole group** — it has no note/instrument-targeting concept at all, just
  a generic callback plus Transport sync. If reactoscope ever adds *minimal* Transport support
  (even without instrument triggering), Loop could plausibly be unblocked before anything else
  here.
- **ToneEvent** — base primitive wrapping a single Transport-scheduled callback + payload value;
  `Sequence` and `Part` both extend it directly.
- **Part** — a collection of arbitrary `[time, value]` events treated as one startable/stoppable
  unit. `Sequence` internally builds a `Part` to do its actual scheduling — Part is the more
  fundamental of the two.
- **Sequence** — evenly-subdivided step-sequencer notation (nested arrays for subdivisions),
  builds a `Part` internally.
- **Pattern** — arpeggiator; extends `Loop` (not `ToneEvent`), cycles a fixed value array by a
  named pattern algorithm (up/down/random/etc.) each interval tick.

### Envelope pair (2) — same trigger blocker as Instrument, different topology

- **AmplitudeEnvelope** (`amplitudeEnvelope`) — `in-0`/`out-0`, applies an ADSR envelope to
  incoming audio amplitude. Silent forever without a `triggerAttack`/`triggerRelease` call site.
- **FrequencyEnvelope** (`frequencyEnvelope`) — **no audio input**, `out-0` only — a
  source-like modulation signal (topology mirrors LFO/DCSignal: 0 in, 1 out) meant to be wired
  into another node's frequency param. Same trigger blocker as above, but don't document it with
  the same 1-in/1-out shape as AmplitudeEnvelope — they diverge.

Both were originally scoped as normal buildable Analysis nodes; moved here after confirming
neither can produce any output without triggering, which nothing in the current graph model
supports.

---

## Cross-cutting notes

- **Tap + readout pattern** (Analyser, FFT, Meter, DCMeter, Waveform): build one shared UI
  component/hook for "pass audio through unchanged, poll a `getValue()`-family method for a live
  readout" rather than one bespoke implementation per node — all five share the exact shape.
- **Param-as-second-input pattern** (Add, Multiply, GreaterThan): Tone.js's second operand for
  these is a `Param` (`.addend`/`.factor`/`.comparator`), not a second `InputNode` the way
  `Merge`/`CrossFade` use. Ship v1 as slider-only; treat true two-signal wiring as a deliberate
  future extension to the handle→input convention in `nodeHandler.ts`, not something to bolt on
  silently.
- **Global cross-instance state** (Solo, and `Channel`'s built-in solo): soloing one instance
  mutes every other `Solo`/`Channel` sharing the audio context via a static registry. This is the
  only place in the whole remaining catalogue where one node's param change needs to visibly
  affect other node components' displayed state.
- **Async file loading** (Convolver): reuse the pattern already established by
  `GrainPlayerNodeData`/`player.ts`'s `trackUrl`, generalized where needed (Sampler's multi-buffer
  case, if that gets tackled independently of the trigger blocker).
- **Non-standard connection points**: CrossFade (`.a`/`.b` instead of `.input`), MultibandSplit
  (`.low`/`.mid`/`.high` instead of `.output`), and Panner (needs an internal `Split` to produce
  two outputs Tone doesn't natively expose) all deviate from the plain `toneNode.input`/
  `toneNode.output` shape every implemented node currently assumes. Worth a quick look at
  `nodeHandler.ts`'s `create`/`dispose` contract before the first of these gets built, in case the
  interface needs to widen slightly.

---

## Known inconsistencies (not part of the roadmap, just noted while researching it)

- `StubKind` in `src/store/dawTypes.ts` includes `'noiseGenerator'`, but `noiseGenerator` is
  already fully implemented (`REAL_ACTIONS` in `AddNodePanel.tsx`, handler at
  `src/audio/nodes/noise.ts`) — this looks like dead leftover in the stub-kind union.
- `StubKind` also includes `'omniOscillator'`, `'players'`, and `'userMedia'`, none of which
  appear in `AddNodePanel.tsx`'s `CATALOGUE` — they're unreachable from the Add Node panel today.
  `userMedia` is specifically superseded: `micInput.ts` already wraps `Tone.UserMedia`. The other
  two look like earlier, more-generic placeholders for functionality now covered by the specific
  oscillator/player nodes that already exist. Candidates for deletion from `StubKind` rather than
  implementation, but that's a judgment call for whoever cleans it up.
