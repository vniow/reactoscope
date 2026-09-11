# Galvo corner-safety path generation — implementation spec

Implementation spec for the graph-based path-ordering pipeline that replaces `orderSegments` when
corner-safety is enabled. The *decisions* and their rationale live in
`docs/adr/0011-galvo-corner-safety.md`; this document is the how. Vocabulary is defined in
`CONTEXT.md`.

Built, behind `GalvoContext.cornerSafetyEnabled` (default `false`). Disabled, every function this
spec describes is unused and behaviour is bit-for-bit identical to before this work.

## What it is

A drop-in alternative to `orderSegments` + `buildCoordBuffer`'s fixed-size resample, used by
`pathWorker.ts` when `cornerSafetyEnabled` is on. Where `orderSegments` greedily walks segments by
nearest endpoint with no awareness of turn angle or blank-transition safety, this pipeline finds a
single Eulerian circuit through the frame's geometry — visiting every lit edge exactly once, with the
fewest possible blank-travel jumps — and interpolates it with extra points at sharp corners and
blank transitions, growing the output buffer past its usual fixed size when that safety costs more
points than the frame's usual budget allows.

## What it is not

It is a **path-generation** discipline, not a calibrated hardware guarantee — same honesty boundary
as the Galvo Laser emulator's Scanner Model (ADR-0010). It optimises against the *commanded* path;
nothing here has been validated against a real scanner's step response. It does not feed back from
the Scanner Model's tracking-error readout (ADR-0011, sub-decision 8) — that stays manual.

## Signal chain

```
  collectSegments (unchanged)
        │
        ▼
  buildPointGraph            [pointGraph.ts]
    dedupe endpoints, skip blank-floor segments,
    dedupe overlapping edges
        │
        ▼
  buildEulerGraph            [eulerGraph.ts]
    connected components → odd-degree nodes →
    greedy nearest-neighbour pairing (within component,
    then across components) → add blank edges
        │
        ▼
  buildEulerCircuit          [eulerCircuit.ts]
    Hierholzer's algorithm, straightest-continuation
    tiebreak at each vertex
        │
        ▼
  interpolateEulerCircuit    [cornerInterpolate.ts]
    per-edge distance/corner-angle profile → minimum
    point counts → excess distributed by lit distance,
    capped at maxPoints (kpps ceiling) →
    Float32Array, COORD_STRIDE=6, variable length
        │
        ▼
  pathWorker.ts → same wire format as buildCoordBuffer today
```

If the point graph has nodes but no lit edges at all (an isolated-`Points`-only scene), or the
circuit comes back empty, `graphPath.ts` falls back to `orderSegments`/`buildCoordBuffer` for that
frame — see ADR-0011, sub-decision 9.

## The pipeline stages

### `pointGraph.ts` — `buildPointGraph(segments, blankFloor)`

Each `Segment`'s two endpoints become graph nodes, deduplicated by quantized position + colour (safe
within one `collectSegments` pass — see ADR-0011's known limitations for the cross-object caveat). A
segment is skipped entirely when both endpoints would register as blank output
(`2*intensity-1 <= blankFloor`, reusing `GalvoContext.blankFloor`). Duplicate/overlapping edges
between the same two nodes are added once, not twice. A zero-length segment (a `THREE.Points` dwell
point) becomes an isolated node with no edge, surfacing as its own connected component downstream.

### `eulerGraph.ts` — `buildEulerGraph(pointGraph, startPos)`

Finds connected components (union-find over lit edges), then per component:

- **All-even degree already** (a closed loop, or an isolated point): no blanks needed internally. If
  more than one component exists overall, one node is reserved as a self-connecting anchor.
- **Odd-degree nodes present**: paired by greedy nearest-neighbour (`greedyPairByDistance`). If this
  is the *only* component in the frame, every pair becomes a real blank edge immediately. Otherwise,
  all but one pair are resolved as internal blanks, and the last pair is reserved as the component's
  two connection ports.

If more than one component needs connecting, `chainConnectors` orders them by greedy nearest-neighbour
starting near `startPos` — the same "closest remaining endpoint" idea `orderSegments` already uses,
just applied to "component with two ports" instead of "segment with two endpoints" — and closes the
chain into a cycle so every reserved port gets exactly one new edge, flipping its parity to even.

### `eulerCircuit.ts` — `buildEulerCircuit(eulerGraph)`

Hierholzer's algorithm. At each vertex, among untraversed edges, always continues with whichever is
closest to a straight line from the edge just walked (`straightAngleVariance`) — the same
"prefer the straightest continuation" heuristic lasy's own traversal uses. Returns `[]` for a graph
with fewer than two nodes or no edges; callers fall back for that case.

### `cornerInterpolate.ts` — `interpolateEulerCircuit(points, circuit, config, targetPoints, maxPoints)`

