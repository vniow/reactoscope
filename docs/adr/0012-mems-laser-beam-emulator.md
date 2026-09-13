---
status: accepted
---

# MEMS Laser is a third Beam Emulator, modelling a filtered drive path rather than a servo

ADR-0010 built Galvo Laser and named **MEMS Laser** as the third Beam Emulator "only so the Scanner
Model seam is shaped to accept it." This ADR builds it, and records what changed once the hardware
was actually read: a MEMS mirror is not a slower galvo, and the thing that shapes its output is not
its mechanics.

## Context

A MEMS mirror has two incompatible drive regimes. Mirrorcle's own driver documentation groups its
products as **quasistatic**, **resonant-quasistatic**, and **resonant**, and only the quasistatic
case accepts an arbitrary X/Y trajectory. A resonant mirror is excited at one frequency and position
falls out as the phase of that oscillation — there is no commanded-versus-actual gap to render,
because there is no per-sample command. Reactoscope's Master Output is an arbitrary analog signal,
so quasistatic is the only regime that can consume it, and therefore the only one worth emulating
first.

The surprise is in the chain. Surveying twelve MEMS control libraries (`docs/mems-mirror-survey.html`,
`docs/mems-quasistatic-drive-path.html`) produced this signal path for the Analog Input driver:

```
command → amplitude clamp → 5th-order Bessel low-pass → BDQ high-voltage stage → high-Q mirror
```

Two facts from that path drive this design.

First, **the dominant filter is electronic, not mechanical.** The part is a MAX7413, a clock-tuned
5th-order Bessel low-pass sitting between the analog input and the high-voltage stage, with its
cutoff set at FCLK ÷ 60. Its entire purpose is to keep drive content well below the mirror's
mechanical resonance so the mechanics never ring. This inverts the galvo model, where the
second-order response *is* the mechanics. Here the mechanics are something the circuit exists to
suppress.

Second, **that filter is set far lower than the hardware's ceiling.** The driver is specified at
50–25,000 Hz, but that is the figure with the filters bypassed. In practice `LD_MemsMirror`
hardcodes a 220 Hz cutoff and Mirrorcle's own worked example uses 500 Hz — roughly 1–2% of the audio
band reactoscope produces. A quasistatic MEMS mirror is not a vector-graphics device at
reactoscope's native rate, and a view that shows this is more useful than one that flatters it.

The failure mode is documented by the vendor rather than inferred. PlayzerX's programming guide
states the mirror "is a high-Q spring-mass system, so large, rapid excursions can lead to ringing,"
mitigated but not eliminated by a low-pass filter on the controller. That is precisely the tradeoff
a Beam Emulator exists to make visible: raise the cutoff for a sharper drawing, and you move toward
the regime the vendor warns about.

## Decision

Build **MEMS Laser**, a third Beam Emulator reading the same Waveform Tap, whose Scanner Model is
the quasistatic drive path: an amplitude clamp, a Bessel low-pass, and a switchable high-Q
mechanical stage. Nine sub-decisions, each with the alternative that was rejected.

### 1. Model the quasistatic regime only; resonant MEMS is a separate device, not a mode toggle

Adding a `mode: 'quasistatic' | 'resonant'` switch inside one emulator was rejected. The two regimes
do not share a control paradigm: quasistatic tracks a commanded trajectory sample by sample, while
resonant takes an amplitude and a frequency and produces a Lissajous sweep whose points are not
independently addressable. A single device with a switch that changes what the *input* means is two
devices wearing one name. If resonant MEMS is ever built it gets its own ADR and its own entry in
the device selector.

### 2. The dominant stage is an electronic filter placed in front of the mechanics

Modelling a MEMS mirror as "the galvo model with different coefficients" was rejected as the central
error this ADR exists to avoid. The quasistatic response is dominated by a deliberate anti-resonance
filter, not by the mirror's own transfer function. Getting this backwards would produce a view that
shows MEMS as a softer galvo — losing both the linear-phase character that makes it different and
the resonance hazard that makes it interesting.

### 3. Bessel, not Butterworth — linear phase is the property being modelled

