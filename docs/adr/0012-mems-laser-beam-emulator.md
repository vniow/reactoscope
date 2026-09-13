---
status: accepted
---

# MEMS Laser is a third Beam Emulator, modelling PlayzerX's quasistatic drive path

> **Revised before merge.** The first draft of this ADR grounded the model in
> Mirrorcle's *MEMS Drivers 5.x User Guide* — the PicoAmp analog driver, whose
> band-limiting is a MAX7413 analog filter clocked at 60× its cutoff. That is a
> different product from the one reactoscope should be emulating. **PlayzerX** is
> Mirrorcle's own integrated module and SDK, it is the only device in the survey
> whose interface matches reactoscope's Master Output, and its band-limiting is a
> *software* filter with a selectable family and free order. The sub-decisions
> below are re-derived from the PlayzerX repository; the superseded material
> (fixed Bessel-2-or-5, the FCLK ÷ 60 readout) is recorded here so the change is
> visible rather than silent.

ADR-0010 built Galvo Laser and named **MEMS Laser** as the third Beam Emulator
"only so the Scanner Model seam is shaped to accept it." This ADR builds it.

## Context

A MEMS mirror has two incompatible drive regimes, and the PlayzerX SDK draws the
line itself: `MTIDataGenerator::RQWaveform` generates a "Resonant-Quasistatic"
waveform in which "one axis of the MEMS is driven at resonance while the other is
driven point-to-point." Resonant operation takes an amplitude and a frequency, not
a trajectory — there is no per-sample command, so there is no commanded-versus-actual
gap to render. Reactoscope's Master Output *is* an arbitrary per-sample trajectory,
so quasistatic is the only regime that can consume it.

PlayzerX is the right reference for that regime. It is Mirrorcle's own product
SDK, it is actively maintained, and its interface is the shape of reactoscope's
signal already: normalised `[-1, +1]` X/Y plus an 8-bit intensity, streamed over
USB. Three things in its source define the quasistatic path.

**The band-limiting is software, and it is configurable.**

```cpp
void SetupSoftwareFilter(unsigned int type, unsigned int order,
                         float cutoffFreq, float sampleFreq, bool twoChannel = true);
void FilterData(float* xData, float* yData, float* xFilt, float* yFilt,
                unsigned int numPoints, bool zeroPhase = true);
```

`type` indexes a `FilterType` enum beginning `FilterBessel = 1,
FilterButterworth = 2`, running on through Chebyshev, Elliptic and Legendre.
Order is a free parameter. And `zeroPhase` — forward-backward filtering, which
removes group delay entirely — is the *default*. None of that is a fixed
fifth-order analog Bessel.

**The Controller has its own output rate.** `SetSampleRate` sets how fast the
device reads its buffer; `PlayzerX-Demo` rejects anything outside 500–60,000
samples/sec and defaults streamed content to 20,000. A commanded position
therefore only updates that often, however fast the host streams into it.

**The mirror is the hazard the filter exists to manage.** The programming guide
states it directly: the mirror "is a high-Q spring-mass system, so large, rapid
excursions can lead to ringing," mitigated but not eliminated by a low-pass filter
on the Controller, and specifically warns about a low point count at a high sample
rate. That is the tradeoff a Beam Emulator exists to make visible.

One further corroboration that the model is shaped right: the demo carries a
`compensateFilterDelay` flag, which "rotates m data to minimize group delay
difference between xy and m data output." The XY path is delayed by filtering and
the modulation path is not — exactly the artifact reactoscope's shared laser
renderer already produces by leaving R/G/B/Z unfiltered, and the same problem
laser-dac-rs's `with_color_delay` solves for galvos.

## Decision

Build **MEMS Laser**, a third Beam Emulator reading the same Waveform Tap, whose
Scanner Model is PlayzerX's quasistatic path:

```
command → amplitude clamp → zero-order hold at the device rate
        → software filter (family, order, cutoff, optional zero-phase)
        → high-Q mirror
```

Nine sub-decisions, each with the alternative that was rejected.

### 1. Model the quasistatic regime only; resonant MEMS is a separate device

Adding a `mode: 'quasistatic' | 'resonant'` switch inside one emulator was
rejected. The two regimes do not share a control paradigm — in quasistatic mode
the input is a trajectory, in resonant mode it is an amplitude and a frequency —
so a switch that changes what the *input means* is two devices wearing one name.
`RQWaveform` treats them as different enough to need different generators per
axis; this ADR treats them as different enough to need different devices.

