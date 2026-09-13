# MEMS Laser Beam Emulator — design spec

Implementation spec for the MEMS Laser Beam Emulator and its Quasistatic Model. The *decisions* and
their rationale live in `docs/adr/0012-mems-laser-beam-emulator.md`; this document is the how.
Vocabulary is defined in `CONTEXT.md`.

Built. Where this document and the code disagree, the code is right and this is a bug.

## What it is

A third Beam Emulator alongside CRT and Galvo Laser. It reads the same Waveform Tap, runs the
commanded X/Y through a simulated **quasistatic MEMS drive path**, and renders where the mirror
actually ends up.

Where Galvo Laser models a mechanical servo chasing a target, this models a signal being deliberately
band-limited *before* it ever reaches the mirror. The two views disagree in a specific, observable
way: lower a galvo's bandwidth and corners overshoot and ring; lower a MEMS cutoff and the whole
figure softens uniformly with no overshoot at all — until the cutoff climbs toward the mirror's
mechanical resonance, at which point it rings for a completely different reason.

That last transition is the point of the view. It is the tradeoff real hardware forces: a sharper
drawing means a higher cutoff means less margin against a resonance the vendor warns can destroy the
mirror.

## What it is not

It is **directionally correct, not calibrated**, on the same terms as ADR-0010 — no real mirror's
response has been measured, and the defaults are orders of magnitude drawn from two reference
codebases and one vendor worked example.

It additionally treats **voltage-to-angle as linear**, which on real hardware it is not. Every
Mirrorcle mirror ships a per-unit Static Response characterisation precisely because that curve has
to be measured per device. See the honesty boundary in ADR-0012.

It models the **quasistatic regime only.** Resonant-mode MEMS is a different control paradigm and a
separate future device, not a mode of this one.

It is not a driver. There is no DAC, no FCLK signal, no BDQ stage — the equivalent-FCLK readout is a
number on screen, not a pin.

## Signal chain

```
  Master Output (6ch: X Y R G B Z)
        │
        ▼
  readWaveformTap(cursor)  ──►  frame + continuity marker
        │
        │  raw samples, true audio rate — getSampleRate()
        ▼
  ┌─────────────────────────────────────────────┐
  │  Quasistatic Model                          │   X, Y  only
  │    amplitude clamp  (±angleLimit)           │   state carried across frames,
  │      ─► Bessel LPF  (order 2 or 5)          │   reset on discontinuity
  │      ─► high-Q resonator  (optional)        │   independent per axis
  └─────────────────────────────────────────────┘
        │                                    R, G, B, Z pass straight through
        │  simulated mirror position          (modulator treated as instantaneous)
        ▼
  Lanczos upsample                          [render smoothness only]
        │
        ▼
  updateGeometryArrays ─► existing erf/Gaussian line pipeline (unchanged)
        │
        ▼
  accumulate ─► fade (exposure) ─► blur/bloom ─► output pass
```

The three ordering constraints from the galvo spec hold unchanged and for identical reasons — model
before Lanczos, X/Y only, line pipeline reused. Two more are specific to this device:

1. **The clamp precedes the filter.** On real hardware the limit is on drive voltage, so it applies
   to the command. Clamping the filter's *output* instead would model a mirror that is physically
   prevented from over-deflecting, which is not what the hardware does — it models a driver that
   refuses to ask.
2. **The resonator comes last.** It represents the mirror itself, which sits downstream of every
   electronic stage. Placing it before the Bessel would let the filter suppress ringing the mirror
   physically produces, which inverts the causality the view exists to show.

## The Quasistatic Model

### Form

Per axis, independently: **clamp → Bessel low-pass → optional high-Q second-order resonator.**

```
  cmd    = clamp(x[n], −angleLimit, +angleLimit)
  filt   = besselCascade(cmd)                      // order 2 or 5
  y[n]   = resonanceEnabled ? resonator(filt) : filt
```

**The Bessel stage** is a cascade of biquad sections derived from the standard 3dB-normalised Bessel
pole locations, bilinear-transformed with prewarping at `cutoff`. Order 2 is one biquad; order 5 is
two biquads plus one real pole. Pole constants are hardcoded in `src/dsp/bessel.ts` with their
reference cited in a comment — they are the one part of this model that cannot be derived from a
formula in the file, and therefore the one part that must be checked against a published table
rather than recalled.