A Butterworth low-pass of the same order is a one-line change and flatter in amplitude. It was
rejected because amplitude flatness is not why the hardware uses a Bessel. A Bessel has maximally
flat *group delay*: every frequency component is delayed by the same amount, so the drawn figure is
delayed uniformly rather than reshaped. For vector content that is the whole point, and it is the
directly observable difference from the galvo — under a Bessel a corner softens, under a resonant
second-order servo it overshoots. Choosing the wrong prototype would erase the distinction.

### 4. The amplitude clamp precedes the filter, and there is no slew clamp

The clamp models a safe-deflection limit, which on real hardware is a limit on drive *voltage* — so
it applies to the command, before filtering. Both reference implementations put it there
(`LD_MemsMirror` clamps the signed DAC offset before writing;
`MEMS_Control_Function.py` range-checks the commanded Vdifference).

There is deliberately **no slew-rate clamp**, which is the most likely thing for a reader to think
is missing given ADR-0010 sub-decision 2. The galvo needs one because a linear filter is
scale-invariant and would price a full-scale jump as free. Here the band limit already bounds the
rate of change — a signal limited to 500 Hz cannot slew arbitrarily fast — so a separate clamp would
be modelling the same constraint twice and would make the two parameters fight.

### 5. Mechanical resonance is a separate, switchable stage

The mirror's own high-Q response is modelled as an optional final stage rather than folded into the
main filter. Folding it in was rejected because the two have opposite roles: the Bessel is what the
designer chose, the resonance is what the hardware does anyway, and the relationship between them —
how much margin sits between cutoff and resonance — is the safety question the view should answer.
Keeping them separate makes that margin a readout rather than an implementation detail.

Being switchable also makes the model falsifiable by inspection: with the resonator off, output
should be visibly overshoot-free at any cutoff; turn it on and raise the cutoff, and ringing should
appear. If it appears with the resonator off, the Bessel coefficients are wrong.

Mechanically this stage is the **same RBJ second-order low-pass the Galvo Scanner Model already
uses**, at very high Q (ζ = 1/(2Q), so ζ ≈ 0.005 at Q = 100). It is a reuse, not new math — which is
why `src/dsp/biquad.ts` is extracted rather than a second implementation written.

### 6. Extract a shared `LaserSceneR3F`; do not duplicate the galvo renderer

`GalvoSceneR3F.tsx` is 374 lines of which the Scanner Model is a small part; the rest — tracking-error
gate, exposure integration, Z shaping, Lanczos, draw pipeline — is laser-generic and would be
identical for MEMS. Copying it was rejected: it would duplicate ~340 lines and split every future
optics or exposure fix across two files that must be kept in sync by hand.

The extraction is safe specifically because the piece most likely to break is test-covered. The
shared renderer takes `makeAxisX`/`makeAxisY` factories, so `ScannerAxis` — already the only thing
the renderer imported from `src/galvo/` — becomes the actual plug-in point ADR-0010 promised rather
than a seam in name only.

### 7. MEMS settings live in a new `MemsContext` under `mems.*` keys

Follows ADR-0010 sub-decision 6 exactly, for the same reasons. MEMS Laser reads device-neutral
settings (`swapXY`, `invertXY`, `intensity`, `nSamples`, `lanczos*`) from `useAxis()` and keeps its
own copy of the optics and integration parameters. Sharing one `LaserContext` between Galvo and MEMS
was rejected for this task: it would mean renaming live `galvo.*` keys and silently discarding saved
user settings, which is the same trap ADR-0010 declined to walk into with `woscope.*`.

### 8. Every parameter is directly adjustable

Inherited unchanged from ADR-0010 sub-decision 8. No preset-first surface. The reasoning is stronger
here, if anything: the parameter that matters most (`cutoff`) is the one whose safe range depends on
a *different* parameter (`resonanceFreq`), and a preset would hide exactly that relationship.

### 9. Readouts are display-only, and two of them are MEMS-specific

Tracking error, reset count and the kpps readout carry over from Galvo. Two are new and specific to
this device:

- **Resonance margin** — `resonanceFreq ÷ cutoff`, flagged when it drops below roughly 4. This is
  the hardware-hazard number, and the one thing this view knows that no other view does.
- **Equivalent FCLK** — `cutoff × 60` Hz, the filter clock a real PicoAmp would need for the
  currently-set cutoff. Costs one multiplication and ties the simulation to a number someone would
  actually type into hardware.

As in ADR-0010 these **change nothing**: no clamping, no correction, no automatic limiting.

