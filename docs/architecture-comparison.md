# Architecture comparison: reactoscope vs. vectorsynthesis vs. xyscope.js

Reference-library comparison for reactoscope's audio→visual pipeline (`src/scene/pathBuilder.ts`,
`src/audio/sceneInput.ts`, `public/sceneInputProcessor.worklet.js`, `src/woahscope/`,
`src/shaders/{vsLine,fsLine}.glsl`) against two established projects in the same space:

- **[vectorsynthesis](https://github.com/macumbista/vectorsynthesis)** (Derek Holzer / Macumbista) — a
  Pure Data patch library for driving real oscilloscopes, Vectrex consoles, and ILDA laser
  projectors from audio. No software renderer of its own; PD *is* the synth, the CRT/laser/DAC is
  external hardware.
- **[xyscopejs](https://github.com/ffd8/xyscopejs)** (ffd8) — a single-file (`xyscope.js`, ~4000
  lines) browser library that emulates a phosphor oscilloscope in WebGL, in the direct lineage of
  m1el's `woscope`. It's the closest architectural sibling to reactoscope's `WoscopeSceneR3F`
  render path — "Woahscope" and "woscope" share a common ancestor.

All three converge on the same physical model (X/Y position a beam, a third+ signal
brightens/colors it, an audio interface or DAC is the DAC), but they diverge sharply in **where
geometry comes from** and **when it's computed**. That's the throughline below.

## Point generation

| | reactoscope | vectorsynthesis | xyscope.js |
|---|---|---|---|
| Source of points | Live traversal of a THREE.js scene graph, every frame (`collectSegments`, `pathBuilder.ts:63`) | Pre-baked per-shape wavetables (`01.tables/*.txt`), authored **offline** by `lines_vertices.py` / `wkt_parse.py` from 3D model exports or WKT geometry, then read at audio-rate by table-lookup oscillators | Raw samples pulled live from a `ScriptProcessorNode` (`XXY_doScriptProcessor`), i.e. whatever audio is already playing |
| When computed | Every R3F frame, off-main-thread in a Worker (`pathWorker.ts`) | Once, ahead of time, by a human running a Python script | Continuously, but xyscope never *generates* geometry — it only *displays* an existing audio signal |
| Resampling | Fixed-resolution resample to `nPoints`, arc-length parameterised (`buildCoordBuffer`) | None needed — table is scanned directly by a phasor; density is whatever the table author baked in | Lanczos kernel resampling (`XXY_Filter`, `a=8, steps=6`) between raw samples and rendered vertices — same *purpose* as reactoscope's `useLanczos` upsampler in `woahscope/sceneHooks.ts`, independently converged |

reactoscope is the only one of the three that derives points from a **live, editable 3D scene**
rather than a fixed table or an already-existing signal. vectorsynthesis gets 3D scenes too, but
they're static assets baked once outside the runtime — there's no PD-side equivalent of
`collectSegments` walking a scene graph in real time. This is the biggest single architectural
fork between the three.

## Line generation

All three ultimately render "thick line as a GPU quad per segment," and — independently —
**reactoscope and xyscope.js use the same Gaussian-integral (erf) intensity math**:

- reactoscope: `fsLine.glsl` — `erf(xy.x / (SQRT2*sigma)) - erf((xy.x-safelen) / (SQRT2*sigma))`
  integrated along the segment, Gaussian cross-section perpendicular to it, branch-free
  point/line blend via `step(len, EPS)`.
- xyscope.js: `shader_gaussianFragment` (xyscope.js:3775-3805) — the same analytic erf integral,
  inherited from `woscope`.

This is a real convergence, not a coincidence worth re-deriving from scratch — both trace back to
the same lineage of "how do you draw an anti-aliased CRT line in a fragment shader." Worth knowing
if you ever want to compare falloff shaping, multi-sample AA, or performance tricks: xyscope.js's
shader is a good reference implementation to diff against, since it's the same algorithm under a
different set of surrounding constraints (2-channel, no per-vertex color).

vectorsynthesis has no line-rendering stage at all — PD emits an analog X/Y/Z(+RGB) signal, and
whatever draws the line (an actual CRT, an ILDA laser's galvo response, a Vectrex, or a *separate*
scope emulator) does so outside the patch. This is a meaningful design question for reactoscope:
right now the coord-buffer generator and the renderer are coupled in one app; vectorsynthesis's
model assumes they never are.

## Multichannel support

"Multichannel" means three different things across these projects — worth being precise:

- **reactoscope**: a fixed 6-channel Web Audio bus (X, Y, R, G, B, A) via `Tone.Split(6)` /
  `outputChannelCount: [6]` on the scene-input worklet. "Multichannel" in the UI sense
  (`isMasterMultichannel`, `store/daw.ts:448`) means *whether R/G/B are independently wired* vs.
  falling back to a single hue tint — it's a color-routing distinction, not a channel-count one.
- **vectorsynthesis**: channel count is whatever the audio interface exposes — X, Y, Z(blanking),
  R, G, B is the common ILDA convention, but the patches don't hard-code a channel count the way
  reactoscope's worklet does. It also supports a completely different multichannel case reactoscope
  doesn't have at all: **multiplexing several independent shapes onto one shared beam path**
  (`vs-multiplex.pd`), each shape getting a time-sliced window of a master phasor, selected via
  `masterblank~`/`mastermultiplex` receive busses.
- **xyscope.js**: hard-locked to 2 channels (X/Y stereo only). RGB/laser output is an explicit,
  acknowledged gap — a commented-out stub in its AudioWorklet ("*** future: RGB LASER if DAC with
  5+ channels") and the README says multi-channel and ILDA support are "pending." reactoscope
  already ships the 6-channel bus xyscope.js is still planning.

## Path generation

This is where reactoscope's design is most distinct from both references:

- **reactoscope**: `collectSegments` → `orderSegments` (greedy nearest-neighbour, a lightweight
  open-loop TSP heuristic minimising blank-beam travel) → `buildCoordBuffer` (resample to fixed
  `nPoints`, geometry vs. blanking budget split via `VISIBLE_FRACTION`). Path order is **solved
  fresh every frame** from whatever's currently in the scene — there's no authored order.
- **vectorsynthesis**: order is **authored**, not solved. Each shape is a fixed vertex sequence in
  its wavetable; when multiple shapes share a beam, `vs-multiplex.pd` assigns each a fixed slot of
  the phasor cycle. No equivalent of nearest-neighbour reordering exists — travel between shapes is
  whatever the author wired, not a computed shortest path.
- **xyscope.js**: no path-ordering concept at all. `buildWaves()` flattens every drawn primitive
  into one array and the oscillator just indexes through it cyclically — jumps between primitives
  produce a visible connecting line, by design, matching real vector-scope behavior. There's no
  blanking to hide the seam (see below).

reactoscope's per-frame TSP-style reordering is genuinely novel among the three — it's solving a
problem (minimize traversal cost of *arbitrary, changing* geometry) that neither reference needs
to solve, because their geometry is either static (vectorsynthesis's tables) or already a single
existing signal (xyscope.js's incoming audio).

## Shape distinction

None of the three carry a persistent "shape ID" all the way to the beam signal — but the *reason*
differs:

- **reactoscope**: shapes exist as `THREE.Object3D` instances up through `collectSegments`
  (materials/vertex colors differ per object), but `orderSegments` flattens everything into one
  undifferentiated segment pool for reordering. Shape identity is implicit in color/position only;
  nothing downstream of the path builder knows "this point belonged to object X."
- **vectorsynthesis**: shape identity is real and explicit at the *authoring* level (a named
  wavetable per shape: `cubeX.txt`, `sphereY.txt`, etc.) and at the *scheduling* level
  (`vs-multiplex.pd`'s time-sliced windows), but is lost the instant the phasor sweeps past a
  shape's window — there's no shape metadata in the resulting analog signal, same end state as
  reactoscope.
- **xyscope.js**: `this.shapes` exists as a real array-of-arrays at the p5 drawing-API level, but
  `buildWaves()` collapses it before it ever reaches audio — same story again.

Worth naming as a pattern: **all three systems agree that "shape" is a build-time/scene-time
concept that does not survive translation to a beam-position signal.** That's not a
gap in reactoscope specifically — it appears to be close to a physical constraint of driving a
single-beam device from a single audio-rate signal. If reactoscope ever wants shape identity to
survive (e.g. for per-shape effects, or a "hide this shape" toggle at render time rather than scene
time), that's a real architectural extension over all three, not a catch-up.

## Alpha / Z / blanking channel

The most consequential difference, and the one with the most direct implications for reactoscope's
roadmap toward laser output:

- **reactoscope**: blanking is an explicit **7th field** in the interleaved coord buffer
  (`COORD_STRIDE = 7`: `[x, y, r, g, b, a, blank]`), separate from the alpha channel. `blank=1`
  forces R/G/B/A to `-1` (silent) while the beam still physically moves — see
  `sceneInputProcessor.worklet.js:160-164`. Alpha (`A`) is a *color* channel (vertex-color alpha,
  modulates shader brightness — `fsLine.glsl:51`, `vColor.a`), not a blanking signal. So
  reactoscope already has both: alpha as intensity modulation, and blank as a hard on/off — they
  are two distinct, independently-controllable signals.
- **vectorsynthesis**: has a dedicated Z-axis blanking convention matching real ILDA/oscilloscope
  hardware, computed explicitly (`vs-blanking.pd`: horizontal/vertical threshold windows ANDed
  together, `expr~ $v1 && $v2`, multiplied against brightness) plus a second, independent blanking
  path for shape-multiplex transitions (`masterblank~` in `vs-multiplex.pd`). Two blanking
  mechanisms for two different reasons (raster-window blanking vs. shape-transition blanking) — a
  finer-grained split than reactoscope's single `blank` flag. Color itself, in the ILDA-RGB stage
  (`vs-ilda-rgb.pd`), is generated from continuous rotating-phase functions per channel (`wrap~` +
  per-channel phase offset), not sourced from per-vertex geometry data the way reactoscope's
  `colorAttr` is.
- **xyscope.js**: **no blanking/Z concept exists at all.** Confirmed absence, not an oversight
  reactoscope needs to worry about replicating — brightness there is purely a function of the
  Gaussian shader math and global exposure/persistence controls. This tracks with xyscope.js being
  scope-emulation-only; it has no laser-safety requirement forcing a blanking signal to exist.

This is the sharpest point of comparison for reactoscope's stated goal (driving "an analog XY
vector display, including a laser"): **vectorsynthesis is the only one of the three actually built
for laser hardware, and its blanking model is more granular than reactoscope's current one.**
reactoscope's single binary `blank` flag conflates "this is inter-shape travel, hide it" with
anything a real ILDA-safety pipeline would also want (e.g. blanking during sharp-angle corners to
avoid galvo overshoot burn-in, which ILDA-oriented tools typically add explicitly — `vs-decimate.pd`
and the point-budget split in `buildCoordBuffer` are the closest reactoscope equivalents, but they
optimize sample count, not corner-angle safety).

## Other architecturally relevant differences

- **Persistence/phosphor**: reactoscope (`WoscopeSceneR3F.tsx`) and xyscope.js
  (`drawLineTexture`/`fade`/`drawCRT`) use the *same* accumulate → fade → separable-blur-bloom
  pipeline — same render-target sizes, same blur offsets, same filmic tonemap
  (`1 - 2^(-exposure·light)`). `fsOutput.glsl` is close enough to xyscope's `shader_outputFragment`
  to read as a direct adaptation, not an independent reinvention. The deliberate change is real and
  necessary: reactoscope reads `luma`/recovers `beamHue = line.rgb/luma` to preserve per-point hue
  through the tonemap, where xyscope reads a single channel (`line.r`) because it only ever has one
  global color to begin with. One divergence turned out to be an actual bug, not a design choice:
  xyscope scales its fade amount by buffer size (`0.2 * bufferSize/512`) so perceived persistence
  stays constant regardless of point density; reactoscope's `FADE_AMOUNT` was a flat constant,
  unscaled by point count, so toggling `lanczosSteps` visibly shifted apparent persistence for
  reasons unrelated to the actual persistence control. Fixed in `WoscopeSceneR3F.tsx` — `fadeAlpha`
  now scales by `nPoints / N_SAMPLES`, mirroring xyscope's normalisation. vectorsynthesis has no
  persistence simulation at all — that's the physical phosphor or laser scanner's job, not the
  patch's.
- **Color source**: reactoscope reads real per-vertex RGB from `geometry.attributes.color`
  (`pathBuilder.ts:96`), falling back to material color. Both reference libraries derive color from
  a global parameter instead — xyscope.js from a single `hue` slider (`getColourFromHue`),
  vectorsynthesis's ILDA-RGB stage from rotating phase functions. reactoscope's per-vertex color
  pipeline is more capable than either reference by default — worth being aware that this is a
  reactoscope strength when comparing renderer feature-parity. It also means vectorsynthesis's
  rotating-phase color model isn't actually a missing *feature* — it already falls out of the
  existing graph for free. `MasterOutput`'s R/G/B/A inputs (`in-2`..`in-5`) are each a plain `Gain`
  node (`audioCore.ts:66-69`), wired like any other audio input; Web Audio sums whatever connects to
  a `Gain`. Patching an LFO (or any node) into Master Output's R/G/B/A directly — instead of, or
  alongside, Scene Input's own R/G/B/A output — already produces continuous phase-driven color
  cycling independent of geometry, with no new node type required. No action needed here; noting it
  so it's findable rather than re-derived later.
- **Render/synth coupling**: reactoscope generates the coord buffer and renders it in the same
  app, one frame apart. vectorsynthesis assumes the opposite by design — PD produces the analog
  signal and hands it to whatever external hardware or emulator draws it; xyscope.js is the mirror
  image again, a pure renderer that assumes the audio already exists and generates nothing itself.
  reactoscope currently occupies the middle position (owns both ends), which is a real design
  choice worth naming explicitly, not an accident — it's what makes the live/patchable DAW model
  possible, at the cost of the modularity the other two get from staying on one side of the line.
- **Live vs. offline authoring loop**: vectorsynthesis's WKT/3D-model import
  (`wkt_parse.py`, `lines_vertices.py`) is a one-time, human-in-the-loop, offline conversion step
  producing static tables — there is no live-editing equivalent of reactoscope's node-graph DAW.
  reactoscope's entire premise (a DAW where geometry is live, patchable, and reactive) has no
  counterpart in either reference project; neither one is trying to be an editor.
</content>
