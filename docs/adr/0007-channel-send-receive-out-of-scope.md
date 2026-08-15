# Channel's send/receive bus routing is permanently out of scope

`Channel.send(name, volume)` / `receive(name)` let a node route audio to or from a named string
bus, entirely outside the normal node-graph connection model — the audio actually flows, but no
edge on the canvas represents it. reactoscope's node graph works on the invariant that every
connection between two nodes is a visible edge; that's implicit in how the app works today, worth
stating explicitly here because Channel is the first node whose underlying Tone.js class offers a
way to break it.

This is a boundary decision, not a v1 scope cut like the param-count reductions elsewhere in Tier
3 (MultibandCompressor, Panner3D) — those are "less work for now, easy to add more sliders later."
This one is "no," permanently: exposing send/receive would mean a Channel node could be
effectively wired to another node with nothing on the canvas showing it, which cuts against the
whole point of a node-graph UI. If bus routing turns out to be genuinely wanted later, it needs
its own design as a visible graph concept (a bus node type, say), not a shortcut bolted onto
Channel's param panel.
