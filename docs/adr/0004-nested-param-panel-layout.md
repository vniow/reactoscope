# Nested param panels: side-by-side bands, not tabs

MidSideCompressor and MultibandCompressor are reactoscope's first nodes whose Tone.js params
naturally split into multiple named groups (mid/side, or low/mid/high bands) rather than one flat
list — every existing node UI is a single column of sliders/dropdowns. We're rendering each band
as its own labeled sub-panel, all shown side-by-side and always visible, rather than behind a tab
switcher that reveals one band at a time. Tabs would keep the node body narrower, but every other
node in the catalogue is direct-manipulation — every control is visible and editable without
clicking through anything first — and hiding two-thirds of a node's params behind tabs would be
the first departure from that. The node just gets wider instead, consistent with existing
precedent (nodes already scale width by param count, e.g. FFT/BiquadFilter at 2.5× the grid unit).

Each band reuses a new shared `CompressorControls` component (extracted from
`CompressorNode.tsx`'s existing threshold/ratio/attack/release/knee slider row, parameterized by
value+onChange per param) rather than each node hand-duplicating that row two or three more times.
