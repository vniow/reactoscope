---
status: accepted
---

# Galvo corner-safety is built, behind a toggle — un-deferring ADR-0008

ADR-0008 deferred galvo corner-safety on two grounds: no laser hardware in hand, and no reference
implementation to build from. `docs/architecture-comparison.md` subsequently found two working
techniques (LaserBoy's angle-proportional dwell, laser-dac-rs's quintic-eased transition), and this
ADR adds a third, structurally different one — lasy's Eulerian-circuit draw-order optimisation —
read directly from source (`nannou-org/lasy`, `src/lib.rs`, not secondhand from its docs). The
"no reference implementation" ground is dead. The "no hardware" ground still holds, and is why this
lands behind a toggle rather than replacing the existing pipeline outright.

See `docs/galvo-corner-safety.md` for the implementation spec. This entry is the *why*.

## Decision

Replace `orderSegments`' greedy nearest-neighbour with a graph-based pipeline — point graph → Euler
graph → Euler circuit → corner/blank-aware interpolation — implemented in
`src/scene/{pointGraph,eulerGraph,eulerCircuit,cornerInterpolate,graphPath}.ts`, gated by
`GalvoContext.cornerSafetyEnabled` (default `false`). Disabled, behaviour is bit-for-bit identical
to today. Nine sub-decisions, each with the alternative that was rejected.

### 1. Un-defer the real pipeline, not just the emulator

`buildCoordBuffer`/`orderSegments` are the seam every consumer shares — the audio worklet, the CRT
emulator, and the Galvo Laser emulator all read the one Master Output buffer these functions
produce (`CONTEXT.md`'s Master Output concept). Improving only what the Galvo Laser *emulator*
renders would build corner logic in a layer nothing else consumes, while the real seam sits there
already understood. The Scanner Model (ADR-0010) is the measuring instrument that makes this
decision evaluable; it was never going to make the decision itself.

### 2. Corner-safety lives upstream, in pathBuilder's own module family — not a downstream adapter

ADR-0008 named two candidate homes: `pathBuilder.ts` itself, or a downstream DAC-adapter that only
laser-facing output would pass through. A downstream-only adapter would fork the one signal
`CONTEXT.md`'s Master Output concept is explicit about — CRT view, real audio, and eventual laser
output would each see a different path. The fixed point-budget trade-off also has to be visible to
the code that already owns budget allocation.

### 3. The coordinate buffer becomes variable-length when corner-safety is on

lasy's own `interpolate_profiled_path` treats its target point count as a *floor*, not a ceiling
(`lib.rs:1059-1060`): if corner-dwell and blank-transition minimums exceed the requested target, it
emits more points, not fewer. `buildCoordBuffer`'s contract is the opposite — a hard fixed-size
`Float32Array`. Reconciling this is why `buildGraphCoordBuffer` (`graphPath.ts`) takes a
`targetPoints` (density preference — today's `coordBufferSize`) and a separate `maxPoints` (a hard
cap), rather than a single fixed size. `maxPoints` is `min(sampleRate / scanFrequency, kppsCeiling /
scanFrequency)` — the audio-rate anti-foldover limit `useSceneToAudio.ts` already computes for the
fixed-size path, and the practical kpps ceiling `docs/architecture-comparison.md`'s kpps section
already named as available and ADR-0010 spec'd as display-only (sub-decision 9) but never built as
an enforced number. This is that number, finally enforced rather than only read out.

Below `maxPoints`, excess room is distributed across lit edges weighted by distance, same as lasy.
Above it, lit-edge point budgets are scaled down proportionally — blank-transition points are never
scaled below their structural minimum, because a shortened blank transition isn't a smaller version
of the same thing, it's the leaking-diagonal artifact `buildCoordBuffer`'s own two-marker trick
(`pathBuilder.ts:316-326`) exists to prevent.

### 4. Draw order comes from an Euler circuit, not greedy nearest-neighbour — with one deliberate improvement over lasy

Read directly, lasy's graph pipeline (`point_graph_to_euler_graph` + `euler_graph_to_euler_circuit`,
`lib.rs:529-796`) is O(V+E) — Kosaraju's SCC plus Hierholzer's algorithm with a straightest-edge
tiebreak, no worse than the greedy walk already running every frame. It gives two guarantees greedy
nearest-neighbour doesn't: every lit edge traversed exactly once (no wasted budget redrawing
duplicate/overlapping geometry — `pointGraph.ts`'s edge dedup), and a provably minimal blank-edge
*count*.

Its one real weakness: the odd-degree-node pairing that decides which blank edges make the graph
traversable is arbitrary — whatever order the graph handed the nodes — not distance-optimal.
`eulerGraph.ts` pairs them by greedy nearest-neighbour instead, both within a component
(`greedyPairByDistance`) and when chaining separate components together (`chainConnectors`, which
reuses `orderSegments`' own "closest remaining endpoint" idea at the component-with-two-ports
granularity). Minimal blank count *and* short blank jumps, strictly better than either project's
approach alone.

### 5. Ported to TypeScript, not bound via WASM

