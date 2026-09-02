---
status: accepted
---

# Galvo Laser is a second Beam Emulator, driven by a simulated Scanner Model

Reactoscope has one renderer that simulates a physical display device: the CRT emulator
(`WoscopeSceneR3F`). This ADR records the decision to build a second one — **Galvo Laser** — and
the design constraints that follow from it. It is a *renderer* decision. It deliberately does not
resolve the pipeline questions ADR-0008 deferred.

## Context

ADR-0008 deferred galvo corner-safety blanking on two grounds: no laser hardware in hand, and no
reference implementation to build from. The second ground no longer holds —
`docs/architecture-comparison.md` documents two working, mutually disagreeing techniques
(LaserBoy's angle-proportional in-frame `add_dwell`, laser-dac-rs's fixed seam dwell with a
quintic-eased transit). The first still holds, and with it the deeper problem: **there is no way to
evaluate either technique.** Reactoscope can render what it *commands* the beam to do, and nothing
that shows what a galvo would actually do with that command.

Both existing views render the commanded path. The CRT emulator is correct to — electrostatic
deflection has no meaningful mechanical lag, so command and position are the same signal. A galvo
is a mechanical servo, and they are not. That gap is the entire reason this emulator exists: it is
the measuring instrument that has to exist before the thing it measures can be designed.

The evidence that both galvo references are compensating for an unmodelled mechanical response is
in their own code. laser-dac-rs uses a quintic ease-in-out because it is "physically modeling galvo
accel/decel, not just same-speed-more-steps," and ships `with_color_delay` because "galvo mirrors
need time to physically settle before the laser should fire" (50–200µs). LaserBoy inserts
`ceil((angle/π) × sample_rate × max_dwell_microsec)` repeated vertices — settle time approximated
from turn angle. Neither models the response; both pay for it. Modelling it explicitly is what an
emulator is for.

## Decision

Build **Galvo Laser**, a second Beam Emulator reading the same Waveform Tap as the CRT emulator,
which renders the *simulated actual mirror position* rather than the commanded position. The
simulation is a **Scanner Model**: a per-axis second-order servo with a slew-rate clamp.

Nine sub-decisions, each with the alternative that was rejected.

### 1. Simulate the mechanical response; do not restyle the CRT view

A cosmetic variant (hard blanking, no phosphor, brighter corners) would render the commanded path
with different colours — information the CRT view already carries. It could never reveal that a
shape is unscannable, which is the only question this view exists to answer.

### 2. Per-axis second-order response **plus** a slew clamp

A pure 2-pole linear system is scale-invariant: a full-scale corner-to-corner jump settles in the
same time as a 1% nudge. Real scanners do not. This matters concretely — `orderSegments`
(`pathBuilder.ts:201`) exists to minimise blank-beam travel and `VISIBLE_FRACTION` budgets 15% of
points to it. A linear-only model would report long blank jumps as free, and would therefore
endorse exactly the orderings that code exists to avoid. Both references price distance explicitly:
LaserBoy's `lit_delta_max`/`blank_delta_max` are literal slew limits, and laser-dac-rs scales
transit point count by L∞ distance — which `architecture-comparison.md` notes is "correct for two
independent, non-interacting galvo axes."

X and Y are modelled as **independent** systems with independently adjustable parameters. Two
separate mechanical assemblies, no cross-coupling; real rigs are also tuned per axis.

### 3. Scanner state carries across tap frames, and resets on detected discontinuity

The Scanner Model is stateful across time; the Waveform Tap is not guaranteed contiguous. The
capture worklet accumulates continuously and flushes contiguous frames, but `capture.ts` retains
only the *latest* — a main-thread stall queues several `'frame'` messages and the renderer sees only
the last, with the loss visible solely as a jump in `_captureWriteIndex`. The analyser fallback is
worse: arbitrarily overlapping windows with no contiguity at all. `setWaveformCaptureSize` zeroes
the accumulator, so a UI slider is a third discontinuity source.