Profiles each circuit edge (distance and turn angle for lit edges; nothing for blank edges), computes
a minimum point count per edge, then:

- **Room to spare** (minimums fit within `maxPoints`): allocate minimums, then distribute any
  remaining room — up to `min(targetPoints, maxPoints)` — across lit edges weighted by distance.
- **Not enough room**: blank edges keep their full minimum unconditionally; lit edges are scaled down
  proportionally, floored at 1 point each. `overflowed: true` is reported (for a future kpps
  readout — see ADR-0010 sub-decision 9's display-only precedent; no UI reads it yet).

A blank edge always emits at least `BLANK_MIN_POINTS (3) + blankDelayPoints`: the edge's start point
still lit, then that same position blanked, then the target position blanked, then `blankDelayPoints`
more copies of the blanked target — the same two-pinned-marker shape `buildCoordBuffer` already uses
at `pathBuilder.ts:316-326` to avoid a leaking diagonal, independently arrived at by lasy.

### `graphPath.ts` — `buildGraphCoordBuffer(segments, startPos, config, targetPoints, maxPoints)`

Orchestrates the four stages above and falls back to `orderSegments`/`buildCoordBuffer` for an empty
scene, an edge-free point graph, or an empty circuit. Deliberately does **not** re-implement
`buildCoordBuffer`'s own prevEnd-anchored lead-in — the worklet's existing phase-matched buffer swap
(`sceneInputProcessor.worklet.js`, finds the nearest point in the new buffer to the current beam
position on every swap) already handles inter-frame continuity generically, regardless of which
pipeline produced the buffer. Adding a second mechanism on top would be redundant, not safer.

## Parameters

All in `GalvoContext`, `galvo.*` keys, following ADR-0010 sub-decision 8's "every parameter directly
adjustable" convention — no preset layer.

| Parameter | Unit | Range | Default | Notes |
|---|---|---|---|---|
| `cornerSafetyEnabled` | bool | — | `false` | Master toggle. Off reproduces today's exact behaviour |
| `radiansPerPoint` | rad/point | 0.1 – 3.2 | 0.6 | Lower = more dwell per unit of turn (lasy default) |
| `distancePerPoint` | points/unit | 0.5 – 40 | 5 | Density floor for a lit edge |
| `blankDelayPoints` | points | 0 – 64 | 10 | Extra points held at the end of every blank transition |
| `kppsCeiling` | points/sec | 5,000 – 200,000 | 60,000 | Practical ceiling; real projectors run ~20-40kpps typically, ~60-100kpps at the high end |

The audio-rate anti-foldover ceiling (`sampleRate / scanFrequency`, the same one
`useSceneToAudio.ts` already computes for the fixed-size path) always applies too — the actual cap
sent to the worker is `min(sampleRate/scanFrequency, kppsCeiling/scanFrequency)`.

## Worker protocol addition

```
{ type: 'setCornerSafety', enabled: boolean,
  config: { radiansPerPoint, distancePerPoint, blankDelayPoints, blankFloor },
  maxPoints: number }
```

Sent by `useSceneToAudio.ts` whenever any of the above (or `scanFrequency`) changes, mirroring the
existing `setCoordBufferSize` message. `pathWorker.ts` branches on `enabled` per frame; the `path`
reply gains two new fields, `minPointsNeeded` and `overflowed`, always present (zero/`false` on the
non-graph path) — plumbing for a future kpps readout, not a UI change in this pass.

## File layout

```
src/scene/
  pointGraph.ts             new — point-graph construction, blank-floor skip, edge dedup
  pointGraph.test.ts        new
  eulerGraph.ts             new — components, distance-aware odd-node pairing, cross-component chaining
  eulerGraph.test.ts        new
  eulerCircuit.ts           new — Hierholzer's algorithm, straightest-continuation tiebreak
  eulerCircuit.test.ts      new
  cornerInterpolate.ts      new — edge profiling, min-point counts, buffer emission
  cornerInterpolate.test.ts new
  graphPath.ts              new — orchestrator, fallback handling
  graphPath.test.ts         new
  pathWorker.ts             modified — setCornerSafety message, branch per frame
  useSceneToAudio.ts        modified — reads GalvoContext, computes maxPoints, sends config
src/contexts/
  GalvoContext.tsx          modified — cornerSafetyEnabled, radiansPerPoint, distancePerPoint,
                             blankDelayPoints, kppsCeiling
src/components/scope/
  GalvoControl.tsx          modified — toggle + four sliders
```

## Known limitations

See ADR-0011's "Known limitations, recorded deliberately" — exact-position node dedup across
different scene objects, the soft (not hard) point-budget cap under extreme overflow, and the
carried-over honesty boundary.
