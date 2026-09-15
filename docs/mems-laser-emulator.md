# MEMS Laser Beam Emulator — design spec

Implementation spec for the MEMS Laser Beam Emulator and its Quasistatic Model. The *decisions* and
their rationale live in `docs/adr/0012-mems-laser-beam-emulator.md`; this document is the how.
Vocabulary is defined in `CONTEXT.md`.

Built. Where this document and the code disagree, the code is right and this is a bug.

The reference device is **PlayzerX** (`mems/playzerx-master`), Mirrorcle's own module and SDK. It is
the only device in the MEMS survey whose interface matches reactoscope's Master Output — normalised
`[-1, +1]` X/Y plus an 8-bit intensity — and the one this model is built from.

## What it is

A third Beam Emulator alongside CRT and Galvo Laser. It reads the same Waveform Tap, runs the
commanded X/Y through a simulated quasistatic MEMS drive path, and renders where the mirror actually
ends up.

Where Galvo Laser models a mechanical servo chasing a target, this models a signal being deliberately
band-limited *before* it reaches the mirror. The two views disagree observably: lower a galvo's
bandwidth and corners overshoot and ring; lower a MEMS cutoff in Bessel mode and the whole figure
softens uniformly with no overshoot at all — until the cutoff climbs toward the mirror's mechanical
resonance, at which point it rings for a different reason entirely.

That transition is the point of the view. It is the tradeoff the hardware forces: a sharper drawing
means a higher cutoff means less margin against a resonance the vendor warns can damage the mirror.

## What it is not

It is **directionally correct, not calibrated**, on the same terms as ADR-0010.

It treats **voltage-to-angle as linear**, which on real hardware it is not — every Mirrorcle mirror
ships a per-unit Static Response characterisation precisely because that curve has to be measured.

It models the **quasistatic regime only.** Resonant-mode MEMS is a different control paradigm and a
separate future device, not a mode of this one. The SDK draws the same line: `RQWaveform` drives one
axis resonant and the other point-to-point, with different generators for each.

It is not a driver. No DAC, no USB, no Controller.

## Signal chain

```
  Master Output (6ch: X Y R G B Z)
        │
        ▼
  readWaveformTap(cursor)  ──►  frame + continuity marker
        │
        │  raw samples, true audio rate — getSampleRate()
        ▼
  ┌──────────────────────────────────────────────────┐
  │  Quasistatic Model                               │   X, Y  only
  │    amplitude clamp   (±angleLimit)               │   state carried across
  │      ─► zero-order hold  (deviceSampleRate)      │   frames, reset on
  │      ─► software filter  (family, order, cutoff, │   discontinuity,
  │                           optional zero-phase)   │   independent per axis
  │      ─► high-Q mirror    (optional, always causal)│
  └──────────────────────────────────────────────────┘
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

The three ordering constraints from the galvo spec hold unchanged — model before Lanczos, X/Y only,
line pipeline reused. Three more are specific to this device:

1. **The clamp precedes everything.** On real hardware the limit is on drive voltage
   (`MTIDeviceLimits::VdifferenceMax`), so it applies to the command. Clamping the filter's *output*
   instead would model a mirror physically prevented from over-deflecting, which is not what the
   hardware does — it models a Controller that refuses to ask.
2. **The hold precedes the filter.** The Controller reads its buffer at `SetSampleRate`, so the
   commanded position steps at that rate and the filter sees the steps, not the original signal.
3. **The mirror comes last, and stays causal.** It sits downstream of every content stage, and it is
   excluded from the zero-phase pass — a physical structure cannot respond before it is driven.

## The Quasistatic Model

### Form

Per axis, independently:

```
  cmd    = clamp(x[n], −angleLimit, +angleLimit)
  held   = zeroOrderHold(cmd, deviceSampleRate)
  filt   = softwareFilter(held)                    // causal, or forward-backward
  y[n]   = resonanceEnabled ? mirror(filt) : filt