Resetting state every frame was rejected: it fabricates a transient in the first samples of every
frame, and because the `nSamples` boundary is unrelated to `scanFrequency` that artifact lands
somewhere different each time — the emulator would invent overshoot, which is the one failure mode
that makes a simulation worse than no simulation.

Running the Scanner Model in an AudioWorklet at true audio rate is more physically correct and is
recorded here as the **documented upgrade path**, not chosen now: Scene Input's worklet can stop
being pulled entirely after two render quanta in some configs (issue #6), and the capture worklet's
SharedArrayBuffer→postMessage rewrite exists to chase a two-worklet memory leak (issues #7/#10).
Adding a third worklet to a system actively bisecting worklet bugs buys fidelity at the cost of the
thing being measured.

The chosen model — carry state, reset explicitly on discontinuity — is laser-dac-rs's `OutputFilter`
contract, which runs on the exact slice about to reach hardware with a documented
reset-on-discontinuity signal (`OutputResetReason`). The tap already provides the discontinuity
signal for free in `TapCursor`.

### 4. The Waveform Tap contract widens to carry continuity

`waveformTap.ts` currently states that "callers should not need to know which one produced a given
frame." That holds for stateless renderers and fails for a stateful one: Galvo Laser must know
whether a frame continues the previous one. The tap gains a continuity marker alongside the frame
(contiguous / gap / source-changed / first-frame). Existing callers ignore it and are unaffected.

### 5. The Scanner Model runs on X and Y only, before Lanczos upsampling

Order matters and the trap is silent. `useLanczos` upsamples up to 8×; running the servo on
upsampled samples makes its coefficients wrong by the upsampling factor, turning a 1 kHz scanner
into a 6 kHz one and *under*-reporting distortion. The chain is: raw tap samples at the true rate
(`getSampleRate()`) → Scanner Model → Lanczos → `updateGeometryArrays` → existing line pipeline.

R/G/B/Z pass through **unfiltered**, deliberately. A laser modulator responds in microseconds
against a galvo's hundreds of microseconds; treating it as instantaneous is physically right and
buys a real artifact for free — colour and blanking arrive at the *commanded* time while the beam is
at its *lagged* position, so colour fringing and blanking misalignment emerge from the model with no
special-case code. That is exactly what laser-dac-rs's `with_color_delay` exists to correct, which
is corroboration the model is shaped right.

### 6. Galvo-specific settings live in a new `GalvoContext`

`WoahscopeContext` currently mixes three unlike things: device-neutral settings (`swapXY`,
`invertXY`, `intensity`, `nSamples`, `lanczos*`), one setting that is not a renderer concern at all
(`coordBufferSize`, which sizes `buildCoordBuffer`), and CRT-specific settings meaningless to a
laser (`crtEnabled`, `persistence`, `hue`). All persisted under a `woscope.*` prefix.

Galvo parameters get their own provider and `galvo.*` keys. Galvo Laser reads device-neutral
settings from `useAxis()`, as `SweepSceneR3F` already does, and ignores the CRT-specific ones.
Refactoring `WoahscopeContext` now was rejected: renaming `woscope.*` keys silently discards every
saved user setting, and the refactor touches every consumer for no functional gain here. The
misfiling is recorded so the cleanup is a scoped follow-up rather than a later discovery.

### 7. A device selector on the existing scope panel, not a third panel

`VisualizationCanvasR3F` selects between Beam Emulators inside the existing square canvas. A third
concurrent `<Canvas>` would add another full pass pipeline (1024² lineRT + four blur targets) and
halve the resolution of both views — working directly against the purpose, since corner rounding and
ringing are small-scale artifacts. The accepted cost: each view owns its accumulation buffer, so
switching fades in over the integration window rather than snapping, making the comparison partly
one of memory. That is the specific reason someone may later want a true side-by-side view; it is
deferred, not rejected.

### 8. Every parameter is directly adjustable

The control surface exposes the full physical parameter set rather than presets with an advanced
disclosure. Presets, if added, are starting points only — never the primary interface. Rationale is
the emulator's purpose: it exists to answer "what does this scanner do to my shape," which requires
sweeping parameters freely, and a preset named for a kpps rating invites precisely the
calibrated-accuracy over-trust this ADR disclaims below.

### 9. A kpps readout, display-only

Reactoscope has no kpps concept anywhere — the effective point rate is `coordBufferSize ×
scanFrequency`, two sliders that do not know about each other, spanning ~26 to ~786,000 points/sec
with nothing flagging a physically impossible combination. Galvo Laser surfaces that product live
and flags it past a realistic ceiling. It **changes nothing**: no clamping, no correction, no
automatic point-rate limiting. Those are ADR-0008's territory and stay deferred.

## Honesty boundary

The Scanner Model is **directionally correct, not calibrated.** Until a real scanner's step response
is measured, this emulator can say "this shape is getting hard to scan." It can never say "this will
scan on a 30K galvo." Any UI, preset name, or readout that implies otherwise is a defect. This is
recorded as a decision, not a caveat, because a wrong servo coefficient does not crash — it renders
a confident, beautiful, wrong picture, and the failure is silent.

That is also why the Scanner Model gets **Vitest coverage** while the rest of the repo has none: it
is pure math over `Float32Array`s with closed-form expected values (step-response overshoot,
−3dB point, slew-limited transit time, discontinuity reset), and it is the one component here whose
bugs are invisible by inspection.

## Naming

Beam Emulators are named for the device they emulate: **CRT**, **Galvo Laser**, **MEMS Laser**. The
servo simulation is the **Scanner Model** — named for the industry term for the galvo assembly, so
that a future MEMS response slots in as a second Scanner Model behind the same seam rather than
forcing a rename. See `CONTEXT.md` for the full glossary entries.

## Non-goals

- **Corner-safety blanking, dwell insertion, and scan-rate limiting.** Still deferred per ADR-0008.
  This ADR builds the instrument that makes that decision evaluable; it does not make it.
- **MEMS Laser.** A MEMS mirror is a different actuator with different failure modes (a high-Q
  resonant structure rather than a damped servo) and is scoped separately. Named here only so the
  Scanner Model seam is shaped to accept it.
- **Real hardware output.** No DAC, no ILDA, no delivery layer. Galvo Laser renders to a canvas.
- **Calibration against real scanners.** See the honesty boundary above.
- **Renaming the CRT emulator.** `src/woahscope/` (directory), `WoahcopeSceneR3F.tsx` (filename,
  missing an `s`), `WoscopeSceneR3F` (export), `woscope.*` (storage keys) and `WoahscopeContext`
  are five spellings of two ideas. The device naming above gives that cleanup a target; it is a
  follow-up, not part of this work.
- **Side-by-side comparison view.** Deferred per sub-decision 7.

## Considered Options

- **Cosmetic laser styling instead of a servo model** — rejected: renders the commanded path, so it
  could not answer the only question the view exists for.
- **Linear second-order without a slew clamp** — rejected: reports long blank jumps as free, which
  would endorse the orderings `orderSegments` exists to avoid.
- **Scanner Model in an AudioWorklet** — deferred, not rejected: better fidelity, but a third
  worklet in a codebase actively bisecting worklet lifecycle and leak bugs.
- **Reset servo state every frame** — rejected: fabricates transients, i.e. invents the exact
  artifact being measured.
- **Extend `WoahscopeContext` with galvo params** — rejected: `crtEnabled` and scanner damping as
  siblings under a `woscope.*` prefix; cheap now, expensive later.
- **Refactor `WoahscopeContext` into device-neutral + per-device contexts now** — rejected for this
  task: discards saved settings, touches every consumer, no functional gain here.
- **Third concurrent panel** — deferred: halves resolution for both views, against the purpose.
- **Preset-first control surface** — rejected: the emulator's value is free parameter exploration,
  and kpps-named presets invite over-trust in an uncalibrated model.
