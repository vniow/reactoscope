# Reactoscope

A node-graph synthesizer whose audio output drives oscilloscope and laser
visualisation: sound and image are the same six-channel signal.

## Language

### Signal path

**Master Output**:
The six-channel bus (X, Y, R, G, B, A) every signal converges on. X/Y position
the beam, R/G/B/A colour it; the same bus feeds the speakers and every renderer.
_Avoid_: master node, output stage

**Scene Input**:
The source that turns 3D scene geometry into six-channel audio by scanning a
coord buffer at a fixed scan frequency.
_Avoid_: scene node, geometry input

**Coord Buffer**:
A flattened list of beam points (position + colour) produced from scene
geometry or an ILDA frame, ready to be scanned into audio.
_Avoid_: path data, point list

**Galvo Projector**:
The simulated laser projector: applies galvanometer deflection physics to the
Master Output so laser-mode rendering matches what physical hardware would draw.
_Avoid_: laser filter

**Waveform Tap**:
A read path from the Master Output to a renderer. Three exist today (analyser
snapshot, capture buffer, galvo ring); renderers should not care which one
they read.
_Avoid_: audio data getter

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