### 2. The dominant stage is a filter deliberately placed in front of the mirror

Modelling a MEMS mirror as "the galvo model with different coefficients" was
rejected as the central error this ADR exists to avoid. The quasistatic response
is dominated by a band-limiting stage the *designer chose*, not by the mirror's
own transfer function. Getting that backwards produces a view showing MEMS as a
softer galvo, losing both the linear-phase character and the resonance hazard.

### 3. The filter family and order are selectable, with Bessel the default

Superseding the first draft's fixed choice of Bessel at order 2 or 5. That came
from the PicoAmp's MAX7413 and described the wrong product. `SetupSoftwareFilter`
takes family and order as free parameters, so the emulator does too — orders 1–8,
with Bessel and Butterworth implemented.

Bessel is the default because flat group delay is what vector content needs: the
figure is delayed uniformly rather than reshaped, so corners soften instead of
overshooting. Butterworth is offered rather than omitted precisely because the
contrast is instructive — at order 5 the measured group-delay spread across the
passband is 0.017% for Bessel against 36.8% for Butterworth, and step overshoot
0.79% against 12.8%. Switching family in the UI shows a MEMS mirror behaving like
a galvo servo, which is the clearest available demonstration of what the Bessel
is buying.

Both families are normalised to −3dB at the cutoff, so switching family does not
silently move the corner. DSPFilters, which PlayzerX vendors, does not necessarily
normalise Bessel that way internally; a consistent meaning for "cutoff" is worth
more here than matching an internal convention.

### 4. The amplitude clamp precedes everything, and there is no slew clamp

The clamp models a safe-deflection limit, which on real hardware is a limit on
drive voltage — `MTIDeviceLimits` exposes `VdifferenceMax_Min`/`_Max` — so it
applies to the command, before filtering.

There is deliberately **no slew-rate clamp**, which is the most likely thing for a
reader to think is missing given ADR-0010 sub-decision 2. The galvo needs one
because a linear filter is scale-invariant and would price a full-scale jump as
free. Here the band limit already bounds the rate of change, so a second
constraint on the same quantity would only let two parameters contradict each
other.

### 5. The device output rate is modelled as a zero-order hold

New in this revision. `SetSampleRate` is not a detail of the transport: the
Controller reads its buffer at that rate, so the commanded position genuinely
steps rather than moving continuously, and at the low end of the permitted range
that is visible. Modelling it as a hold ahead of the filter is both the simplest
and the most faithful reading.

Rejected: treating reactoscope's audio rate as the device rate. That would hide a
real constraint — and the constraint is the one that most distinguishes a
buffer-streaming module from an analog driver taking a continuous voltage.

### 6. Zero-phase filtering is offered, and defaults on

`FilterData` defaults `zeroPhase` to true, so content prepared by the SDK is
band-limited without being displaced in time. The emulator offers it as a toggle
and defaults it on to match.

Two honest caveats are recorded rather than hidden. Forward-backward filtering
applies the response twice, so the corner sits at −6dB rather than −3dB; this is
not compensated, matching the reference. And it is non-causal, which is only
meaningful because PlayzerX filters a whole content buffer before uploading it —
in the emulator it runs per tap frame, so a frame boundary is an approximation.
Turning it off gives the causal, streaming case.

The mirror stage stays **outside** the zero-phase pass. A physical structure
cannot respond before it is driven, whatever the content pipeline did.

### 7. Mechanical resonance is a separate, switchable stage

Folding it into the main filter was rejected because the two have opposite roles:
the filter is what the designer chose, the resonance is what the hardware does
anyway, and the margin between them is the safety question the view should answer.

Being switchable also makes the model falsifiable by inspection: with the
resonator off, output should be visibly overshoot-free at any cutoff *in Bessel
mode*. If it overshoots there, the filter coefficients are wrong.

Mechanically this stage is the **same RBJ second-order lowpass the Galvo Scanner
Model already uses**, at very high Q (ζ = 1/(2Q), so ζ ≈ 0.005 at Q = 100). It is
a reuse, not new math — which is why `src/dsp/biquad.ts` is shared.

### 8. Extract a shared `LaserSceneR3F`; do not duplicate the galvo renderer

`GalvoSceneR3F` was 374 lines of which the Scanner Model was a small part; the
rest is laser-generic. Copying it was rejected: ~340 duplicated lines and every
future optics fix needing to land twice. The extraction is safe specifically
because the piece most likely to break is test-covered.

