# Reactoscope

A node-graph synthesizer whose audio output drives oscilloscope
visualisation: sound and image are the same six-channel signal.

## Language

### Signal path

**Master Output**:
The six-channel bus (X, Y, R, G, B, Z) every signal converges on. X/Y position
the beam, R/G/B colour it, Z is its analog intensity/blanking control; the
same bus feeds the speakers and every renderer.
_Avoid_: master node, output stage

**Z Channel**:
The analog beam-intensity control, in `[-1, +1]`: `-1` is fully blanked (beam
off), `+1` is full intensity, and everything between is a continuous dimming —
there is no separate on/off flag. Named for the Z axis on a real oscilloscope
or laser, which modulates intensity the same way, independent of X/Y deflection.
_Avoid_: alpha channel, blank flag, A channel

**Scene Input**:
The source that turns 3D scene geometry into six-channel audio by scanning a
coord buffer at a fixed scan frequency.
_Avoid_: scene node, geometry input

**Coord Buffer**:
A flattened list of beam points (position + colour) produced from scene
geometry, ready to be scanned into audio.
_Avoid_: path data, point list

**Waveform Tap**:
A read path from the Master Output to a renderer. Two adapters exist (analyser
snapshot, capture buffer); readers should not care which one produced a frame,
but they are told whether that frame *continues* the previous one. A stateful
reader — see Scanner Model — cannot be correct without knowing.
_Avoid_: audio data getter

### Rendering

**Beam Emulator**:
A renderer that simulates a physical display device driven by the Master
Output, drawing where that device's beam actually goes. Three are named: CRT
(built), Galvo Laser (specified, see `docs/galvo-laser-emulator.md`), MEMS
Laser (deferred). The Sweep view is deliberately not one — it plots channels
against time rather than emulating a device.
_Avoid_: renderer, visualizer, scope (all three now ambiguous)

**CRT**:
The Beam Emulator for an oscilloscope tube in XY mode. Electrostatic deflection
has no meaningful mechanical lag, so it renders the commanded signal directly.
Implemented as `WoscopeSceneR3F`; the "Woahscope"/"Woscope" spellings scattered
through the tree are historical, not a second concept.

**Galvo Laser**:
The Beam Emulator for a galvanometer-mirror laser projector. Unlike the CRT it
renders *simulated actual* beam position, not the command — the difference
between the two views is the whole product.

**MEMS Laser**:
The Beam Emulator for a MEMS-mirror laser projector. Named but not built: a
MEMS mirror is a high-Q resonant structure rather than a damped servo, so it is
a different Scanner Model behind the same seam, scoped separately.

**Scanner Model**:
The simulation of a beam-steering mechanism's physical response — for a galvo,
a per-axis second-order servo plus a slew-rate clamp, turning commanded X/Y
into actual X/Y. Named for the industry term for the mirror assembly, so a MEMS
response is a second implementation rather than a rename.
_Avoid_: galvo model, mirror sim

### Graph

**Audio Engine**:
The module that owns every live audio object. The graph store tells it what
exists and how it is wired; nothing outside it touches Tone.js.
_Avoid_: audio layer, sound manager

**Node Handler**:
The adapter that gives one node type its audio lifecycle (create, dispose,
params, start/stop). Every node type has exactly one, registered by type.
_Avoid_: node controller, node manager

**Single-Use Source**:
A sound source that can never restart after stopping; restarting one means
rebuilding it from its live params and re-wiring its outgoing connections.
_Avoid_: one-shot source

**Stub**:
A graph node with no audio behaviour yet — a placeholder for a planned node type.

**Patch**:
A saved DAW session: the node graph, its wiring, and its settings, as a file.
_Avoid_: preset, project file
