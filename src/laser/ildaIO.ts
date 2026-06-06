/**
 * Browser-facing helper for ILDA file export.
 *
 * The codec itself is pure (src/laser/ildaCodec.ts); this module bridges it
 * to the running app by reading the cached coord buffer the path worker most
 * recently produced. ILDA import lives on the DAW canvas as `IldaFrameNode`,
 * not here — there's no parallel singleton loader anymore.
 */

import {
	encodeIldaFile,
	coordBufferToIldaFrame,
	type IldaFrame,
	type IldaFormat,
} from './ildaCodec';
import { getLastCoordBuffer } from '../store/daw';

/**
 * Encode the most recent coord buffer (the one the path worker most recently
 * shipped to the audio worklet) as a single-frame .ild file and trigger a
 * browser download.
 *
 * Returns false if no buffer is cached yet — caller can surface that to the
 * user as "scene not running" rather than failing silently.
 */
export function exportCurrentSceneAsIlda(opts: {
	filename?: string;
	format?:   IldaFormat;
	name?:     string;
	company?:  string;
} = {}): boolean {
	const cached = getLastCoordBuffer();
	if (!cached || cached.nPoints === 0) return false;

	const frame: IldaFrame = coordBufferToIldaFrame(cached.data, cached.nPoints, {
		format:  opts.format  ?? 5,
		name:    opts.name    ?? 'scene',
		company: opts.company ?? 'woahscope',
	});
	const buf = encodeIldaFile([frame]);
	triggerDownload(buf, opts.filename ?? `${frame.name || 'scene'}.ild`);
	return true;
}

function triggerDownload(buf: ArrayBuffer, filename: string): void {
	const blob = new Blob([buf], { type: 'application/octet-stream' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = filename;
	a.click();
	// Tiny delay so the click event flushes before we revoke.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