## Honesty boundary

The same boundary as ADR-0010 applies, and one more.

This model is **directionally correct, not calibrated.** Defaults are plausible orders of magnitude
taken from two reference codebases and one vendor worked example, not from a measured mirror. It can
say "this shape is past what a quasistatic mirror will draw cleanly." It can never say "this will
work on an A7B2.4."

The additional boundary is specific to MEMS: **the voltage-to-angle relationship is modelled as
linear, and on real hardware it is not.** Every Mirrorcle mirror ships a per-unit Static Response
characterisation precisely because the relationship has to be measured per device. The BDQ
differential drive makes it "approximately proportional" — the vendor's own hedge — and this model
takes that approximation at face value. A view calibrated to a specific mirror would need that
mirror's characterisation report, which is exactly the kind of per-unit data no simulation should
pretend to have.

## Naming

**MEMS Laser** joins **CRT** and **Galvo Laser** as Beam Emulators, named per ADR-0010 for the
device they emulate. Its Scanner Model implementation is the **Quasistatic Model** — named for the
drive regime, so that a resonant implementation can be added later as a sibling rather than forcing
a rename, in the same way "Scanner Model" was named generically to accept MEMS in the first place.

`CONTEXT.md` is updated: the **MEMS Laser** entry drops "Named but not built," and the **Beam
Emulator** entry drops "(deferred)".

## Non-goals

- **Resonant-mode MEMS.** A genuinely different control paradigm, per sub-decision 1. Deferred to
  its own ADR, not folded in as a toggle.
- **Per-unit voltage-to-angle calibration.** See the honesty boundary. The model is linear because
  the alternative is fabricating a characterisation report.
- **Modelling the BDQ high-voltage stage explicitly.** On the Analog Input driver the differential
  pair is generated inside the driver from one bipolar input, and reactoscope's normalised
  `[-1, +1]` signal already matches that input's convention. Simulating Vbias and Vdifference
  separately would add two numbers that always move together and change nothing on screen.
- **Cross-axis coupling, thermal drift, mount resonance.** Same exclusions as ADR-0010.
- **Real hardware output.** No DAC, no driver, no FCLK generation. This renders to a canvas. The
  equivalent-FCLK readout is a number on screen, not a signal on a pin.
- **Reworking `GalvoContext` into a shared laser context.** Per sub-decision 7; a scoped follow-up
  if a third laser device ever arrives.

## Considered Options

- **A `mode` toggle covering both quasistatic and resonant** — rejected: the two regimes change what
  the input signal *means*, which makes them two devices under one name.
- **Reusing the Galvo Scanner Model with softer coefficients** — rejected: models the mechanics as
  dominant when the hardware's dominant stage is a deliberate electronic filter in front of them.
- **Butterworth low-pass** — rejected: flatter amplitude, but discards the flat group delay that is
  the actual reason the hardware uses a Bessel and the observable difference from the galvo.
- **Adding a slew clamp for symmetry with the Galvo Scanner Model** — rejected: the band limit
  already bounds slew; a second constraint on the same quantity would only let the two parameters
  contradict each other.
- **Folding mechanical resonance into the main filter** — rejected: hides the cutoff-to-resonance
  margin, which is the safety relationship the view exists to surface.
- **Duplicating `GalvoSceneR3F` into `MemsSceneR3F`** — rejected: ~340 duplicated lines and every
  future optics fix needing to land twice.
- **One shared `LaserContext` for Galvo and MEMS params** — rejected for this task: renaming live
  `galvo.*` keys discards saved settings for no functional gain here.
- **Modelling the driver's 50–25,000 Hz bandwidth as the usable range** — rejected: that is the
  specification with the anti-resonance filters bypassed, a configuration the vendor documents as
  advanced-users-only. Treating it as normal would overstate the device by roughly fifty times.

## Related

- `docs/mems-laser-emulator.md` — the design spec; this ADR is the *why*, that is the *how*
- `docs/adr/0010-galvo-laser-beam-emulator.md` — the sibling emulator this one shares a seam with
- `docs/mems-quasistatic-drive-path.html` — the traced hardware signal chain this model is built from
- `docs/mems-mirror-survey.html` — the twelve-library survey that established the regime split
- `docs/adr/0009-z-channel-replaces-alpha-and-blank.md` — the analog Z channel this view consumes