### 9. Readouts are display-only

Tracking error, clamped fraction and reset count carry over. The MEMS-specific
pair:

- **Resonance margin** — `resonanceFreq ÷ cutoff`, flagged below roughly 4.
- **Normalised cutoff** — `cutoff ÷ deviceSampleRate`, the `cutoffFreq`/`sampleFreq`
  ratio `SetupSoftwareFilter` is actually configured with.

The first draft's **equivalent FCLK** readout (`cutoff × 60`) is removed. PlayzerX
has no filter clock; that was the PicoAmp's, and displaying it here would assert a
hardware relationship this device does not have.

## Honesty boundary

The same boundary as ADR-0010 applies, and one more.

This model is **directionally correct, not calibrated.** Defaults are plausible
orders of magnitude, not measurements from a mirror.

The additional boundary is specific to MEMS: **voltage-to-angle is modelled as
linear, and on real hardware it is not.** Every Mirrorcle mirror ships a per-unit
Static Response characterisation precisely because that curve has to be measured
per device. A view calibrated to a specific mirror would need that mirror's
report, which is exactly the kind of per-unit data no simulation should pretend to
have.

## Naming

**MEMS Laser** joins **CRT** and **Galvo Laser** as Beam Emulators. Its Scanner
Model implementation is the **Quasistatic Model** — named for the drive regime, so
a resonant implementation can be added later as a sibling rather than forcing a
rename, the same reason "Scanner Model" was named generically in the first place.

## Non-goals

- **Resonant-mode MEMS.** Per sub-decision 1; its own ADR, not a toggle.
- **Per-unit voltage-to-angle calibration.** See the honesty boundary.
- **Modelling the BDQ high-voltage stage.** PlayzerX takes normalised `[-1, +1]`
  and generates drive internally; simulating Vbias and Vdifference separately
  would add two numbers that always move together and change nothing on screen.
- **`compensateFilterDelay`.** The demo's XY-versus-M group-delay compensation is
  a real behaviour and a plausible future toggle, but the artifact it corrects is
  one ADR-0010 sub-decision 5 deliberately leaves visible. Recorded, not built.
- **Chebyshev, Elliptic, Legendre families.** In the enum, not implemented. Bessel
  and Butterworth span the group-delay tradeoff the view exists to show.
- **Cross-axis coupling, thermal drift, mount resonance.** As ADR-0010.
- **Real hardware output.** No DAC, no USB, no Controller. This renders to a canvas.

## Considered Options

- **A `mode` toggle covering both quasistatic and resonant** — rejected: the two
  regimes change what the input signal *means*.
- **Grounding the model in the PicoAmp driver guide** — rejected on review: it
  describes a different product whose analog filter clock has no PlayzerX analog.
  This was the first draft's actual error.
- **Reusing the Galvo Scanner Model with softer coefficients** — rejected: models
  the mechanics as dominant when the dominant stage is a deliberate filter.
- **A fixed filter family and order** — rejected: `SetupSoftwareFilter` takes both
  as parameters, and the Bessel/Butterworth contrast is instructive in itself.
- **Butterworth-only** — rejected: discards the flat group delay that is the
  reason a Bessel is the sensible default for vector content.
- **Adding a slew clamp for symmetry with the galvo** — rejected: the band limit
  already bounds slew.
- **Ignoring the device sample rate** — rejected: it is an enforced, documented
  limit and the clearest difference between a streaming module and an analog driver.
- **Compensating zero-phase filtering back to −3dB** — rejected: the reference does
  not, and a corner that moves when a toggle flips is worse than one that is
  documented.
- **Folding mechanical resonance into the main filter** — rejected: hides the
  cutoff-to-resonance margin.
- **Duplicating `GalvoSceneR3F`** — rejected: ~340 duplicated lines.
- **One shared `LaserContext` for Galvo and MEMS** — rejected for this task:
  renaming live `galvo.*` keys discards saved settings for no functional gain.

## Related

- `docs/mems-laser-emulator.md` — the design spec; this ADR is the *why*
- `docs/adr/0010-galvo-laser-beam-emulator.md` — the sibling emulator
- `docs/mems-quasistatic-drive-path.html` — the traced hardware chain. Note it
  documents the **PicoAmp** path; sub-decision 3 explains why the emulator follows
  PlayzerX instead
- `docs/mems-mirror-survey.html` — the twelve-library survey and the regime split
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the analog Z channel