No Rust/WASM toolchain exists anywhere in this project. Sub-decision 4 already means deviating from
lasy's stock pairing logic, so binding the crate unmodified was never fully on the table — either
path means maintaining patched logic somewhere. The algorithms involved (Kosaraju's SCC,
Hierholzer's traversal, atan2-based turn angle) are bounded, well-understood, and now ported as
`src/scene/{pointGraph,eulerGraph,eulerCircuit,cornerInterpolate}.ts`, with lasy's own square-loop
and two-disjoint-segment test cases ported alongside as the equivalent Vitest suite rather than
relying on upstream's coverage.

### 6. Blank classification reuses GalvoContext's existing blankFloor — no new channel, no second threshold

ADR-0009 already made the Z channel the sole blanking mechanism — "there is no separate on/off
flag" (`CONTEXT.md:17-18`). lasy's `IsBlank`/`Blanked` traits need a boolean at exactly one point
(`pointGraph.ts`'s edge-skip check), a software predicate internal to graph construction, discarded
immediately after — never a new signal. `GalvoContext.blankFloor` (Z at or below which output is
truly zero) already answers "what counts as off" for the emulator; a second, independent threshold
for the same idea would be the actual inconsistency ADR-0009 was written to prevent.

### 7. New tunables are context-level settings, not DAW node parameters

`radiansPerPoint`, `distancePerPoint`, `blankDelayPoints`, `kppsCeiling`, and the corner-safety
toggle itself all live in `GalvoContext`, read once per frame in `pathWorker.ts` — not exposed as
automatable DAW node inputs the way Scene Input's `scanFrequency` is. `orderSegments`/
`buildCoordBuffer` (and now `buildGraphCoordBuffer`) already recompute once per *frame*, the same
control-rate granularity `scanFrequency` and `coordBufferSize` already have — nothing is lost by not
wiring audio-rate modulation to a value that can't be sampled faster than the per-frame recompute
anyway. Matches the existing Scanner Model precedent rather than inventing a new one. Promoting a
param to a real DAW node input — "corner dwell responds to the kick drum" — is a legitimate future
request, not the default while this is still a stress-test-gated toggle.

### 8. The Scanner Model's readout does not feed back into path generation

An obvious next idea once real corner-dwell logic exists: auto-tune `radiansPerPoint` from the
Scanner Model's measured tracking error. Explicitly **not built**. ADR-0010's honesty boundary is
the reason — "directionally correct, not calibrated… any UI that implies otherwise is a defect." An
auto-tuning loop built on an admittedly-uncalibrated servo model would compound that uncertainty,
not just inherit it: real output steered by a model nobody has measured against real hardware.
Written down here as a named non-goal, the same way ADR-0008 and ADR-0010 both did for what they
punted, so it's found deliberately later rather than rediscovered.

### 9. A graph with no lit edges falls back to the existing pipeline for that frame

Hierholzer's algorithm has nothing to do with zero edges — an isolated-`Points`-only scene (no
`Line`/`LineSegments` geometry at all) produces a point graph with nodes but no edges.
`buildGraphCoordBuffer` detects this and defers to `orderSegments`/`buildCoordBuffer` unchanged for
that frame, rather than teaching the graph machinery a degenerate case the existing greedy walk
already handles correctly.

## Known limitations, recorded deliberately

- **Exact-position node dedup.** `pointGraph.ts` deduplicates graph nodes by hashing quantized
  position + colour. Safe within one `collectSegments` pass (a shared vertex between adjacent
  segments is recomputed from the same matrix and index, bit-identical) — not safe across two
  different `THREE.Object3D` instances whose geometry happens to touch, which would need explicit
  position-snapping this implementation doesn't add.
- **Soft, not hard, point-budget cap.** Under extreme overflow (far more lit edges than `maxPoints`
  can hold even at one point each), the per-edge `Math.max(1, …)` floor can push the total slightly
  past `maxPoints`. Bounded by edge count, not unbounded, but worth knowing before treating
  `maxPoints` as an absolute hardware guarantee.
- **Honesty boundary carries over unchanged.** Everything here optimises against the *commanded*
  path, same as `orderSegments` does today — not validated against a real scanner's actual step
  response. Sub-decision 8 is what keeps that calibration gap from silently reappearing through a
  feedback loop.

## Considered Options

- **Emulator-only improvements** — rejected: builds corner logic in a layer nothing but one view
  consumes, while the real shared seam sits there unchanged.
- **A downstream DAC-adapter instead of an upstream pathBuilder change** — rejected: forks the one
  signal every consumer is supposed to share.
- **Keep the fixed-size buffer, clamp corner-dwell to whatever's left over** — rejected: corner-dwell
  and the existing resampler would fight for space every frame with no visibility into which one
  lost, and by how much.
- **An angle-cost tweak to greedy nearest-neighbour, instead of the full Euler-circuit rewrite** —
  reconsidered once a source read showed lasy's real pipeline is O(V+E), not the more expensive
  matching problem it was assumed to be; rejected once performance was no longer the blocker.
- **Bind the lasy crate via WASM instead of porting it** — rejected: no Rust/WASM toolchain exists
  here, and sub-decision 4 already means running patched logic that isn't upstream lasy anyway.
- **DAW-automatable node parameters for the new tunables** — deferred, not rejected: a legitimate
  future request, just not needed at control-rate granularity today.
- **Auto-tuning corner-dwell from the Scanner Model's tracking error** — rejected: compounds an
  admittedly-uncalibrated model's uncertainty into real output, against ADR-0010's honesty boundary.

## Related

- `docs/adr/0008-laser-corner-safety-deferred.md` — the deferral this ADR closes out
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the continuous Z channel `blankFloor`
  classification reuses
- `docs/adr/0010-galvo-laser-beam-emulator.md` — the Scanner Model and its honesty boundary
- `docs/galvo-corner-safety.md` — the implementation spec
- `docs/architecture-comparison.md` — LaserBoy, laser-dac-rs, vectorsynthesis, xyscope.js, PlayzerX,
  Oscilloclock comparison this decision draws on, plus the kpps-budgeting section this ADR finally
  builds an enforced number for
