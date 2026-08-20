---
status: accepted
---

# Galvo corner-safety blanking is deferred, not solved by the existing blank flag

Laser output (driving real ILDA/galvo hardware) is a real goal for reactoscope, not just framing —
but the priority right now is preparing the audio pipeline to be laser-ready, not building
laser-specific safety features ahead of need. This entry exists so that decision is written down
rather than rediscovered when laser work actually starts. See `docs/architecture-comparison.md`
for the full comparison this is drawn from.

`buildCoordBuffer`'s single `blank` field (`COORD_STRIDE`, `pathBuilder.ts`) already covers what it
needs to: hiding beam travel between disconnected segments, the same job vectorsynthesis's
`masterblank~` shape-transition blanking does (`vs-multiplex.pd`). That part isn't a gap.

What's genuinely unsolved — in reactoscope *and* in both reference projects checked
(vectorsynthesis, xyscopejs) — is **corner/galvo-overshoot safety**: real galvo-driven laser
projectors need the beam to slow down or blank briefly at sharp direction changes, or scan-rate
limits enforced, to avoid burning the phosphor/mirror coating or producing visible overshoot
artifacts at corners. Checked directly:

- `vs-decimate.pd` is a sample-and-hold + lowpass smoother (point-density reduction), not a
  corner-angle detector — it does not address this.
- `vs-output-ILDA.pd` / `vs-ilda-throw.pd`, vectorsynthesis's actual hardware-output stage, only
  does amplitude clipping (`clip~ -1 1` on X/Y) — no corner detection, no dwell-at-corners, no
  scan-rate limiting.
- xyscope.js has no blanking mechanism of any kind (confirmed: zero matches for "blank" in
  `xyscope.js`), so it has nothing to compare against here either.

So there's no existing pattern to crib from — this would be new design work, not integration of a
known technique. Given that, and that laser hardware isn't in hand yet, corner-safety blanking is
explicitly **not** being designed or built now. When laser work starts, expect it to require:

- Deciding whether corner-safety is a `pathBuilder.ts` concern (inject slow-down/blank points at
  high-curvature vertices during `buildCoordBuffer`) or a downstream DAC-adapter concern (a laser
  output stage that post-processes the existing coord buffer) — these have different blast radii on
  the existing format.
- Possibly widening `COORD_STRIDE`'s `blank` field beyond a 0/1 flag if corner-safety and
  shape-transition blanking ever need to be independently controlled (they're conflated today,
  which is fine while only one of them exists).
- Scan-rate caps, which have no representation anywhere in the current pipeline at all.

## Considered Options

- **Widen the blank flag / add corner-safety logic now** — rejected: no laser hardware in hand yet
  to validate against, and there's no reference implementation in either comparison project to
  build from. Speculative design here risks solving the wrong problem.
- **Defer, but log it explicitly** — chosen: keeps current work focused on the audio pipeline, while
  ensuring this gap is found deliberately (via this ADR) rather than discovered mid-way through a
  future laser-integration push.
</content>
