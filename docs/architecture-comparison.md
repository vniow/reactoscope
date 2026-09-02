# Architecture comparison: reactoscope vs. vectorsynthesis vs. xyscope.js vs. LaserBoy vs. laser-dac-rs vs. PlayzerX

Reference-library comparison for reactoscope's audio→visual pipeline (`src/scene/pathBuilder.ts`,
`src/audio/sceneInput.ts`, `public/sceneInputProcessor.worklet.js`, `src/woahscope/`,
`src/shaders/{vsLine,fsLine}.glsl`) against five established projects in the same space:

- **[vectorsynthesis](https://github.com/macumbista/vectorsynthesis)** (Derek Holzer / Macumbista) — a
  Pure Data patch library for driving real oscilloscopes, Vectrex consoles, and ILDA laser
  projectors from audio. No software renderer of its own; PD *is* the synth, the CRT/laser/DAC is
  external hardware.
- **[xyscopejs](https://github.com/ffd8/xyscopejs)** (ffd8) — a single-file (`xyscope.js`, ~4000
  lines) browser library that emulates a phosphor oscilloscope in WebGL, in the direct lineage of
  m1el's `woscope`. It's the closest architectural sibling to reactoscope's `WoscopeSceneR3F`
  render path — "Woahscope" and "woscope" share a common ancestor.
- **LaserBoy** (James Lehman / Extra Stimulus Inc.) — a keyboard-driven C++ desktop application
  (FLTK GUI) for authoring, editing, and exporting laser vector art: native ILDA `.ild` frames,
  DXF import, vector fonts, and — most relevant here — direct-to-soundcard multichannel `.wav`
  export for driving real galvo hardware from an ordinary audio interface. Vendored locally under
  `LaserBoy/` (no upstream URL recorded in-tree); see `LaserBoy/CLAUDE.md` for its own architecture
  notes. Unlike the other two, it's laser-specific software written by someone who has actually run
  wire out to a galvo projector — its own README states the point plainly: "LaserBoy provides a
  full set of points optimization routines including distance spanning, corner dwelling and the
  ability to minimize total points distance by rearranging the order and direction of lit segments
  within a frame" (`LaserBoy/readme.md:17`).
- **[laser-dac-rs](https://github.com/ModulaserApp/laser-dac-rs)** (Modulaser) — a maintained, published
  Rust crate (`crates.io/crates/laser-dac`) that is a **unified DAC backend abstraction**, not a
  point generator. It sits one layer downstream of the other four: it assumes `LaserPoint`s already
  exist and is responsible for getting them onto real hardware — Helios, Ether Dream, IDN, LaserCube
  (USB and network), and AVB audio devices — plus, notably, an `oscilloscope` backend that drives a
  real scope tube's XY input over stereo audio, the same physical target reactoscope names itself
  after. Vendored locally under `laser-dac-rs-main/`; see its own `CONTEXT.md` for domain vocabulary.
- **[PlayzerX](https://mirrorcletech.github.io/playzerx/)** (Mirrorcle Technologies) — the vendor SDK
  for a **real, physical laser projector**, not a software emulation or a multi-protocol
  abstraction. Unlike every other project here, its target hardware isn't a pair of galvo mirrors —
  it's a single 2-axis **MEMS mirror** chip ("Playzer X-Series," VGLP architecture), a mechanically
  different beam-steering technology with its own failure modes. A thin C++ wrapper
  (`PlayzerX.h`/`.cpp`, ~800 lines) around a binary USB-serial protocol, built on top of Mirrorcle's
  proprietary `MTIDevice`/`MTISerial` libraries (prebuilt `.lib`/`.dll`, Windows-first, bundled
  OpenCV 2.4.13 binaries for the underlying device layer). Vendored locally under
  `playzerx-master/`. This is the only project in the comparison whose "implementation" is a real,
  shipping hardware interface rather than software standing in for one — worth reading closely for
  what it *doesn't* bother doing, as much as what it does.

All six converge on the same physical model (X/Y position a beam, a third+ signal
brightens/colors it, an audio interface or DAC is the DAC), but they diverge sharply in **where
geometry comes from**, **when it's computed**, and — new with laser-dac-rs and PlayzerX — **who's
responsible for getting it onto hardware safely once it's computed**. That's the throughline below.

## Point generation

| | reactoscope | vectorsynthesis | xyscope.js | LaserBoy |
|---|---|---|---|---|
| Source of points | Live traversal of a THREE.js scene graph, every frame (`collectSegments`, `pathBuilder.ts:63`) | Pre-baked per-shape wavetables (`01.tables/*.txt`), authored **offline** by `lines_vertices.py` / `wkt_parse.py` from 3D model exports or WKT geometry, then read at audio-rate by table-lookup oscillators | Raw samples pulled live from a `ScriptProcessorNode` (`XXY_doScriptProcessor`), i.e. whatever audio is already playing | Hand-authored in a keyboard-driven vector editor, or imported (DXF, vector fonts, parametric "Liquid Math" oscillator generators, `.wav`→vector reimport) — one `LaserBoy_frame` (`vector<vertex>` + ILDA metadata) at a time |
| When computed | Every R3F frame, off-main-thread in a Worker (`pathWorker.ts`) | Once, ahead of time, by a human running a Python script | Continuously, but xyscope never *generates* geometry — it only *displays* an existing audio signal | Once, during an editing session; a human invokes point-optimization effects from a menu as explicit destructive edits, not automatically on every frame |
| Resampling | Fixed-resolution resample to `nPoints`, arc-length parameterised (`buildCoordBuffer`) | None needed — table is scanned directly by a phasor; density is whatever the table author baked in | Lanczos kernel resampling (`XXY_Filter`, `a=8, steps=6`) between raw samples and rendered vertices — same *purpose* as reactoscope's `useLanczos` upsampler in `woahscope/sceneHooks.ts`, independently converged | None for `.ild` export — writes exactly the authored points (`LaserBoy_frame::save_as_ild`, `LaserBoy_frame.cpp:150`). For direct-to-soundcard `.wav` export, `LaserBoy_frame::optimize()` (`LaserBoy_frame.cpp:328`) *inserts* points — angle-proportional corner dwell plus max-slew-rate-limited interpolation — producing a longer, variable-length stream rather than resampling to a fixed count |

reactoscope is the only one of the four that derives points from a **live, editable 3D scene**
rather than a fixed table, an already-existing signal, or a hand-edited frame. vectorsynthesis gets
3D scenes too, but they're static assets baked once outside the runtime — there's no PD-side
equivalent of `collectSegments` walking a scene graph in real time. LaserBoy is further still from
"live": it's a frame-at-a-time offline editor, closer in spirit to vectorsynthesis's authoring step
than to anything real-time. This is the biggest single architectural fork in the group.

laser-dac-rs doesn't belong in this table at all, and that's itself the finding: it generates no
points whatsoever. Its `Frame`/`Stream` APIs take `LaserPoint`s the caller already produced (from a
Frame API caller's own scene, generator, or file) and are purely about pacing and delivering them —
see the new section below. Structurally it's the layer reactoscope doesn't have yet: something
downstream of `buildCoordBuffer` that owns hardware timing/reconnect/safety once points already
exist, as opposed to anything that competes with `collectSegments`/`orderSegments`.

PlayzerX doesn't belong here either, for the same reason and then some: it generates no points and
does no pacing/safety composition of its own beyond raw FIFO buffer bookkeeping — see the dedicated
section below. Where laser-dac-rs is a delivery layer with real scheduling and safety logic built in,
PlayzerX is closer to the bare wire underneath one — a real device's answer to "what's the absolute
minimum a hardware SDK needs to do."

## Line generation

reactoscope and xyscope.js both render "thick line as a GPU quad per segment," and —
independently — **use the same Gaussian-integral (erf) intensity math**:

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

LaserBoy sits in a third position: it does render a live preview, but not by simulating beam
optics at all. `LaserBoy_GUI::draw()` (`LaserBoy_FLTK_GUI.hpp:92-95`) just blits a CPU-rasterized
bitmap (`LaserBoy_bmp`) to the window via FLTK's `fl_draw_image` — plain rasterized line segments,
no Gaussian falloff, no persistence/bloom, no anti-aliasing beyond whatever the rasterizer does.
It's solving "let a human see the vector art while editing it," not "simulate what the beam
actually looks like," so it isn't a real point of comparison for reactoscope's or xyscope.js's
shader work — worth naming only so its absence from the erf/Gaussian discussion above reads as
confirmed-checked rather than overlooked.

## Multichannel support

"Multichannel" means three different things across these projects — worth being precise:

- **reactoscope**: a fixed 6-channel Web Audio bus (X, Y, R, G, B, Z) via `Tone.Split(6)` /
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
- **LaserBoy**: hard-codes the same 6-channel ILDA convention reactoscope converged on
  independently, as named constants `LASERBOY_CHANNEL_{X,Y,Z,R,G,B}` = 0..5
  (`LaserBoy_macros.hpp:140-145`), used when writing direct-to-soundcard `.wav` files for real
  DAC/galvo hardware — its README claims this has driven actual hardware at "48 thousand points
  per second" over an "8 channel sound card" (`LaserBoy/readme.md:19`). Confirms the 6-channel
  choice isn't arbitrary — it's the convention two independently-built laser-facing projects
  (LaserBoy, and vectorsynthesis's ILDA stage) both landed on. **Naming collision worth flagging**:
  LaserBoy's `CHANNEL_Z` is a spatial position axis (3D depth), not an intensity/blanking control —
  the opposite of what reactoscope's "Z channel" means (see Alpha/Z/blanking section below). Same
  letter, different real-world axis each project chose to name itself after; don't assume shared
  meaning when cross-referencing the two.
- **laser-dac-rs**: its neutral `LaserPoint` type (`src/point.rs:26`) is `{x, y, r, g, b, intensity}`
  — the same 6-field shape as reactoscope's coord buffer, but channel count on the wire is
  **per-backend, not fixed**: the `avb` backend really does map to 6 discrete audio channels (its
  `examples/avb_file.rs` writes a "6ch AVB-mapped WAV" for validation), matching the ILDA convention
  LaserBoy and vectorsynthesis also converged on independently. But the `oscilloscope` backend
  deliberately drops to **2** channels — `LaserPoint.x` → left, `.y` → right
  (`src/protocols/oscilloscope/backend.rs:126,194-204`) — because a scope tube has no color input at
  all, so R/G/B/intensity are simply discarded for that backend. Worth being precise: "6-channel" in
  this crate is a property of *which hardware you're driving*, not a crate-wide constant the way it
  is in reactoscope's worklet.
- **PlayzerX**: channel count is a **hardware SKU**, not software configuration — see the dedicated
  PlayzerX section above for the full detail. Monochrome units speak `XYM` (3 logical channels: X,
  Y, one modulation/intensity value); RGB units speak `XYRGB` (5: X, Y, R, G, B — no separate
  intensity channel, full black is the only "off"). Position is quantized to **12-bit** (4096 steps
  per axis, `docs/PlayzerX USB Serial Protocol.rst:215`), coarser than every other project's
  `f32`/16-bit-equivalent position handling. There is no runtime path from a monochrome unit to
  RGB output or vice versa — you bought the channel count you have.

## Path generation

This is where reactoscope's design is most distinct from every other reference here:

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
- **LaserBoy**: order *is* solved, but as a user-invoked destructive edit
  (`reorder_segments`/`shortest_path_of_segments`, `LaserBoy_segment.cpp:1304`), not something
  recomputed every output cycle. It's the same greedy-nearest-candidate shape as reactoscope's
  `orderSegments` — walk unvisited segments, pick the best next one, allow reversal — but the *cost
  function differs in a way worth adopting*: LaserBoy doesn't minimize Euclidean distance, it
  minimizes `points_away`, a physical settle-time cost = (dwell points for the incoming turn angle,
  via `start_dwell_vertices`) + (interpolation steps for the blank jump, via `linear_steps`,
  `LaserBoy_utility.hpp:91-97`) + (dwell points for the outgoing turn angle, via
  `end_dwell_vertices`). Two candidate segments equidistant in raw pixels can cost very differently
  once turn angle is priced in — a smooth continuation is nearly free, a reversal is expensive.
  reactoscope's `orderSegments` (`pathBuilder.ts:201`) has no angle term at all today. LaserBoy also
  has a pre-ordering step reactoscope doesn't: `conglomerate_lit_segments`
  (`LaserBoy_segment.cpp:1161`) merges disconnected segments that share an endpoint, picking
  whichever candidate continues at the shallowest angle, *before* the shortest-path pass runs —
  reducing segment count rather than just ordering what's there. reactoscope's `collectSegments`
  does the opposite by default: every `THREE.Line` is fractured into individual 2-vertex pairs
  before `orderSegments` sees it (`pathBuilder.ts:141`), so a continuous polyline's own adjacency
  is discarded and has to be rediscovered by nearest-neighbour each frame — possibly intentional
  (worth confirming why before changing), but it is a real point of difference in default posture.

reactoscope's per-frame TSP-style reordering is still the only one of the six solving this problem
*live* against arbitrary, changing geometry — vectorsynthesis's and xyscope.js's geometry is either
static or already a single existing signal, and LaserBoy solves the same shape of problem but as an
offline, human-triggered edit on a fixed authored frame. LaserBoy's contribution here isn't "order
matters" (reactoscope already knew that) — it's a concrete, working answer to *what the ordering
cost function should actually measure* when the destination is real beam-steering hardware.

**laser-dac-rs doesn't order segments at all** — ordering is entirely the caller's job, same
division of labor as its non-involvement in point generation. But it *does* own what happens at the
seam between whatever the caller hands it next, via `default_transition` (`src/presentation/mod.rs:214`),
and that's a third, materially different answer to the same travel-safety question LaserBoy answers
with `add_dwell`:

| | LaserBoy (`add_dwell`) | laser-dac-rs (`default_transition`) |
|---|---|---|
| Trigger | Every vertex-to-vertex transition *inside* a frame (blank→lit, lit→lit, lit→blank) | Only the seam *between* two submitted frames/chunks — no visibility into in-frame corners |
| Dwell duration | Scales with turn angle: `0` at a straight line, max at a full reversal | Fixed regardless of angle: always `~100µs` end-dwell + `~400µs` start-dwell (`END_DWELL_US`/`START_DWELL_US`, `src/presentation/mod.rs:198-199`) |
| Transit shape | Uniform linear steps, count = `ceil(distance / blank_delta_max)` | Quintic ease-in-out (`quintic_ease_in_out`, `src/presentation/mod.rs:255`) — physically models galvo accel/decel, not just "same speed, more steps" |
| Transit point count | Driven by a max-slew-rate constant | Scales with **L∞ distance** (`dx.abs().max(dy.abs())`, correct for two independent, non-interacting galvo axes), clamped to 0–64 points |
| Closed-loop handling | No explicit concept | `TransitionPlan::Coalesce` — merges seam endpoints that are the same logical point, avoiding a duplicate-point halt on loops |

Neither is strictly better — they're solving overlapping but distinct problems. LaserBoy's is the
only one of the two aware of *how sharp* a turn is (so a gentle bend gets little to no dwell, unlike
laser-dac-rs's fixed dwell on every seam regardless of severity); laser-dac-rs's is the only one with
a physically-modeled acceleration curve and the only one exposing an explicit `Coalesce` case for
loop seams, which is exactly the case reactoscope's own `LineLoop` handling in `collectSegments`
(`pathBuilder.ts:142,148-152`) has to get right by hand today. If reactoscope ever adds seam-level
transition composition, `Coalesce` vs. `Transition(points)` is a cleaner API shape to copy than
inventing an equivalent from scratch.

**PlayzerX orders nothing and composes no transitions at all** — confirmed by grep, not inferred
(see the dedicated PlayzerX section above). Of the two projects here that actually talk to real
beam-steering hardware, laser-dac-rs chose to own seam-level safety; PlayzerX chose to own none of
it, leaving 100% of ordering and travel-safety to the calling application. Neither choice is wrong —
PlayzerX is a raw hardware SDK, not an authoring or delivery framework — but it's the clearest
illustration in this whole comparison of how much LaserBoy's and laser-dac-rs's cost functions
actually add over doing nothing.

## Shape distinction

None of the other five carry a persistent "shape ID" all the way to the beam signal — but the
*reason* differs:

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
- **LaserBoy**: a "lit segment" — a run of consecutive non-blank vertices, separated from its
  neighbors by blank vectors — is the closest thing to an explicit shape unit, and it's real enough
  to be individually addressed: `explode_segments()` splits a frame into one `LaserBoy_frame` per
  lit segment, and effects like `conglomerate_lit_segments`/`randomize_segments` operate on that
  granularity. But it's still frame-local bookkeeping — once a frame is written to `.ild` or `.wav`,
  segment identity is gone, same end state as the other three; only the blank vectors between
  points remain as evidence a boundary once existed.
- **laser-dac-rs**: not applicable in the usual sense — it never sees "shapes," only a flat
  `Vec<LaserPoint>` per `Frame`. But it's the one project here with an explicit notion of *frame*
  identity surviving into the delivery layer: `TransitionPlan` is computed from *which two frames*
  are adjacent, and self-loops (A→A) run the same transition callback as frame changes
  (`src/presentation/mod.rs:191`) — so "did the shape change" is a real, inspectable question at the
  seam, even though "what shape is this" is not.
- **PlayzerX**: no concept of shape or frame identity whatsoever — it only ever sees flat X/Y/color
  arrays passed to `SendDataXY`/`SendDataXYM`/`SendDataXYRGB`. Not even the frame-level boundary
  laser-dac-rs preserves exists here.

Worth naming as a pattern: **all six systems agree that "shape" is a build-time/scene-time or
edit-time concept that does not survive translation to a beam-position signal.** That's not a
gap in reactoscope specifically — it appears to be close to a physical constraint of driving a
single-beam device from a single audio-rate signal. If reactoscope ever wants shape identity to
survive (e.g. for per-shape effects, or a "hide this shape" toggle at render time rather than scene
time), that's a real architectural extension over all six, not a catch-up.

## Alpha / Z / blanking channel

The most consequential difference, and the one with the most direct implications for reactoscope's
roadmap toward laser output. **Updated per ADR-0009**: reactoscope collapsed its two
representations into one — see below for the current state; the "as originally built" comparison
is kept for context on how it got there.

- **reactoscope (current)**: a single analog **Z channel** is the 6th field in the interleaved
  coord buffer (`COORD_STRIDE = 6`: `[x, y, r, g, b, z]`), continuous in `[-1, +1]`. `-1` is fully
  blanked, `+1` is full intensity, and the worklet linearly interpolates it exactly like X/Y/R/G/B —
  no separate boolean, no branch in `sceneInputProcessor.worklet.js`. This matches how the value was
  already being produced upstream: `buildCoordBuffer` was filling the old "alpha" slot with
  `2*intensity-1` for every visible point (`pathBuilder.ts`), so the rename mostly just gave the
  existing signal an accurate name and deleted the redundant flag layered on top of it.
  (As originally built: blanking was a **separate 7th field**, `COORD_STRIDE = 7`:
  `[x, y, r, g, b, a, blank]`. `blank=1` forced R/G/B/A to `-1` while the beam kept moving, and the
  worklet read `blank` as a hard threshold on `_coords[o+6]` — a genuinely separate signal from
  alpha, and the source of an interpolation-boundary bug: reading the flag from one endpoint let a
  sample mid-fade toward silence still register as "visible.")
- **vectorsynthesis**: has a dedicated Z-axis blanking convention matching real ILDA/oscilloscope
  hardware, computed explicitly (`vs-blanking.pd`: horizontal/vertical threshold windows ANDed
  together, `expr~ $v1 && $v2`, multiplied against brightness) plus a second, independent blanking
  path for shape-multiplex transitions (`masterblank~` in `vs-multiplex.pd`). Two blanking
  mechanisms for two different reasons (raster-window blanking vs. shape-transition blanking) — a
  finer-grained split than reactoscope's single `z` channel currently supports, though reactoscope's
  is now continuous rather than binary. Color itself, in the ILDA-RGB stage (`vs-ilda-rgb.pd`), is
  generated from continuous rotating-phase functions per channel (`wrap~` + per-channel phase
  offset), not sourced from per-vertex geometry data the way reactoscope's `colorAttr` is.
- **xyscope.js**: **no blanking/Z concept exists at all.** Confirmed absence, not an oversight
  reactoscope needs to worry about replicating — brightness there is purely a function of the
  Gaussian shader math and global exposure/persistence controls. This tracks with xyscope.js being
  scope-emulation-only; it has no laser-safety requirement forcing a blanking signal to exist.
- **LaserBoy**: blanking is a discrete boolean per vertex, stored on the *destination* end of a
  vector (`LaserBoy/CLAUDE.md`'s own convention note) — closer to reactoscope's original 7-field
  `[x,y,r,g,b,a,blank]` design (pre-ADR-0009) than to the current continuous `z`. But LaserBoy is
  also the answer to the exact gap **ADR-0008** named as unsolved anywhere: corner/galvo-overshoot
  safety. Its mechanism, `add_dwell` (`LaserBoy_segment.cpp:2288`) paired with
  `start_dwell_vertices`/`inline_dwell_vertices`/`end_dwell_vertices`
  (`LaserBoy_utility.hpp:100-135`): classify each vertex-to-vertex transition as blank→lit, lit→lit,
  or lit→blank, and insert `ceil((angle/π) × sample_rate × max_dwell_microsec)` repeated copies of
  the vertex — more dwell at sharper turns, none on a straight line. Optionally fades the dwell
  copies to black partway through (`lit_dwell_overhang`, `black_dwell_vertices`) rather than holding
  full brightness the whole pause, to avoid burning a static bright point into phosphor/mirror
  coating while the galvo settles. Paired with `add_lit_span_vertices`/`add_blank_span_vertices`
  (`LaserBoy_segment.cpp:2432-2520`), which insert linearly-interpolated points whenever a vector's
  length exceeds a max-slew-rate constant (`lit_delta_max`/`blank_delta_max`) — literally the
  "scan-rate caps" ADR-0008 said had "no representation anywhere in the current pipeline at all."
  All the tuning constants (`sample_rate`, `max_dwell_microsec`, `insignificant_angle`,
  `blank_delta_max`, `lit_delta_max`) are runtime settings on `LaserBoy_space`
  (`LaserBoy_space.hpp:155-161`), not hardcoded — they're calibrated per physical rig. Notably, this
  whole pipeline (`LaserBoy_frame::optimize()`, `LaserBoy_frame.cpp:328`) only runs automatically on
  the direct-to-soundcard `.wav` export path, not on `.ild` export — `.ild` files are read by
  dedicated laser-show hardware/software that presumably does its own point-rate interpolation,
  while driving raw galvos from an audio interface (exactly reactoscope's situation) is where
  LaserBoy decided this insertion has to happen upstream, in software, because nothing downstream
  will do it for you.
- **laser-dac-rs**: `LaserPoint.intensity` (`src/point.rs:37`) is a separate `u16` field from R/G/B,
  conceptually the same role as reactoscope's `z` — but implemented as a plain sibling field, not a
  blended/continuous analog control layered over color the way reactoscope's `z` composes with
  R/G/B in the same interleaved buffer. `LaserPoint::blanked()` zeroes intensity *and* R/G/B together
  (`src/point.rs:54-61`), so — like LaserBoy, unlike reactoscope — blanking and "this point happens
  to be black" aren't distinguishable from the point data alone. More consequential: this crate has
  an **explicit extension point for exactly the corner-safety logic ADR-0008 said had no home** —
  `OutputFilter` (`src/presentation/mod.rs:82`) runs on the exact point slice about to be written to
  hardware, after transition composition, with a documented reset-on-discontinuity contract
  (`OutputResetReason`) and a worked example that clamps out-of-range points to blanked
  (`README.md:196-208`). This is a real, running instance of the "downstream DAC-adapter concern"
  ADR-0008 named as one of two possible homes for corner-safety logic — the other being
  `buildCoordBuffer` itself. laser-dac-rs picked the adapter side; nothing here says reactoscope
  must, but it's evidence that side is a proven, workable seam, not just a hypothetical.
- **PlayzerX**: blanking is whatever "off" means for the device's own format — `M=0` in `XYM` mode,
  `R=G=B=0` in `XYRGB` mode (`docs/PlayzerX USB Serial Protocol.rst:57-88`) — a plain zero value,
  not a distinct signal. There is no corner-safety mechanism here at all (see the dedicated PlayzerX
  section above); the one hardware-safety feature PlayzerX does ship — the onboard low-pass filter
  mitigating MEMS mirror ringing — operates on the drive signal generically, with no awareness of
  blanking or corners specifically.

This is the sharpest point of comparison for reactoscope's stated goal (driving "an analog XY
vector display, including a laser"). Previously this section concluded vectorsynthesis was the only
one of the three actually built for laser hardware; **LaserBoy and laser-dac-rs sharpen that
further — both are laser-specific, both ship a genuine, working corner/travel-safety mechanism, and
they disagree with each other on the details** (angle-aware in-frame dwell vs. fixed seam-only
dwell with a physically-modeled ease curve — see the Path generation section above for the full
contrast). Between the two, ADR-0008's research question is now doubly answered: there isn't just
one known technique to integrate, there are (at least) two, and they trade off differently.
reactoscope's single continuous `z` channel (ADR-0009) still conflates "this is inter-shape travel,
hide it" with corner-safety concerns, but going continuous means if/when either project's
dwell-insertion idea is adopted, it composes into the existing analog `z` value (and the existing
fixed-`nPoints` resampling budget in `buildCoordBuffer`, weighted toward high-curvature vertices)
rather than requiring a new flag. And if reactoscope ever wants the "adapter" placement instead of
the "resampler" placement, laser-dac-rs's `OutputFilter` is a concrete existing API shape to model
that seam on, not a blank page.

## Hardware delivery layer (laser-dac-rs only)

None of reactoscope, vectorsynthesis, xyscope.js, or LaserBoy model this layer at all — it's genuinely
new territory laser-dac-rs brings to the comparison, not a variant of something the other four
already do differently. PlayzerX has the raw material of this layer (a real device FIFO, see its own
section below) but none of the scheduling/safety logic built on top of it — worth treating as the
floor this layer starts from, not a sixth example of it.

- **Backend timing model (`OutputModel`, `src/device.rs:320`)**: three real hardware pacing
  strategies, unified behind one scheduler loop — `UsbFrameSwap` (limited-depth double-buffered DACs
  like Helios: wait for a hardware-ready signal, write whole composed frames), `NetworkFifo`
  (queryable queue depth, e.g. Ether Dream/LaserCube/AVB: estimate outstanding points, top up to a
  target buffer), and `UdpTimed` (IDN: no hardware position signal at all, so OS send time against a
  precise deadline *is* the clock). reactoscope's AudioWorklet cycling is closest in spirit to
  `NetworkFifo`'s continuous top-up model, but reactoscope has never had to reconcile that against a
  frame-swap or deadline-clocked device — it only has one downstream consumer today (its own
  worklet), where laser-dac-rs has to make five hardware families feel identical to a caller.
- **Color delay / scanner sync compensation** (`with_color_delay_points`/`with_color_delay`,
  `README.md:332-360`): galvo mirrors need time to physically settle before the laser should fire, so
  R/G/B/intensity channels are shifted a configurable number of points *later* than X/Y — typically
  50-200µs. This is a real, physical-latency-driven concept **none of the other five projects model
  at all** — not even PlayzerX, whose closest analogue (the onboard low-pass filter mitigating MEMS
  ringing) treats the whole drive signal generically rather than shifting color relative to position.
  Worth flagging for reactoscope specifically because if it ever drives a real DAC where the color
  modulator and the galvo have measurably different response latency, this is the shape the fix
  takes: an intentional per-channel sample delay, not a bug to chase.
- **Startup blanking** (`with_startup_blank`, default 1ms): forces the first points after arming to
  blank, so mirrors reach their initial position before the beam is live — preventing a "flash on
  start" artifact. Conceptually close to LaserBoy's `intro` segment (`LaserBoy_frame::optimize()`,
  the dwell computed from `point_of_entry` to a frame's first vertex), independently arrived at.
- **Reconnect and liveness** (`ReconnectConfig`, `FrameSessionMetrics`): automatic reconnection with
  backoff/retry callbacks, plus a read-only liveness handle (`connected()`, `last_loop_activity()`,
  `last_write_success()`) for downstream watchdogs. None of the other five projects handle hardware
  disconnection as a first-class case — PlayzerX has `IsDeviceConnected()`/`DisconnectDevice()` for
  manual lifecycle management but no automatic reconnect-with-backoff logic, and reactoscope's audio
  graph has nothing analogous today because Web Audio doesn't model "the DAC fell off the network."
- **The `oscilloscope` backend is the single most direct existing-code answer to reactoscope's own
  namesake problem**: drive a real oscilloscope's XY input from audio
  (`src/protocols/oscilloscope/backend.rs`). It independently arrived at two anti-glitch behaviors
  reactoscope doesn't currently have: on buffer underrun it **holds the last output sample** rather
  than snapping to `(0,0)` (avoiding a spike to screen center), and on mute it **ramps toward center
  over ~3ms** (`MUTE_RAMP_MS`) rather than cutting instantly. It also documents the one hard
  constraint that makes an oscilloscope different from a laser DAC in this whole comparison: *"the
  oscilloscope beam is always visible — there is no laser off state"* (`backend.rs:190-193`), so
  blanked points still have to output real X/Y position (mapped straight to L/R, no color) or the
  beam visibly jumps. reactoscope's Z-channel model already handles this correctly by construction
  (blanking dims to a continuous `-1`, it never removes the X/Y sample) — worth knowing this was a
  live risk in the underlying problem, and that reactoscope's existing design already avoids it,
  rather than never having been at risk.

## PlayzerX: a real MEMS-mirror laser projector, not a galvo

Every other project in this comparison targets, emulates, or abstracts over **dual galvo mirror**
hardware — the traditional ILDA convention (one moving-magnet/moving-coil galvo per axis). PlayzerX
targets something mechanically different: a single **biaxial MEMS mirror** chip that steers both X
and Y from one micro-mechanical device. That's not a minor implementation detail — it changes what
"corner safety" even means, and it's worth detailing on its own terms rather than folding into the
galvo-oriented sections above.

### Implementation

The API surface (`PlayzerX.h`) is deliberately thin — a connection lifecycle
(`CreateDevice`/`ConnectDevice`/`DisconnectDevice`), three point-submission families
(`SendDataXY`, `SendDataXYM`, `SendDataXYRGB`, each overloaded for a single sample, raw arrays, or
`std::vector`), and buffer-management calls (`GetSamplesRemaining`, `WaitForBufferLevel`,
`SetBufferUpdateTimer`). That's the entire surface — there is no `orderSegments` equivalent, no
transition/dwell composition, no output filter hook. A grep for "order," "sort," "nearest," "blank,"
"dwell," "transition," or "interpolat" across the whole implementation returns **zero matches**. The
host is expected to hand PlayzerX an already fully-prepared, already-safe point stream; the library's
only job is getting bytes onto the wire and reporting buffer depth back.

The wire protocol (`docs/PlayzerX USB Serial Protocol.rst`) is a simple framed binary format —
`"pl"` prefix, command code, length, payload, `\n` suffix — with X/Y quantized to **12-bit**
(0–4095, 2048 = origin) and color/modulation at 8-bit per channel. Two point formats exist, and
which one a given device speaks is a **hardware fact, not a runtime choice**: monochrome units
(`PX1-[R/G/B/V]`) speak `XYM` (9-byte samples, single modulation channel), RGB units (`PX1-RGB`)
speak `XYRGB` (11-byte samples). `PlayzerX::GetDataFormat()` reports which one you're connected to;
there's no code path that lets a monochrome unit accept RGB.

The device's onboard behavior is a genuine **circular FIFO** (`PlayzerX Programming Guide.rst:21`):
total capacity is **125,000 samples** for the monochrome buffer, **83,333 samples** for the RGB
buffer (same underlying memory, traded against the wider per-sample encoding). Two independent
rates govern it — the *write* rate (host → device, gated by USB serial throughput, "up to
approximately 50,000 samples per second," 500–625 KB/s) and the *read* rate (device → mirror,
governed entirely by `SetSampleRate`, default **22,000 samples/sec**, independently adjustable).
This is architecturally the same shape as laser-dac-rs's `NetworkFifo` model (a queryable queue the
host tops up asynchronously) — except here it's fully manual: there's no scheduler thread, no
automatic backpressure. The calling application is responsible for polling
`GetSamplesRemaining`/using `WaitForBufferLevel` and deciding when to refill — the same problem
laser-dac-rs's `OutputModel` scheduler solves automatically, left entirely to the caller here. None
of reactoscope, vectorsynthesis, xyscope.js, or LaserBoy ever encounter this problem in the first
place, because none of them write to a live hardware buffer with its own independent onboard clock
at all — reactoscope and xyscope.js are audio-rate software, vectorsynthesis's DAC is whatever PD's
own audio-rate signal drives, and LaserBoy's `.wav`/`.ild` are files written once, not a device
polled in real time.

### What makes it unique

- **Different actuator physics, not just a different vendor.** A dual-galvo rig has two separate,
  independently-damped mechanical servo loops. PlayzerX's single MEMS mirror is described in its
  own docs as **"a high-Q spring-mass system"** (`Programming Guide.rst:455`) — a resonant structure,
  not a heavily-damped one. That's a real, qualitatively different failure mode from anything
  LaserBoy's or laser-dac-rs's corner-dwell math was designed around.
- **The failure mode has a name and a hardware-side fix.** The docs explicitly warn about
  **"mechanical resonance and ringing"**: sending few points (`npts`) at a high sample rate produces
  sparse, jagged excursions that excite the mirror's resonance and cause visible overshoot/ringing in
  the waveform. The mitigation is an onboard low-pass filter on the controller — a **hardware-level**
  fix baked into the firmware, categorically different from every software mitigation seen elsewhere
  in this comparison (LaserBoy's angle-proportional dwell insertion, laser-dac-rs's quintic-eased
  transit). Neither of those techniques exists here at all; the device compensates for its own
  physics instead of asking the point stream to be gentler.
- **A genuine third interface mode with zero software in the loop.** Beyond USB, PlayzerX has an
  **Analog Input (AIN)** mode: three raw analog voltage channels (X, Y, intensity) drive the mirror
  directly, with *no software API involved at all* — the README states plainly "this Playzer system
  cannot be directly controlled via a software interface as it takes voltages as inputs." Third-party
  laser-show controllers (Pangolin QuickShow, Showtacle Moncha Lite) and even a bare NI-DAQ card
  drive it this way. This is structurally the same bet reactoscope, vectorsynthesis, and LaserBoy's
  audio-output path all make — "just send it voltages" — applied to a MEMS mirror instead of a galvo
  pair, and it's a mode reactoscope's existing 6-channel audio bus could in principle drive directly
  with a DAC/amp stage and no new library at all, if only 3 of its 6 channels (X, Y, one intensity)
  were needed.
- **Format is a SKU, not a config flag.** Every other project here carries a superset of fields
  (position + full RGB + intensity) and lets a backend or export path decide what to keep.
  PlayzerX's host and device must agree on `XYM` vs. `XYRGB` because that's which physical product
  you bought — there's no equivalent of laser-dac-rs's `LaserPoint` being converted down per-backend.

### Limitations

- **12-bit position resolution (4096 steps per axis)** — coarser than every other project in this
  comparison, all of which carry position as `f32`/16-bit-equivalent internally.
- **No corner-safety, ordering, or blanking-composition logic of any kind.** This is presented
  neutrally as a design choice (it's a thin hardware SDK, not an authoring tool), but it means
  *nothing* PlayzerX ships would catch the mechanical-ringing failure mode its own docs warn about —
  avoiding it is entirely on the calling application's point-generation code.
- **Manual, not automatic, backpressure.** Buffer-level management is the caller's job
  (`WaitForBufferLevel`, polled `GetSamplesRemaining`), with no equivalent of laser-dac-rs's
  `OutputModel` scheduler abstracting that away.
- **Minor spec inconsistency worth flagging, not glossing over**: `PlayzerX.h`'s own doc comment on
  `SetSampleRate` states a **200**–50,000 samples/sec range, while the USB Serial Protocol reference
  states **50**–50,000. Both can't be the authoritative lower bound; treat the protocol doc as
  more likely correct (it documents the wire format directly) but verify against real hardware before
  depending on the exact floor.
- **Platform and dependency footprint**: prebuilt Windows `.lib`/`.dll` artifacts, and the underlying
  `MTIDevice` layer bundles **OpenCV 2.4.13** binaries (a build from roughly 2013) for device
  enumeration — a materially heavier and older dependency chain than any other project in this
  comparison, all of which are either header/source-only or pull current package-manager
  dependencies.

## Points-per-second (kpps) budgeting

kpps is the one genuinely physical constraint in this whole comparison — a galvo mirror can only
redirect the beam so many times a second, full stop. Everything else discussed above (color,
blanking, ordering) is signal processing; kpps is the actual hardware bandwidth ceiling. Real laser
projectors run roughly 20–40 kpps typically, 60–100 kpps at the high end. Here's how each project
treats that ceiling — or doesn't.

- **reactoscope**: **no kpps concept exists anywhere in the codebase** — confirmed zero matches for
  "kpps," "pps," or "pointsPerSecond." The effective point rate is an emergent product of two UI
  sliders that don't know about each other: `coordBufferSize` (`GainControl.tsx:93-98`, a log2
  slider from 256 to 4096 points) × `scanFrequency` (`DawCanvas.tsx:215-216`, 0.1–192 Hz). That
  range spans **~26 points/sec to ~786,000 points/sec** — four orders of magnitude, with nothing
  flagging a physically-nonsensical combination anywhere in between. `VISIBLE_FRACTION`
  (`pathBuilder.ts:41`, the 0.85/0.15 geometry/blank split) is the only budget-allocation logic
  present, and it divides whatever `nPoints` was already chosen — it doesn't derive that number
  from any hardware ceiling. This is harmless today because the actual render target is a
  software-emulated or real oscilloscope tube (electron-beam deflection has no comparable
  mechanical bandwidth limit), but it means reactoscope has nothing today that would catch a
  configuration a real galvo couldn't physically draw.
- **vectorsynthesis**: the audio sample rate *is* the point rate, with no reconciliation logic on
  top. Every Pd audio sample is one point — there's no separate resample stage the way reactoscope
  has one. Whatever sample rate the audio interface runs at (44.1/48/96kHz commonly) becomes the
  point rate, chosen by picking an audio device, not by any patch-side kpps awareness.
  `vs-decimate.pd` exists for manually thinning point density, but nothing in it computes what
  decimation factor a given hardware's real kpps ceiling would actually require — consistent with
  the ADR-0008 finding that its ILDA output stage does amplitude clipping only, no rate limiting.
- **xyscope.js**: not applicable — it never targets galvo hardware, so mechanical kpps isn't a
  constraint it has any reason to model. Its Lanczos resampling is a rendering-quality concern, not
  a hardware-safety one.
- **LaserBoy**: the most kpps-literate of the group prior to laser-dac-rs. `sample_rate` is a
  first-class, per-physical-rig-calibrated setting, and it's the literal unit every corner-safety
  formula is expressed in (`start_dwell_vertices`, `linear_steps`, etc. all take it directly).
  `still_frame_duration` (`LaserBoy_space.hpp:170`, default 10 seconds) drives an explicit
  computation converting a fixed kpps budget into a repeat count — `total_frame_scans =
  ceil(sample_rate × still_frame_duration / …)` (`LaserBoy_frame.cpp:5701`) — so "how many times do
  I redraw this frame to fill N seconds at this point rate" is a computed quantity, not something
  left to the user. What it does *not* do: validate that a single frame's own point count is sane
  for a flicker-free redraw rate — an overly complex frame simply takes longer to draw once,
  silently, with no warning.
- **laser-dac-rs**: by far the most rigorous, and the only one treating kpps as a **hardware-reported
  fact** rather than a user setting. `DacCapabilities { pps_min, pps_max, max_points_per_chunk }`
  (`src/device.rs:246`) is populated per real device:

  | DAC | `pps_min` | `pps_max` | `max_points_per_chunk` |
  |---|---|---|---|
  | Helios | 7 | 65,535 | 4095 |
  | Ether Dream | 1 | 100,000 | 1799 |
  | IDN | 1 | 100,000 | 179 |
  | LaserCube USB | 1 | 35,000 | 4096 |
  | AVB / oscilloscope | 1 | 100,000 | 4096 / ring-buffer-sized |
  | LaserCube Network | 1 | **queried live from the device** | protocol-negotiated |

  Two things here are more advanced than anything else in this comparison. First,
  **LaserCube Network doesn't trust a hardcoded spec number** — `resolved_point_rate_max(status)`
  reads the *actual connected unit's* self-reported ceiling, and `clamp_point_rate` clamps a
  requested rate down to it live (`src/protocols/lasercube_network/mod.rs:40-66`). Nobody else here
  does hardware-verified, as opposed to assumed, kpps enforcement. Second, **it names the low-end
  failure mode too**, not just the high-end one: the `pps_min` field's own doc comment states plainly
  that too-low a PPS "increases point dwell time and can produce flickery output" — every other
  project in this comparison only worries about *too many* points, never *too few*. Enforcement is
  real but narrower than it first looks: `pps_min`/`pps_max` are checked in `reconnect_validator`
  (`src/presentation/session.rs:395-412`, with a test explicitly named "PPS 500 is below
  pps_min=1000 — should be rejected even with reconnect") — guarding a reconnect into a *different*
  device that can't sustain the rate already running. There is no equivalent hard rejection visible
  on the very first `start_frame_session` call itself, worth being precise about rather than
  overclaiming a universal gate. Separately, two backends (`oscilloscope`, `avb`) aren't native
  variable-point-rate protocols at all — they're audio interfaces clocked at a fixed sample rate.
  `StreamingResampler` (`src/resample.rs`) is what reconciles an arbitrary requested `pps` against
  that fixed rate (confirmed via the oscilloscope backend's own
  `resamples_up_to_sample_rate`/`resamples_down_to_sample_rate` tests) — the same uniform `pps`
  config works whether the backend is genuine point-rate hardware or a repurposed sound card.

- **PlayzerX**: the only project here where kpps limits come from **real, measured hardware
  behavior** rather than a config field or a protocol spec sheet — see the dedicated section above
  for the full detail. In short: two independent rates (write ≤ ~50,000 samples/sec over USB
  serial, read/mirror-playback set explicitly via `SetSampleRate`, default 22,000/sec, device docs
  claim up to 50,000/sec), plus a **mechanical** failure mode neither reactoscope, LaserBoy, nor
  laser-dac-rs has to reason about: too few points at too high a sample rate excites the MEMS
  mirror's own resonance and rings, independent of anything a software dwell/interpolation algorithm
  would catch, because the cause is physical (a high-Q spring-mass system), not a signal-processing
  gap.

reactoscope currently has the least kpps-awareness of the group despite being the only genuinely
live, real-time system in it — even vectorsynthesis and LaserBoy make their kpps explicit, if only
because it's just their sample rate. If real laser output ever becomes a goal, laser-dac-rs's
`DacCapabilities{pps_min, pps_max, max_points_per_chunk}` is the cleanest adoptable shape to
validate against — `coordBufferSize × scanFrequency` is exactly the "requested pps" its config
takes. A cheap, hardware-independent step available today: surface that product as a computed kpps
readout in the UI and flag it once it clears a realistic ceiling (e.g. ~60 kpps) — no laser-dac-rs
dependency required yet, but it plants the concept before hardware forces the issue.

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
  existing graph for free. `MasterOutput`'s R/G/B/Z inputs (`in-2`..`in-5`) are each a plain `Gain`
  node (`audioCore.ts:66-69`), wired like any other audio input; Web Audio sums whatever connects to
  a `Gain`. Patching an LFO (or any node) into Master Output's R/G/B/Z directly — instead of, or
  alongside, Scene Input's own R/G/B/Z output — already produces continuous phase-driven color
  cycling independent of geometry, with no new node type required. No action needed here; noting it
  so it's findable rather than re-derived later.
- **Render/synth coupling**: reactoscope generates the coord buffer and renders it in the same
  app, one frame apart. vectorsynthesis assumes the opposite by design — PD produces the analog
  signal and hands it to whatever external hardware or emulator draws it; xyscope.js is the mirror
  image again, a pure renderer that assumes the audio already exists and generates nothing itself.
  reactoscope currently occupies the middle position (owns both ends), which is a real design
  choice worth naming explicitly, not an accident — it's what makes the live/patchable DAW model
  possible, at the cost of the modularity the other two get from staying on one side of the line.
  laser-dac-rs adds a third position rather than fitting either end: it owns *neither* generation nor
  rendering, only delivery — the caller generates points, real hardware (or nothing) renders them,
  and laser-dac-rs is pure middleware. If reactoscope ever separates its coord-buffer generator from
  its renderer, laser-dac-rs's `Frame`/`Stream` API split is a working example of what the seam in
  between can look like. PlayzerX occupies the same third position as laser-dac-rs — pure
  delivery, no generation, no rendering — but without any of the scheduling/safety logic layered on
  top; it's the delivery position stripped down to just the wire and a buffer-depth counter.
- **Live vs. offline authoring loop**: vectorsynthesis's WKT/3D-model import
  (`wkt_parse.py`, `lines_vertices.py`) is a one-time, human-in-the-loop, offline conversion step
  producing static tables — there is no live-editing equivalent of reactoscope's node-graph DAW.
  LaserBoy is offline in the same sense but *is* trying to be an editor — just a frame-at-a-time,
  keyboard-driven one (`LaserBoy/CLAUDE.md`: "deliberately mouse-free... every keystroke re-renders
  the current state") with no notion of a live signal graph; a session is edit-then-export, not
  patch-and-listen. reactoscope's entire premise (a DAW where geometry is live, patchable, and
  reactive) has no counterpart in vectorsynthesis, xyscope.js, or LaserBoy. laser-dac-rs is the
  outlier here and the closest structural match to reactoscope's own posture, despite being a
  library rather than an app: its Frame API is explicitly designed for continuous live updates —
  "submission is zero-copy latest-wins: if the engine hasn't consumed the previous frame yet, the
  new one replaces it with no buffering or memory growth" (`README.md:95-97`) — which is a
  description of reactoscope's own per-frame `buildCoordBuffer`-replaces-the-worklet's-buffer
  pattern in different words, arrived at independently for a different reason (real-time
  procedural/audio-reactive content, per its Streaming API docs) rather than copied from it.
  PlayzerX has no authoring loop at all, live or offline — it's a hardware SDK, not an app;
  "authoring" happens entirely in whatever calls it.
- **Optimization as a pipeline stage vs. a menu command**: reactoscope's `orderSegments` /
  `buildCoordBuffer` run unconditionally, every frame, as fixed stages of the render loop — there's
  no "unoptimized" mode. LaserBoy's equivalent routines (`reduce_lit_vectors`, `reorder_segments`,
  `remove_dwell_vertices`, etc.) are opt-in destructive edits a human chooses to apply from an
  effects menu, except for the `add_dwell`/span-interpolation pass, which is the one piece that
  *is* unconditional — but only on the `.wav` export path, not the `.ild` path. Worth keeping in
  mind when translating any LaserBoy technique into reactoscope: LaserBoy treats "am I about to hit
  real DAC/galvo hardware" as the trigger for mandatory optimization, and reactoscope's coord buffer
  is *always* about to hit real hardware (a speaker, at minimum), which is actually a stronger case
  for running corner/curvature-aware logic unconditionally than LaserBoy's own default posture.
  laser-dac-rs lands on the same side as reactoscope's own posture here, for the same reason:
  transition blanking runs unconditionally on every seam (a caller can only swap in a *different*
  transition function via `with_transition_fn`, not skip composition entirely short of supplying an
  empty one), because every `Frame` it accepts is, by construction, headed for real hardware.
</content>