```

**The software filter** mirrors `MTIDataGenerator::SetupSoftwareFilter(type, order, cutoffFreq,
sampleFreq)`: a selectable family at a free order, realised as cascaded biquads from analog
prototype poles, bilinear-transformed with prewarping at each section's own frequency.

Bessel poles are *computed*, not tabulated: the reverse Bessel polynomial θ_n(s) has exact integer
coefficients `a_k = (2n−k)! / (2^(n−k)·k!·(n−k)!)`, and its roots are found at construction and
rescaled to put −3dB at the cutoff. Butterworth poles sit on the unit circle by construction and need
no rescaling. Both families end up −3dB at the cutoff so switching family does not move the corner.

**Zero-phase** mode runs the cascade forward and then backward over the frame, matching
`FilterData(..., zeroPhase = true)`. It removes group delay entirely, applies the response twice (so
the corner sits at −6dB, uncompensated as in the reference), and is an approximation at frame
boundaries — PlayzerX filters a closed content buffer, reactoscope filters a tap frame.

**The mirror** is the *same RBJ second-order lowpass the Galvo Scanner Model already uses*, with

```
  f₀ = resonanceFreq
  ζ  = 1 / (2 · resonanceQ)
```

At `resonanceQ` 100 that is ζ = 0.005 — the near-undamped corner the galvo spec's numerical bounds
warn about, which is unphysical for a servo and correct for a MEMS mirror. Hence `src/dsp/biquad.ts`
is shared rather than reimplemented.

### Why this form

- **Family and order are parameters, not constants**, because `SetupSoftwareFilter` takes them as
  parameters. Bessel is the default for its flat group delay; Butterworth is offered because the
  contrast is the clearest demonstration of what the Bessel buys (ADR-0012, sub-decision 3).
- **The hold is modelled** because the Controller's output rate is a real, enforced limit and is what
  most distinguishes a buffer-streaming module from an analog driver taking a continuous voltage.
- **No slew clamp**, unlike the Galvo Scanner Model. A band-limited signal already has bounded slew;
  a second constraint on the same quantity would let two parameters contradict each other. This is
  the most likely thing for a reader to think is missing — see ADR-0012, sub-decision 4.
- **The clamp is amplitude, not rate**, because the hazard is over-deflection past the safe angle.
- **Independent per axis**, matching the hardware: `SetupSoftwareFilter` has a `twoChannel` flag and
  `RQWaveform` takes a separate `yBandwidth`.

### Numerical bounds

- Clamp `cutoff ≤ sampleRate / 4`, and each section frequency independently — Bessel section
  frequencies sit above the cutoff (ratios reach ~1.8 at high order), so capping the cutoff alone is
  not enough.
- Filter order is clamped to 1–8.
- `deviceSampleRate` is clamped to 500–60,000, the range `PlayzerX-Demo` enforces. At or above the
  audio rate the hold becomes a no-op, which is the honest behaviour.
- `resonanceQ` is floored at 0.5. Above ~500 the poles sit close enough to the unit circle that
  ringing becomes numerical rather than physical.
- `resonanceFreq` should exceed `cutoff` — the whole design intent is that it does. The UI does not
  prevent inverting them, because watching the margin disappear is the point, but the readout flags it.
- Recompute coefficients only on parameter change, not per sample.

### State and discontinuity

State is the per-section biquad history, the hold's phase and held value, and the mirror's history —
all per axis, held in a ref across render frames.

Continuity handling is identical to the Galvo Scanner Model, reading the same tap marker, with the
same warm-start-not-zero policy:

| Marker | Meaning | Action |
|---|---|---|
| `contiguous` | frame directly follows the last one consumed | continue; keep state |
| `gap` | one or more frames were dropped | reset |
| `sourceChanged` | analyser ⇄ capture worklet, or `nSamples` resize | reset |
| `first` | no previous frame | reset |

"Reset" warm-starts **every stage** to the incoming value, clamped to the angle limit. Each section
has unity DC gain, so setting all histories to the same value is the correct settled state. The
reverse-pass filter is additionally reset at the start of every frame, since a backward pass carrying
state between frames would be running time backwards across a seam.

Note the two different warm-start sources, both load-bearing: a *discontinuity* warm-starts to the
incoming commanded sample (data was lost; assume the mirror was already there), while a *parameter
edit* warm-starts to the previous actual position (nothing was lost; the mirror does not teleport
because a slider moved).

## Parameters

Every parameter is directly adjustable (ADR-0012, sub-decision 8).

Defaults are **taken from PlayzerX's published specifications** where one exists — see
`docs/mems-device-limits.html`, which sources every figure. They are still not calibrated against a
measured mirror, and the resonance pair in particular is inferred from the vendor's design rule
rather than observed.

### Quasistatic Model

| Parameter | Unit | Range | Default | Scope | Notes |
|---|---|---|---|---|---|
| `deviceSampleRate` | S/s | 500 – 60000 | 22000 | device | `SetSampleRate`'s documented default. The protocol accepts 50–50000, the API documents 200–50000, the demo enforces 500–60000 |
| `filterType` | bessel \| butterworth | — | bessel | device | `FilterType` enum begins Bessel = 1, Butterworth = 2 |
| `filterOrder` | — | 1 – 8 | 5 | device | Free in `SetupSoftwareFilter`. Zero-phase doubles the effective order |
| `zeroPhase` | bool | — | true | device | `FilterData`'s own default |
| `cutoff` | Hz | 20 – 8000 | **1800** | per axis | **Not 2200.** PlayzerX's "dc to ~2200 Hz" is the *system* bandwidth; the resonance peak carries a 1800 Hz corner up to ~2191 Hz at the output. See ADR-0012 §Calibration |
| `quantiseEnabled` | bool | — | true | device | X/Y cross the wire as 12-bit integers |
| `positionBits` | — | 6 – 16 | 12 | device | 4096 steps/axis, 0.0166° each over the ~34° field |
| `shaperEnabled` | bool | — | false | device | Zero-vibration input shaping. Off by default: stock content is not shaped |
| `shaperFreq` | Hz | 200 – 20000 | 5500 | per axis | The resonance the shaper is *built for*, deliberately separable from the one the mirror *has* |
| `angleLimit` | normalised | 0.1 – 1.0 | 1.0 | per axis | Safe deflection ceiling. X/Y are normalised to [−1,+1], so 1.0 is no limit |
| `resonanceEnabled` | bool | — | true | device | Off proves the Bessel path is overshoot-free |
| `resonanceFreq` | Hz | 200 – 20000 | 5500 | per axis | Implied by the vendor's own f_res ÷ 2.5 rule from a 2200 Hz bandwidth |
| `resonanceQ` | — | 1 – 500 | 25 | per axis | Measured Q for a 1 mm Mirrorcle mirror (A7M10.2). `ζ = 1/(2Q)` |
| `enabled` | bool | — | true | device | Bypass renders the commanded path |
| `linkAxes` | bool | — | true | device | Y mirrors X's parameters |

"Device" scope means the control writes both axes: one Controller, one filter configured across both
channels. Cutoff, angle limit and resonance stay per-axis.

### Beam, optics, integration and display

Identical in meaning, range and default to the Galvo Laser spec's tables — `spotSize`, `power`,
`gainR/G/B`, `blankFloor`, `zGamma`, `exposureTime`, `glowStrength`, `hazeStrength`, `whitePoint`,
plus `trackingBlankThreshold` and `trackingBlankSoftness`. Laser-generic rather than device-specific,
consumed by the shared renderer, stored under `mems.*` so the two devices can be tuned independently
and compared by switching.

## Readouts

Display-only. Never clamp, correct, or rate-limit.

| Readout | Computation | Purpose |
|---|---|---|
| **Resonance margin** | `resonanceFreq / cutoff`, flagged below ~4 | The hardware-hazard number, and the one thing this view knows that no other does |
| **System bandwidth** | *measured* — bisected −3 dB of the whole chain | What PlayzerX's "dc to ~2200 Hz" actually refers to. Surfacing it makes the corner-versus-system confusion that caused ADR-0012's calibration error structurally impossible to repeat |
| **Settling** | *measured* — step response to within 1 LSB | The only criterion with physical meaning on a quantised device. Compare `GoToDevicePosition`'s 5 ms default |
| **Settled moves/sec** | *measured* — 1 ÷ settling | The actionable form of "how fast can this go" |
| **Overshoot** | *measured* — peak excursion past target | Rises sharply as the resonance margin closes |
| **Clamped fraction** | % of samples at `±angleLimit` | The analog of the galvo's slew-limited fraction |
| **Tracking error** | RMS and peak of \|commanded − actual\|, per axis | Expect it to be *large* here — band-limiting is not a defect |
| **Discontinuity resets** | count since last clear | Tells you the view is showing a seam rather than physics |

There is deliberately no FCLK readout. That belongs to the PicoAmp analog driver, not to PlayzerX.

## Proposed file layout

```
src/dsp/                     shared pure math — no React, no THREE
  scannerAxis.ts             the ScannerAxis interface
  biquad.ts                  RBJ lowpass + one-pole coefficients, section runner
  filterDesign.ts            Bessel/Butterworth prototypes at arbitrary order
  filterDesign.test.ts       vitest
