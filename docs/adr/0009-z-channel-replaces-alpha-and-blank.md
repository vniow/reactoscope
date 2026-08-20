---
status: accepted
---

# Alpha channel and the blank flag collapse into a single analog Z channel

`COORD_STRIDE` used to carry two separate signals for "should the beam be visible here": a
continuous alpha channel (`a`, the 6th field) and a binary `blank` flag (the 7th field). This ADR
records why they became one field, and why that field is called `z` rather than `a`.

## Context

`blank=1` forced R/G/B/A to `-1` while the beam kept moving between disconnected segments
(`buildCoordBuffer`, `pathBuilder.ts`) — see ADR-0008, which already noted this flag "already
covers" shape-transition blanking and flagged, as a future possibility, "widening `COORD_STRIDE`'s
`blank` field beyond a 0/1 flag if corner-safety and shape-transition blanking ever need to be
independently controlled."

Investigating an unrelated interpolation bug (a faint leaked line at blank/visible boundaries)
surfaced that the two fields were already redundant in practice: `buildCoordBuffer` was never
actually writing vertex-color alpha into the `a` slot — for every visible point it wrote
`2*intensity-1`, the same per-vertex `intensity` value (`geometry.attributes.intensity`, or a depth
fallback) that also drives the renderer's brightness modulation (`fsLine.glsl`, `vColor.a`). So
`a` was already an intensity channel in every code path that mattered; `blank` was a second,
cruder on/off signal layered on top of it, and the worklet needed a boundary hack
(`blank = coords[o0+6] > 0.5 || coords[o1+6] > 0.5`) specifically to stop that crudeness from
leaking through linear interpolation.

## Decision

Collapse both into one field: `z`, continuous in `[-1, +1]`. `-1` is fully blanked, `+1` is full
intensity, and everything between is a real dimming — not a color property, an *intensity* one.
`COORD_STRIDE` drops from 7 to 6. The worklet no longer branches on a flag; it linearly interpolates
`z` exactly like every other channel, which incidentally removes the boundary-leak bug at its root
instead of patching around it.

Renamed `A`/`Alpha` → `Z` everywhere this channel is named — `ChannelId`, `CHANNEL_LABEL`,
`WaveformFrame`, `inputGainA`/`aAnalyser` → `inputGainZ`/`zAnalyser`, the Master Output / Scene
Input node handle labels, `CONTEXT.md`. "Z" matches how a real oscilloscope or laser names this
control (the Z axis: intensity/blanking, orthogonal to X/Y deflection) — see the "Alpha / Z /
blanking channel" section of `docs/architecture-comparison.md`, which already used "Z" to describe
vectorsynthesis's equivalent signal. "Alpha" was always a misnomer here; it was never compositing
transparency, just an intensity control that happened to reuse the RGBA vertex-color slot it
travels through on the way to the shader.

GLSl/attribute-naming `a`-prefixes (`aColor`, `vColor.a`, `aColorArray`) are untouched — those are a
graphics naming convention (attribute prefix, vec4 alpha component), not the channel name; only
their comments now note that they carry the Z value.

## Non-goals

This does not add corner-safety blanking (still deferred per ADR-0008) or a second independent
blanking mechanism (vectorsynthesis's raster-window vs. shape-transition split). It only removes
the redundant boolean and gives the remaining continuous signal an accurate name. If corner-safety
blanking is built later, it composes into this same analog `z` value — there's no flag left to
widen.

## Considered Options

- **Keep both fields, just rename `a`→`z` and leave `blank` as a hard override** — rejected: keeps
  the exact bug (interpolation boundary leak) that prompted this investigation, and keeps two
  fields answering the same question.
- **Collapse into one continuous field** — chosen: matches what the data already meant in practice,
  removes a field from every coord-buffer point (6% smaller buffer), and deletes the worklet's
  boundary-leak workaround instead of hardening it.
