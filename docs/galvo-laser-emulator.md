# Galvo Laser Beam Emulator — design spec

Implementation spec for the Galvo Laser Beam Emulator and its Scanner Model. The *decisions* and
their rationale live in `docs/adr/0010-galvo-laser-beam-emulator.md`; this document is the how.
Vocabulary is defined in `CONTEXT.md`.

Nothing here is built yet. This is the spec to build against.

## What it is

A second Beam Emulator alongside the CRT one. It reads the same Waveform Tap, runs the commanded
X/Y through a simulated galvanometer scanner, and renders **where the mirror actually ends up**
rather than where it was told to go.

The difference between the two views is the product. The CRT view shows the signal; the Galvo Laser
view shows what a mechanical scanner does to that signal. Everything the emulator is for —
corner rounding, ringing, colour fringing, detail collapsing as point rate rises — is the gap
between them.

## What it is not

It is **directionally correct, not calibrated.** No real scanner's step response has been measured.
The emulator can tell you a shape is getting hard to scan; it cannot tell you it will scan on a
specific projector. See the honesty boundary in ADR-0010 — this constraint is a decision, not a
disclaimer, and any UI that implies otherwise is a defect.

It does no corner-safety work, inserts no dwell points, and clamps no point rates. Those remain
deferred under ADR-0008.

## Signal chain

```
  Master Output (6ch: X Y R G B Z)
        │
        ▼
  readWaveformTap(cursor)  ──►  frame + continuity marker      [tap contract widens]
        │
        │  raw samples, true audio rate — getSampleRate()
        ▼
  ┌─────────────────────────────────────────┐
  │  Scanner Model                          │   X, Y  only
  │    biquad (2nd order) ─► slew clamp     │   state carried across frames,
  │    independent per axis                 │   reset on discontinuity
  └─────────────────────────────────────────┘
        │                                    R, G, B, Z pass straight through
        │  simulated mirror position          (modulator treated as instantaneous)
        ▼
  Lanczos upsample                          [render smoothness only]
        │
        ▼
  updateGeometryArrays ─► existing erf/Gaussian line pipeline (unchanged)
        │
        ▼
  accumulate ─► fade (exposure) ─► blur/bloom ─► output pass  [galvo-tuned params]
```

Three ordering constraints, all load-bearing:

1. **Scanner Model runs before Lanczos.** Its coefficients derive from the sample rate. Running it
   on 6×-upsampled data silently turns a 1 kHz scanner into a 6 kHz one and under-reports
   distortion — the failure is invisible and flattering, which is the worst kind.
2. **Scanner Model runs on X/Y only.** R/G/B/Z are not filtered. Colour and blanking therefore
   arrive at the commanded time while the beam is at its lagged position, so colour fringing at
   segment boundaries emerges from the model rather than being coded in. This is the artifact
   laser-dac-rs's `with_color_delay` exists to correct.
3. **The line pipeline is reused unchanged.** `fsLine.glsl` already divides brightness by
   `2.0 * safelen`, so it models a constant-power beam correctly: intensity per unit length scales
   as 1/speed. Once the Scanner Model makes the beam physically decelerate into corners, bright
   corner dots appear for free. No shader change needed for the single most recognisable laser
   artifact.

## The Scanner Model

### Form

Per axis, independently: a **second-order lowpass** followed by a **slew-rate clamp**.

The linear part is a standard RBJ biquad lowpass, which is the exact discretisation of a
second-order continuous system and gives closed-form expected values for tests:

```
  ω₀ = 2π·f₀/fs
  Q  = 1/(2ζ)
  α  = sin(ω₀)/(2Q)

  b₀ = (1−cos ω₀)/2     a₀ = 1+α
  b₁ =  1−cos ω₀        a₁ = −2cos ω₀
  b₂ = (1−cos ω₀)/2     a₂ = 1−α

  (normalise all by a₀)
  y[n] = b₀x[n] + b₁x[n−1] + b₂x[n−2] − a₁y[n−1] − a₂y[n−2]
```

where `f₀` is **Scanner Bandwidth** and `ζ` is **Damping**. The bilinear transform's frequency
warping is already pre-compensated by RBJ's use of `sin`/`cos` of `ω₀`.

The nonlinear part clamps how far the mirror may move in one sample:

```
  Δmax = slewLimit / fs
  y[n] ← clamp(y[n], y[n−1] − Δmax, y[n−1] + Δmax)
```

**The clamped value must be written back into the filter's `y[n−1]` history.** Use Direct Form I and
store the post-clamp output, or the recursion diverges from the position actually rendered. This
makes the Scanner Model non-LTI by construction — which is the entire point of including it, since
an LTI model reports long blank jumps as free.

### Why this form

- **Second order** because a closed-loop galvo is a damped servo; overshoot and ringing are the
  behaviours that matter and a first-order filter has neither.
