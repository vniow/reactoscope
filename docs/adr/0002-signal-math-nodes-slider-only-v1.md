---
status: accepted
---

# Add/Multiply/GreaterThan ship slider-only, not two-signal wiring

Tone.js's second operand for `Add`, `Multiply`, and `GreaterThan` (`.addend`/`.factor`/
`.comparator`) is a `Param`, not a second `InputNode` — a different attachment point than the
`in-N → toneNode.input` convention every handler in `nodeHandler.ts` currently assumes. True
two-signal wiring (a second handle connected directly to that `Param`) would be the more capable
design, but it means widening the handle→input contract for the first time, which deserves its
own deliberate design pass rather than landing incidentally inside a Tier 2 node batch. We're
shipping v1 as a single audio-in handle + a value slider for the constant operand, matching
`gain.ts`'s existing pattern exactly. Two-handle wiring to the `Param` remains a flagged, explicit
future extension — not something to bolt on silently later.

## Considered Options

- **Two-handle wiring now** — rejected for this batch: changes a core handler contract
  (`nodeHandler.ts`'s in-N→input assumption) as a side effect of routine node buildout, not as its
  own reviewed decision.
- **Slider-only v1** — chosen: ships fast, matches an established pattern, defers the contract
  change to when it's deliberately designed.