**The resonator** is the *same RBJ second-order low-pass the Galvo Scanner Model already uses*, with

```
  f₀ = resonanceFreq
  ζ  = 1 / (2 · resonanceQ)
```

At `resonanceQ` 100 that is ζ = 0.005 — the near-undamped corner the galvo spec's numerical bounds
warn about, which is unphysical for a servo and correct for a MEMS mirror. This is why
`src/dsp/biquad.ts` is extracted and shared rather than reimplemented.

### Why this form

- **Bessel, not Butterworth**, because maximally flat *group delay* is the property that matters:
  the figure is delayed uniformly rather than reshaped, and corners soften instead of overshooting.
  This is the single most visible difference from the Galvo view and choosing Butterworth would
  erase it. (ADR-0012, sub-decision 3.)
- **Order 2 or 5**, because both are real hardware options — the MAX7413 in the standard driver is
  5th-order, and Mirrorcle documents a 2nd-order continuous-time alternative for volume orders.
  Exposing the choice costs one branch and shows how much the filter order actually buys.
- **No slew clamp**, unlike the Galvo Scanner Model. A band-limited signal already has bounded slew;
  a second constraint on the same quantity would let two parameters contradict each other. This is
  the most likely thing for a reader to think is missing — see ADR-0012, sub-decision 4.
- **The clamp is amplitude, not rate**, because the hazard being modelled is over-deflection past
  the mirror's safe angle, which is a position limit.
- **Independent per axis**, matching both the galvo model and the hardware, which drives X and Y
  through separate filter channels with separately-clocked cutoffs.

### Numerical bounds

- Clamp `cutoff ≤ sampleRate / 4`, for the same reason the galvo caps `bandwidth`: bilinear-transform
  behaviour degrades near Nyquist, and a MEMS cutoff anywhere near audio Nyquist is 50× past what the
  hardware does anyway.
- `resonanceQ` must stay ≥ 1. Below that the "resonator" is not resonant and the stage is
  meaningless; above ~500 the biquad's poles sit close enough to the unit circle that float32 ringing
  becomes numerical rather than physical.
- `resonanceFreq` should exceed `cutoff` — the whole design intent is that it does. The UI does not
  prevent inverting them, because watching what happens when the margin disappears is the point, but
  the resonance-margin readout flags it.
- Recompute coefficients only on parameter change, not per sample.

### State and discontinuity

State is the per-section biquad history, plus one value for the order-5 real pole, plus the
resonator's history — all held per axis in a ref across render frames.

Continuity handling is identical to the Galvo Scanner Model, reading the same tap marker, with the
same warm-start-not-zero policy:

| Marker | Meaning | Action |
|---|---|---|
| `contiguous` | frame directly follows the last one consumed | continue; keep state |
| `gap` | one or more frames were dropped | reset |
| `sourceChanged` | analyser ⇄ capture worklet, or `nSamples` resize | reset |
| `first` | no previous frame | reset |

"Reset" warm-starts **every section** to the incoming value. Each section has unity DC gain, so
setting all histories to the same value is the correct settled state. Zeroing instead would fabricate
a full-scale transit from origin on every gap.

Note the two different warm-start sources, inherited from the galvo renderer and equally load-bearing
here: a *discontinuity* warm-starts to the incoming commanded sample (data was lost; assume the
mirror was already there), while a *parameter edit* warm-starts to the previous actual position
(nothing was lost; the mirror does not teleport because a slider moved).

## Parameters

Every parameter is directly adjustable — no preset-first control surface (ADR-0012, sub-decision 8).

Defaults below are plausible orders of magnitude, **not calibrated values.**

### Quasistatic Model — per axis (X and Y), plus a link toggle