- **Slew clamp** because a linear system is scale-invariant — a full-scale jump would settle as fast
  as a 1% nudge. Both galvo references price distance explicitly (LaserBoy's
  `lit_delta_max`/`blank_delta_max`; laser-dac-rs's L∞ transit scaling), and without it the emulator
  would endorse exactly the path orderings `orderSegments` exists to avoid.
- **Independent per axis** because they are two separate mechanical assemblies with no cross-coupling
  — the same assumption laser-dac-rs encodes by using L∞ rather than Euclidean distance.

A velocity clamp is an approximation: a real current limit bounds *torque*, i.e. acceleration, and
velocity saturates only at terminal speed. An acceleration clamp is the more faithful upgrade and is
noted here as a known simplification, not an oversight.

### Numerical bounds

- Clamp `f₀ ≤ fs/4`. RBJ coefficients degrade near Nyquist, and a scanner with bandwidth anywhere
  near half the audio rate is unphysical anyway.
- `ζ` must stay > 0. At `ζ → 0` the biquad becomes an undamped resonator and rings forever; allow
  low values (a badly-tuned scanner really does ring) but not zero.
- Recompute coefficients only on parameter change, not per sample.

### State and discontinuity

State is `x[n−1]`, `x[n−2]`, `y[n−1]`, `y[n−2]` per axis, held in a ref across render frames.

On each read, compare the tap's continuity marker:

| Marker | Meaning | Action |
|---|---|---|
| `contiguous` | frame directly follows the last one consumed | continue; keep state |
| `gap` | one or more frames were dropped (writeIndex jumped) | reset |
| `sourceChanged` | analyser fallback ⇄ capture worklet, or `nSamples` resize | reset |
| `first` | no previous frame | reset |

"Reset" means **warm-start**: set all four state values to the incoming frame's first sample, i.e.
assume the mirror is settled at the commanded position. Zeroing state instead would fabricate a
full-scale slew from origin on every gap.

This mirrors laser-dac-rs's `OutputFilter` reset-on-discontinuity contract (`OutputResetReason`)
rather than inventing a new one.

**Surface resets in the UI.** A view that silently resets during stutter is a view that quietly lies
about how much overshoot is real. A reset counter or indicator is part of the feature, not polish.

## Parameters

Every parameter is directly adjustable — no preset-first control surface (ADR-0010, sub-decision 8).
Presets may exist later as starting points only.

Defaults below are plausible orders of magnitude, **not calibrated values.**

### Scanner Model — per axis (X and Y), plus a link toggle

| Parameter | Unit | Range | Default | Notes |
|---|---|---|---|---|
| `bandwidth` | Hz | 50 – fs/4 | 1000 | Natural frequency `f₀`. Lower = softer, more rounding |
| `damping` | ζ | 0.05 – 2.0 | 0.7 | `Q = 1/(2ζ)`. <1 rings, 1 critical, >1 sluggish |
| `slewLimit` | units/s | 10 – 100000 | 2000 | X/Y are normalised to [−1,+1], so full scale = 2 units |
| `enabled` | bool | — | true | Bypass renders the commanded path — direct A/B against CRT |
| `linkAxes` | bool | — | true | When on, Y mirrors X's parameters |

### Beam and optics

| Parameter | Unit | Range | Default | Notes |
|---|---|---|---|---|
| `spotSize` | normalised | 0.001 – 0.1 | 0.012 | Gaussian σ; feeds `uSize`. Matches `lineSize` today |
| `power` | — | 0 – 4 | 1 | Overall exposure multiplier |
| `gainR` / `gainG` / `gainB` | — | 0 – 2 | 1 | Per-diode balance; real projectors are not neutral |
| `blankFloor` | Z units | −1 – 0 | −0.9 | Z at or below which output is truly zero — a laser's off is off |
| `zGamma` | — | 0.2 – 5 | 1 | Modulator response curve; diode I/L is not linear |

### Integration and display

| Parameter | Unit | Range | Default | Notes |
|---|---|---|---|---|
| `exposureTime` | ms | 5 – 200 | 40 | Eye/camera integration. **Not** phosphor — see below |
| `glowStrength` | — | 0 – 1 | 0.1 | Bloom, reuses the existing pass |
| `hazeStrength` | — | 0 – 1 | 0.1 | Atmospheric scatter (the CRT's `scatterStrength` retuned) |
| `whitePoint` | — | 0 – 1 | 0 | Saturation roll-off in `fsOutput.glsl` |

**Exposure is not persistence.** A laser spot on a screen has no afterglow; what you perceive is
integration in the eye or camera. So the fade constant is derived from time, not chosen per frame:

```
  Δt        = nSamples / fs          // audio time covered by one tap frame
  fadeAlpha = 1 − exp(−Δt / exposureTime)
```

This matters beyond pedantry: it makes **flicker real**. A shape redrawn at a low `scanFrequency`
will visibly flicker in the Galvo Laser view and will not in the CRT view, which is exactly the
difference between the two devices. A flat fade constant would hide it. (Note the CRT renderer
already scales `fadeAlpha` by `nPoints / N_SAMPLES` for a related but different reason — keeping
perceived persistence stable across point density.)

## Readouts

The diagnostic output is as much the point as the picture.

| Readout | Computation | Purpose |
|---|---|---|
| **Requested point rate** | `coordBufferSize × scanFrequency / 1000` kpps | Reactoscope has no kpps concept at all today; these are two sliders that do not know about each other, spanning ~26 to ~786,000 points/sec. Flag past a configurable ceiling (default 60 kpps) |
| **Tracking error** | RMS and peak of \|commanded − actual\|, per axis | How far the mirror is from where it was told to be. The single most direct "is this scannable" number |
| **Slew-limited fraction** | % of samples where the clamp was active | Distinguishes "rounding corners" from "physically cannot keep up" |
| **Discontinuity resets** | count since last clear | Tells you when the view is showing a seam rather than physics |

All readouts are **display-only**. No clamping, no correction, no automatic rate limiting — that is
ADR-0008 territory and stays deferred.

## Proposed file layout

```
src/galvo/
  scannerModel.ts        pure math — biquad + slew clamp + state/reset. No React, no THREE
  scannerModel.test.ts   vitest
src/contexts/
  GalvoContext.tsx       galvo.* localStorage keys; galvo-specific params only
src/components/scope/
  GalvoSceneR3F.tsx      sibling to WoscopeSceneR3F; reuses woahscope/sceneHooks
```

Modified:

- `src/audio/waveformTap.ts` — widen the return to carry a continuity marker
- `src/components/scope/VisualizationCanvasR3F.tsx` — device selector (CRT / Galvo Laser)
- the scope panel chrome — selector UI, galvo controls, readouts
- `package.json` — add Vitest and a `test` script

`scannerModel.ts` stays free of React and THREE deliberately: it is the piece that has to be
testable, and it is the piece that would move into an AudioWorklet if the upgrade path in ADR-0010
is ever taken.

Galvo Laser reads device-neutral settings (`swapXY`, `invertXY`, `intensity`, `nSamples`,
`lanczos*`) from `useAxis()`/`useEffects()` as `SweepSceneR3F` already does, and ignores the
CRT-specific ones (`crtEnabled`, `persistence`, `hue`).

## Validation

A wrong servo coefficient does not crash. It renders a confident, beautiful, wrong picture. That is
why this component gets tests when nothing else in the repo does.

### Unit tests — `scannerModel.test.ts`

Pure math over `Float32Array`s, closed-form expected values:

| Test | Expected |
|---|---|
| Step response overshoot | `exp(−πζ/√(1−ζ²))` for ζ<1; zero overshoot at ζ≥1 |
| −3dB point | Swept sine attenuates 3dB at `bandwidth`, ±tolerance |
| Roll-off slope | −12 dB/octave above `f₀` |
| Slew-limited transit | Full-scale step transit time = distance ÷ `slewLimit` when the clamp dominates |
| Clamp write-back | Output never moves more than `Δmax` per sample, sustained over a long ramp |
| Axis independence | A step on X leaves Y's output untouched |
| Discontinuity reset | Injected `gap` marker warm-starts to the new frame's first sample; no transient carries into the following frame |
| Coefficient stability | `f₀` at the clamp bound produces finite, bounded output for a full-scale input |

### Visual acceptance — the ILDA test pattern

The ILDA test pattern exists precisely to rate scanners, which makes it the closest thing to ground
truth available without hardware. `src/scene/sources/` already has an **SVG importer**, so it can be
loaded directly with no new geometry work.

Acceptance: as `bandwidth` is lowered (or point rate raised), the pattern degrades the way real
scanners degrade it — the inner circle fails to touch the square, corners round off, then detail
collapses. If it degrades in some other way, the model is wrong.

## Known simplifications

Recorded so they are deliberate rather than discovered:

- Velocity clamp, not acceleration clamp — see "Why this form."
- No cross-axis coupling, no mount resonance, no thermal drift.
- The rendered trace is a Lanczos *reconstruction* of the Scanner Model's output, not the output
  itself. Legitimate — real mirror motion is continuous and far below Nyquist at 48 kHz — but the
  pixels are not the physics.
- Scanner parameters are only meaningful alongside a known sample rate. Changing the audio context
  rate (44.1 ↔ 48 kHz) changes the coefficients. That is correct behaviour, not a bug.
- Fidelity is bounded by tap contiguity. The AudioWorklet upgrade path in ADR-0010 is the fix if
  seam artifacts ever prove visible.
- No modulator response model. Deliberate: it would add three IIRs and hide the colour-fringing
  artifact that is one of the more useful things the view shows.

## Related

- `docs/adr/0010-galvo-laser-beam-emulator.md` — the decision record
- `docs/adr/0008-laser-corner-safety-deferred.md` — corner safety, still deferred; this emulator is
  the instrument that makes it evaluable
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the analog Z channel this view consumes
- `docs/architecture-comparison.md` — LaserBoy, laser-dac-rs, vectorsynthesis, xyscope.js comparison
  the model's grounding is drawn from
