# Recorder v1: no live mimeType, no auto-download, own lifecycle functions

Two related cuts to Recorder's v1 interaction, plus one wiring decision:

**No live `mimeType` control.** Tone.js's `Recorder.mimeType` is a read-only getter — it's
constructor-only, with no setter. A dropdown would mean disposing and recreating the whole
`toneNode` on every change, the same rebuild machinery `oscillator.ts` and friends use for
single-use sources. That's real complexity for a param the roadmap itself already called
low-priority, so v1 skips it entirely: `new Recorder()` with no options, browser default format.

**Persistent Download button, not auto-download.** `stop()` resolves with a `Blob`. Tone.js's own
documented example immediately builds an anchor element and calls `.click()` on it — an
instant browser download the moment recording stops. reactoscope shows a Download button plus a
duration/size readout instead, left for the user to click on their own schedule. Every other
action in the app is something the user explicitly does; a Stop button that silently triggers an
OS-level save dialog as a side effect would be the first exception. This also means a user can
keep the take around and decide whether to keep it before it leaves the browser.

**Own lifecycle functions, not the shared handler protocol.** `startRecording`/`stopRecording`/
`pauseRecording` live in `src/audio/nodes/recorder.ts` and are called directly by the node's UI
component, not threaded through `NodeTypeHandler.start`/`stop` — that protocol is reserved for the
single-use-source recreate-on-restart contract and doesn't fit record/pause/stop-with-blob-result.
This mirrors existing precedent in `player.ts` (`playNode`/`pauseNode`/`seekNode` etc., called
directly by `PlayerNode.tsx`, bypassing the generic handler path) rather than inventing a third
shape.