src/mems/
  quasistaticModel.ts        clamp + hold + software filter + optional mirror
  quasistaticModel.test.ts   vitest
src/contexts/
  MemsContext.tsx            mems.* localStorage keys
src/components/scope/
  LaserSceneR3F.tsx          the shared renderer, extracted from GalvoSceneR3F
  MemsSceneR3F.tsx           thin wrapper
  MemsControl.tsx            sibling to GalvoControl
  laserReadout.ts            per-frame telemetry singleton + polling hook
  LaserReadoutRow.tsx        the readout strip, shared by both laser panels
```

Modified: `src/galvo/scannerModel.ts` (consumes the shared biquad), `GalvoSceneR3F.tsx` (thin
wrapper), `BeamEmulatorContext.tsx` (union widened), `VisualizationCanvasR3F.tsx`,
`VisualizationControls.tsx`, `VizSettingsOverlay.tsx`, `App.tsx`.

Emulator parameters ride on individual localStorage keys and are **not** part of the Patch file, so
adding them needs no `PatchFile` migration and no version bump.

## Validation

A wrong filter coefficient does not crash. It renders a confident, beautiful, wrong picture.

### Unit tests

`filterDesign.test.ts` covers the prototypes; `quasistaticModel.test.ts` covers the chain. Expected
values come from an **independent analytic source**, never from the implementation.

| Test | Expected |
|---|---|
| Bessel poles reconstruct θ_n | Undoing the −3dB rescale returns the exact integer coefficients, orders 1–8 |
| Butterworth poles on the unit circle | Every `f0Ratio` = 1 |
| Pole count | Pairs×2 + real = order, both families, orders 1–8 |
| −3dB at cutoff | Gain = 1/√2, both families, several orders |
| Roll-off slope | ≈ −6n dB/octave, measured clear of Nyquist warping |
| Group-delay flatness | Bessel spread < 1%; Butterworth > 10%; Bessel at least 10× flatter |
| Step overshoot | Bessel < 1.5%; Butterworth > 8% |
| Unity DC gain | A held input settles at exactly the commanded value |
| Zero-phase removes delay | Causal lag > 10 samples; zero-phase within 2 samples of the input |
| Zero-phase squares the response | Gain at cutoff ≈ 0.5 rather than 0.707 |
| Device rate degrades tracking | RMS error at 600 S/s more than 3× that at 60000 S/s |
| Hold is transparent above the audio rate | 48000 and 60000 S/s produce identical output |
| Amplitude clamp | A full-scale input settles at exactly `angleLimit` |
| Clamp precedes the filter | Resonance overshoots past the limit, then settles on it |
| Clamped fraction | Matches `1 − (2/π)·asin(L)` for a unit sine |
| Resonator rings | Impulse at high Q rings at period `1/resonanceFreq` |
| Resonance suppressed | With `cutoff` ≪ `resonanceFreq`, energy at resonance attenuated per the rolloff |
| `reset()` warm-start | Every stage; a constant input returns that value from sample zero |
| Instance isolation | A fresh axis matches a pristine reference after another is abused |
| Stability at bounds | Order 8, cutoff at fs/4, Q 500, zero-phase on — finite and bounded |

Additionally: **the nine galvo tests must pass unmodified.** That is the proof the `src/dsp/`
extraction was behaviour-preserving.

### Visual acceptance — the ILDA test pattern

Same pattern and importer as the galvo spec uses (`src/scene/sources/`, SVG).

1. **Bessel, resonator off, cutoff swept down.** The pattern softens *uniformly* with **no overshoot
   anywhere**. If corners overshoot, the coefficients are wrong.
2. **Switch to Butterworth at the same cutoff.** Corners should now overshoot and ring — the
   demonstration of what flat group delay buys, and a second check that the family switch is real.
3. **Resonator on, cutoff raised toward `resonanceFreq`.** Fast transitions develop visible ringing,
   reproducing the failure mode the PlayzerX guide warns about.
4. **Device rate lowered toward 500 S/s.** The path should visibly step and coarsen.
5. **Zero-phase toggled.** The figure should shift slightly in time when turned off (group delay
   reappearing) and soften slightly when turned on (the corner moving to −6dB).
6. **A/B against Galvo Laser.** MEMS in Bessel mode should look softer but cleaner.
7. **Bypass (`enabled` off).** Renders the commanded path, matching the CRT view.

## Known simplifications

Recorded so they are deliberate rather than discovered:

- **One filter stage, not two.** A real MTI controller has a *hardware* filter (`HardwareFilterBw`,
  settable, "recommended by MEMS datasheet") and an optional *software* content filter
  (`SetupSoftwareFilter`). The model collapses them into one. The consequence is worth knowing: on a
  real PlayzerX the hardware filter is fixed and not exposed by its API, so you could not drive the
  mirror into resonance through content alone — the emulator lets you, which is truthful about a
  full MTI controller and permissive about PlayzerX specifically.
- **Voltage-to-angle is linear, and the device does not correct it either.** Real mirrors ship a
  per-unit Static Response characterisation precisely because the relationship is not linear, and
  the `MTIParam` list contains no linearisation or calibration entry — the Controller maps normalised
  `[-1,+1]` to Vdifference directly. So this is an uncorrected real-hardware effect the model omits,
  not one the device handles. It is omitted because inventing a curve would fabricate exactly the
  per-unit data the honesty boundary forbids.
- **The device's reconstruction is assumed to be a zero-order hold.** `MTIParam` includes an
  undocumented `InterpolationType` with no enum and no comment, and PlayzerX's API does not expose
  it, so whether the Controller holds or interpolates between buffer samples is unresolved. A hold
  is the conservative assumption; if it interpolates, the model overstates stepping at low device
  rates.
- The BDQ high-voltage stage is not modelled — PlayzerX takes normalised `[-1, +1]` and generates
  drive internally.
- Zero-phase filtering runs per tap frame, not over a closed content buffer, so frame boundaries are
  an approximation. The reverse pass is warm-started rather than odd-padded.
- The zero-order hold is a phase accumulator, not a resampler: it holds at the device rate but does
  not model the Controller's own reconstruction filter or buffer wrap.
- `compensateFilterDelay` is not implemented. The XY-versus-modulation delay it corrects is an
  artifact ADR-0010 sub-decision 5 deliberately leaves visible.
- Only Bessel and Butterworth of the seven families in `FilterType`.
- One resonant mode per axis. Real MEMS structures have several; the first dominates.
- No cross-axis coupling, mount resonance, or thermal drift.
- The rendered trace is a Lanczos *reconstruction* of the model's output. More defensible here than
  for the galvo, since a 500 Hz-limited signal is very far below Nyquist.
- `process()` allocates a fresh `Float32Array` per call, matching the galvo model.
- Coefficients depend on the audio sample rate, so changing it (44.1 ⇄ 48 kHz) changes the response.
  Correct behaviour, not a bug.

## Related

- `docs/mems-device-limits.html` — every PlayzerX limit with its source: sample rate, bandwidth,
  settling time, point-to-point step time, position resolution, and the vendor's damage warning.
  Start here when asking how far the device can be pushed
- `docs/adr/0012-mems-laser-beam-emulator.md` — the decision record, including why this model was
  re-grounded on PlayzerX rather than the PicoAmp driver guide
- `docs/galvo-laser-emulator.md` — the sibling spec, whose structure this mirrors
- `docs/mems-mirror-survey.html` — the twelve-library survey and the quasistatic/resonant split
- `docs/mems-quasistatic-drive-path.html` — the traced **PicoAmp** chain; useful background, but not
  the device this emulator models
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the analog Z channel this view consumes