| Parameter | Unit | Range | Default | Notes |
|---|---|---|---|---|
| `cutoff` | Hz | 20 – 5000 | 500 | Bessel corner. Real hardware sets it as FCLK ÷ 60; the vendor's worked example is 500 Hz and `LD_MemsMirror` hardcodes 220 Hz |
| `filterOrder` | 2 \| 5 | — | 5 | MAX7413 is 5th-order; 2nd-order is the documented alternative. One filter per board, so the control writes both axes |
| `angleLimit` | normalised | 0.1 – 1.0 | 1.0 | Safe deflection ceiling. X/Y are normalised to [−1,+1], so 1.0 is no limit |
| `resonanceEnabled` | bool | — | true | Off proves the Bessel stage is overshoot-free |
| `resonanceFreq` | Hz | 200 – 20000 | 3000 | The mirror's mechanical resonance |
| `resonanceQ` | — | 1 – 500 | 100 | High-Q spring-mass. `ζ = 1/(2Q)` |
| `enabled` | bool | — | true | Bypass renders the commanded path — direct A/B against CRT |
| `linkAxes` | bool | — | true | When on, Y mirrors X's parameters |

### Beam, optics, integration and display

Identical in meaning, range and default to the Galvo Laser spec's "Beam and optics" and "Integration
and display" tables — `spotSize`, `power`, `gainR/G/B`, `blankFloor`, `zGamma`, `exposureTime`,
`glowStrength`, `hazeStrength`, `whitePoint`, plus `trackingBlankThreshold` and
`trackingBlankSoftness`. They are laser-generic rather than galvo-specific and are consumed by the
shared renderer.

They are stored under `mems.*` keys rather than shared with `galvo.*`, per ADR-0012 sub-decision 7 —
the two devices are compared by switching between them, so they need independently tunable exposure.

## Readouts

Display-only. Never clamp, correct, or rate-limit.

| Readout | Computation | Purpose |
|---|---|---|
| **Resonance margin** | `resonanceFreq / cutoff`, flagged below ~4 | The hardware-hazard number. The one thing this view knows that no other view does |
| **Equivalent FCLK** | `cutoff × 60` Hz | The filter clock a real PicoAmp would need for this cutoff. Ties the simulation to a number someone would actually type |
| **Clamped fraction** | % of samples at `±angleLimit` | The analog of the galvo's slew-limited fraction: distinguishes "softened" from "hit the wall" |
| **Tracking error** | RMS and peak of \|commanded − actual\|, per axis | Carried over from Galvo. Expect it to be *large* here — band-limiting is not a defect |
| **Discontinuity resets** | count since last clear | Tells you the view is showing a seam rather than physics |

Requested point rate (kpps) is device-neutral and carries over unchanged.

## Proposed file layout

```
src/dsp/                   shared pure math — no React, no THREE
  scannerAxis.ts           the ScannerAxis interface, moved here from src/galvo/
  biquad.ts                RBJ lowpass coefficients, extracted from createScannerAxis
  bessel.ts                besselLowpassSections(sampleRate, cutoff, order)
  bessel.test.ts           vitest
src/mems/
  quasistaticModel.ts      clamp + Bessel cascade + optional resonator
  quasistaticModel.test.ts vitest
src/contexts/
  MemsContext.tsx          mems.* localStorage keys
src/components/scope/
  LaserSceneR3F.tsx        the shared renderer, extracted from GalvoSceneR3F
  MemsSceneR3F.tsx         thin wrapper
  MemsControl.tsx          sibling to GalvoControl
  laserReadout.ts          per-frame telemetry singleton + polling hook
  LaserReadoutRow.tsx      the readout strip, shared by both laser panels
```

Modified:

- `src/galvo/scannerModel.ts` — consume `src/dsp/biquad.ts`; re-export `ScannerAxis` for compatibility
- `src/components/scope/GalvoSceneR3F.tsx` — reduced to a thin wrapper over `LaserSceneR3F`
- `src/contexts/GalvoContext.tsx` — add a memoised `optics` object (purely additive)
- `src/contexts/BeamEmulatorContext.tsx` — widen the union to `'crt' | 'galvo' | 'mems'`
- `src/components/scope/VisualizationCanvasR3F.tsx` — three-way device switch and `aria-label`
- `src/components/scope/VisualizationControls.tsx` — third toggle button
- `src/daw/panels/VizSettingsOverlay.tsx` — a `Sect` for the MEMS controls
- `src/App.tsx` — mount `MemsProvider`

`src/dsp/` and `src/mems/` stay free of React and THREE for the same reason `src/galvo/` does: they
are the pieces that have to be testable.

Emulator parameters ride on individual localStorage keys and are **not** part of the Patch file, so
adding them needs no `PatchFile` migration and no version bump.

