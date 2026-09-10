// ─── Scene complexity ───────────────────────────────────────────────────────
// How many distinct line segments (src/scene/pathBuilder.ts's collectSegments
// output, before orderSegments/buildCoordBuffer resample it) the currently
// authored scene decomposes into — a circle drawn as a few long strokes vs. a
// cube's twelve edges. Deliberately not the same thing as "points": the
// coord buffer buildCoordBuffer hands the AudioWorklet is always exactly
// coordBufferSize entries regardless of scene complexity (it redistributes a
// fixed budget across whatever geometry exists), so it can never reflect
// "how much detail is this shape asking for" — this does.
//
// Set from useSceneToAudio.ts's path-worker message handler, which runs
// inside the Scene Input panel's own Canvas — a separate component tree from
// the scope view that wants to display this. A plain module-level getter,
// same minimal shape as audio/capture.ts's getWaveformWriteIndex(), avoids
// threading a prop or context between two otherwise-unrelated Canvases.

let _lastSegmentCount: number | null = null;

export function setLastSegmentCount(n: number | null): void {
	_lastSegmentCount = n;
}

export function getLastSegmentCount(): number | null {
	return _lastSegmentCount;
}
