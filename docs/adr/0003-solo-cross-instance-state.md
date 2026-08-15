# Solo's cross-instance mute state: store-driven, not polled

Soloing one `Solo` node must mute every other `Solo`/`Channel` instance sharing the audio context.
Tone.js already does this for free via its own internal static registry — that part needs no new
code. What's new is that reactoscope's UI also needs every *other* node's displayed state to
update in response, which no existing node does today (every other node's param changes are
purely local to itself).

We're keeping audio truth and UI truth in separate places: Tone's registry stays the source of
truth for actual audio muting, and the `daw.ts` store gains a field tracking which node id (if
any) is currently soloed. `SoloNode` (and later `Channel`) components read that store field to
render other instances' dimmed/muted visual state, rather than polling Tone's internal registry
on an interval the way the tap+readout nodes poll audio levels. Polling was the other option
considered — it would have repurposed a pattern meant for continuous audio signals to track a
discrete boolean toggle, and would have required exposing Tone's internal registry through
`engine.ts`'s public surface, which it isn't today. This is the first node in the catalogue where
one instance's param change needs to visibly affect other node components' displayed state; the
same store-field pattern is expected to extend to `Channel`'s built-in solo behavior later.