## Validation

A wrong filter coefficient does not crash. It renders a confident, beautiful, wrong picture. Same
reasoning as ADR-0010's honesty boundary, and the reason this component gets tests.

### Unit tests — `quasistaticModel.test.ts`

Pure math over `Float32Array`s. Expected values come from an **independent analytic source**, never
from the implementation — matching the house style in `scannerModel.test.ts`.

| Test | Expected |
|---|---|
| Unity DC gain | A held constant input settles to exactly the commanded value |
| −3dB at cutoff | Gain = 1/√2 at `cutoff`, both orders — this is what 3dB-normalised poles *mean* |
| Roll-off slope | ≈ −12 dB/octave at order 2, ≈ −30 dB/octave at order 5, measured clear of Nyquist warping |
| Step response near-monotonic | Bessel overshoot under ~1% — the direct contrast with the galvo's `exp(−πζ/√(1−ζ²))` |
| Group-delay flatness | Delay at 0.25× and 0.75× of `cutoff` agree within a few % — the defining Bessel property, and the one that fails first if the poles are wrong |
| Amplitude clamp | A full-scale input settles at exactly `angleLimit` |
| Resonator rings | With a high `resonanceQ`, an impulse rings at period `1/resonanceFreq` |
| Resonance suppressed | With `cutoff` ≪ `resonanceFreq`, energy at resonance is attenuated per the Bessel rolloff |
| `reset()` warm-start | Every section; a constant input returns that exact value from sample zero |
| Instance isolation | A fresh axis matches a pristine reference after another has been abused and reset |
| Stability at bounds | `cutoff` near `sampleRate/4` and `resonanceQ` 500 stay finite and bounded |

Additionally: **the nine existing galvo tests must pass unmodified** after `src/dsp/` is extracted.
That is the proof the extraction was behaviour-preserving, and it is why the extraction is safe to do
at all.

### Visual acceptance — the ILDA test pattern

Same pattern and same importer as the galvo spec uses (`src/scene/sources/`, SVG).

1. **Resonator off, cutoff swept down.** The pattern should soften *uniformly* — lines thinning and
   corners rounding — with **no overshoot anywhere**. If corners overshoot, the Bessel coefficients
   are wrong, because linear phase is the one thing a Bessel guarantees.
2. **Resonator on, cutoff raised toward `resonanceFreq`.** Fast transitions should develop visible
   ringing. This reproduces the PlayzerX-documented failure mode and is the reason the resonator
   stage exists at all.
3. **A/B against Galvo Laser at comparable corner frequency.** MEMS should look softer but cleaner;
   Galvo should overshoot where MEMS does not. If they look the same, one of the two models is wrong.
4. **Bypass (`enabled` off).** Renders the commanded path, matching the CRT view.

## Known simplifications

Recorded so they are deliberate rather than discovered:

- Voltage-to-angle is linear. Real mirrors ship a per-unit characterisation because it is not. See
  the ADR's honesty boundary.
- The BDQ high-voltage stage is not modelled. On the Analog Input driver it is internal to the
  driver and reactoscope's normalised `[−1,+1]` signal already matches that input's convention, so
  simulating Vbias and Vdifference separately would add two numbers that always move together.
- One resonant mode per axis. Real MEMS structures have several; the first dominates.
- No cross-axis coupling, mount resonance, or thermal drift — same exclusions as the galvo model.
- The rendered trace is a Lanczos *reconstruction* of the model's output, not the output itself.
  More defensible here than for the galvo, since a 500 Hz-limited signal is very far below Nyquist.
- `process()` allocates a fresh `Float32Array` per call, matching the galvo model. This model has
  more sections, so a preallocated output buffer is the obvious optimisation if it ever matters.
- Coefficients depend on the audio sample rate, so changing it (44.1 ⇄ 48 kHz) changes the response.
  Correct behaviour, not a bug.

## Related

- `docs/adr/0012-mems-laser-beam-emulator.md` — the decision record
- `docs/galvo-laser-emulator.md` — the sibling spec; this one deliberately mirrors its structure
- `docs/mems-quasistatic-drive-path.html` — the traced hardware signal chain behind this model
- `docs/mems-mirror-survey.html` — the twelve-library survey and the quasistatic/resonant split
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the analog Z channel this view consumes
