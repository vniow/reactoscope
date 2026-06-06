/**
 * ILDA Image Data Transfer Format codec.
 *
 * Supports all five frame formats from the IDTF rev 011 spec:
 *
 *   Format 0 — 3D Indexed Color  (8 bytes/point:  X16 Y16 Z16 status idx) — decode only
 *   Format 1 — 2D Indexed Color  (6 bytes/point:  X16 Y16     status idx) — decode only
 *   Format 2 — Colour palette    (3 bytes/entry:  R G B)                  — decode only, updates state
 *   Format 4 — 3D True Color    (10 bytes/point:  X16 Y16 Z16 status B G R)
 *   Format 5 — 2D True Color    ( 8 bytes/point:  X16 Y16     status B G R)
 *
 * On decode, indexed-colour frames (0, 1) get upgraded to true-colour by looking
 * up each point's index in the current palette — either the standard 64-colour
 * ILDA default palette (DEFAULT_ILDA_PALETTE below) or a palette established by
 * a preceding format-2 section. The returned IldaPoint always carries explicit
 * r/g/b; downstream code doesn't need to know whether the file was indexed.
 *
 * On encode, only the true-colour formats (4, 5) are supported — modern content
 * doesn't use indexed colour and we'd otherwise need to round-trip a palette.
 *
 * A file is a sequence of sections. Each section starts with a 32-byte header
 * (the "ILDA " signature + format code + frame metadata + record count) and
 * is followed by `recordCount` point records. The file ends with a header
 * whose `recordCount` is zero — every conformant reader stops there.
 *
 * Coordinate system: int16 signed, range −32768 … +32767, with the origin at
 * centre-screen. We convert to/from NDC (−1 … +1) at the boundary.
 *
 * Status byte layout:
 *   bit 7 (0x80) — last point in this frame (the reader uses this as a guard
 *                  against malformed record counts; we set it on the final point)
 *   bit 6 (0x40) — blanking (1 = beam off / blanked travel)
 *   bits 0..5   — reserved (zero on write, ignored on read)
 *
 * Colour bytes for formats 4/5 are stored as **B, G, R** in the file — endianness
 * gotcha that trips up every first implementation. Format 2 palette entries
 * use the more intuitive R, G, B order.
 *
 * Spec reference: ILDA Technical Committee, IDTF rev 011.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

/** Encode formats are restricted to true-colour. Decode accepts all five. */
export type IldaFormat = 4 | 5;
/** Format code as it appears on disk. Format 2 is a palette section, not a frame. */
type IldaFormatOnDisk = 0 | 1 | 2 | 4 | 5;

/** One point in an ILDA frame, normalised to the codec's internal representation. */
export interface IldaPoint {
	/** X coordinate in NDC, range [-1, +1]. */
	x:      number;
	/** Y coordinate in NDC, range [-1, +1]. */
	y:      number;
	/** Z coordinate in NDC, range [-1, +1]. Ignored in format 5. */
	z?:     number;
	/** Red intensity [0, 1]. */
	r:      number;
	/** Green intensity [0, 1]. */
	g:      number;
	/** Blue intensity [0, 1]. */
	b:      number;
	/** true → blanked travel (beam off). */
	blank:  boolean;
}

export interface IldaFrame {
	format:       IldaFormat;
	/** Frame name (max 8 ASCII chars; longer is truncated). */
	name:         string;
	/** Company / author (max 8 ASCII chars). */
	company:      string;
	/** Frame index within an animation sequence (0-based). */
	frameNumber:  number;
	/** Total frames in the sequence the file represents. */
	totalFrames:  number;
	/** Scanner head ID (rarely used; defaults to 0). */
	scannerHead:  number;
	points:       IldaPoint[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ILDA_MAGIC          = 'ILDA';
const HEADER_BYTES        = 32;
const STATUS_LAST_POINT   = 0x80;
const STATUS_BLANK        = 0x40;
const I16_MAX             = 32767;

/**
 * Standard 64-colour ILDA default palette (IDTF rev 011 Appendix A).
 * Applies to indexed-colour frames (formats 0, 1) when no format-2 palette
 * section has been encountered earlier in the file. Stored as 64 × [R, G, B]
 * bytes; index `i` reads from offset `i * 3`.
 */
export const DEFAULT_ILDA_PALETTE: Uint8Array = new Uint8Array([
	255,   0,   0,   // 0  Red
	255,  16,   0,   // 1
	255,  32,   0,   // 2
	255,  48,   0,   // 3
	255,  64,   0,   // 4
	255,  80,   0,   // 5
	255,  96,   0,   // 6
	255, 112,   0,   // 7
	255, 128,   0,   // 8  Orange
	255, 144,   0,   // 9
	255, 160,   0,   // 10
	255, 176,   0,   // 11
	255, 192,   0,   // 12
	255, 208,   0,   // 13
	255, 224,   0,   // 14
	255, 240,   0,   // 15
	255, 255,   0,   // 16 Yellow
	224, 255,   0,   // 17
	192, 255,   0,   // 18
	160, 255,   0,   // 19
	128, 255,   0,   // 20
	 96, 255,   0,   // 21
	 64, 255,   0,   // 22
	 32, 255,   0,   // 23
	  0, 255,   0,   // 24 Green
	  0, 255,  36,   // 25
	  0, 255,  73,   // 26
	  0, 255, 109,   // 27
	  0, 255, 146,   // 28
	  0, 255, 182,   // 29
	  0, 255, 219,   // 30
	  0, 255, 255,   // 31 Cyan
	  0, 227, 255,   // 32
	  0, 198, 255,   // 33
	  0, 170, 255,   // 34
	  0, 142, 255,   // 35
	  0, 113, 255,   // 36
	  0,  85, 255,   // 37
	  0,  56, 255,   // 38
	  0,  28, 255,   // 39
	  0,   0, 255,   // 40 Blue
	 32,   0, 255,   // 41
	 64,   0, 255,   // 42
	 96,   0, 255,   // 43
	128,   0, 255,   // 44
	160,   0, 255,   // 45
	192,   0, 255,   // 46
	224,   0, 255,   // 47
	255,   0, 255,   // 48 Magenta
	255,  32, 255,   // 49
	255,  64, 255,   // 50
	255,  96, 255,   // 51
	255, 128, 255,   // 52
	255, 160, 255,   // 53
	255, 192, 255,   // 54
	255, 224, 255,   // 55
	255, 255, 255,   // 56 White
	255, 224, 224,   // 57
	255, 192, 192,   // 58
	255, 160, 160,   // 59
	255, 128, 128,   // 60
	255,  96,  96,   // 61
	255,  64,  64,   // 62
	255,  32,  32,   // 63
]);

// ─── Encode ───────────────────────────────────────────────────────────────────

/**
 * Encode one or more frames into a single .ild file buffer.
 * Appends the canonical zero-record terminator section.
 */
export function encodeIldaFile(frames: IldaFrame[]): ArrayBuffer {
	const sections = frames.map(encodeSection);
	const eof      = encodeHeader({
		format:      frames[0]?.format ?? 5,
		name:        '',
		company:     '',
		recordCount: 0,
		frameNumber: frames.length,
		totalFrames: frames.length,
		scannerHead: frames[0]?.scannerHead ?? 0,
	});
	sections.push(eof);

	const total = sections.reduce((n, s) => n + s.byteLength, 0);
	const out   = new Uint8Array(total);
	let offset  = 0;
	for (const s of sections) {
		out.set(new Uint8Array(s), offset);
		offset += s.byteLength;
	}
	return out.buffer;
}

function encodeSection(frame: IldaFrame): ArrayBuffer {
	const bytesPerPoint = frame.format === 4 ? 10 : 8;
	const totalBytes    = HEADER_BYTES + frame.points.length * bytesPerPoint;
	const buf           = new ArrayBuffer(totalBytes);
	const view          = new DataView(buf);

	// Header
	writeHeaderInto(view, 0, {
		format:      frame.format,
		name:        frame.name,
		company:     frame.company,
		recordCount: frame.points.length,
		frameNumber: frame.frameNumber,
		totalFrames: frame.totalFrames,
		scannerHead: frame.scannerHead,
	});

	// Points
	let p = HEADER_BYTES;
	for (let i = 0; i < frame.points.length; i++) {
		const pt = frame.points[i];
		view.setInt16(p, ndcToI16(pt.x), false); p += 2;
		view.setInt16(p, ndcToI16(pt.y), false); p += 2;
		if (frame.format === 4) {
			view.setInt16(p, ndcToI16(pt.z ?? 0), false); p += 2;
		}
		let status = 0;
		if (pt.blank) status |= STATUS_BLANK;
		if (i === frame.points.length - 1) status |= STATUS_LAST_POINT;
		view.setUint8(p, status); p += 1;
		view.setUint8(p, channelTo8(pt.b)); p += 1;
		view.setUint8(p, channelTo8(pt.g)); p += 1;
		view.setUint8(p, channelTo8(pt.r)); p += 1;
	}

	return buf;
}

function encodeHeader(args: {
	format:      IldaFormat;
	name:        string;
	company:     string;
	recordCount: number;
	frameNumber: number;
	totalFrames: number;
	scannerHead: number;
}): ArrayBuffer {
	const buf  = new ArrayBuffer(HEADER_BYTES);
	const view = new DataView(buf);
	writeHeaderInto(view, 0, args);
	return buf;
}

function writeHeaderInto(view: DataView, offset: number, args: {
	format:      IldaFormat;
	name:        string;
	company:     string;
	recordCount: number;
	frameNumber: number;
	totalFrames: number;
	scannerHead: number;
}): void {
	writeAscii(view, offset + 0, ILDA_MAGIC, 4);
	// bytes 4–6 reserved (zero)
	view.setUint8(offset + 7, args.format);
	writeAscii(view, offset + 8,  args.name,    8);
	writeAscii(view, offset + 16, args.company, 8);
	view.setUint16(offset + 24, clampU16(args.recordCount), false);
	view.setUint16(offset + 26, clampU16(args.frameNumber), false);
	view.setUint16(offset + 28, clampU16(args.totalFrames), false);
	view.setUint8 (offset + 30, args.scannerHead & 0xff);
	// byte 31 reserved
}

// ─── Decode ───────────────────────────────────────────────────────────────────

/**
 * Decode an .ild file buffer into its constituent frames. The trailing
 * zero-record terminator section is not returned (it carries no payload).
 *
 * Indexed-colour frames (formats 0, 1) are upgraded to true-colour using the
 * current palette — either the DEFAULT_ILDA_PALETTE or a palette established
 * by a preceding format-2 section in the same file. The returned `format`
 * field on the IldaFrame reflects what was on disk; the points carry r/g/b
 * regardless.
 *
 * Throws if the buffer is malformed (bad magic, unknown format code, truncated).
 */
export function decodeIldaFile(buf: ArrayBuffer): IldaFrame[] {
	const view   = new DataView(buf);
	const frames: IldaFrame[] = [];
	// Per-file palette state: starts as the default ILDA palette, replaced by
	// any format-2 palette section encountered later in the file.
	let palette: Uint8Array = DEFAULT_ILDA_PALETTE;
	let offset = 0;

	while (offset + HEADER_BYTES <= view.byteLength) {
		const magic = readAscii(view, offset, 4);
		if (magic !== ILDA_MAGIC) throw new Error(`ILDA: bad section magic at byte ${offset}: ${JSON.stringify(magic)}`);
		const format       = view.getUint8 (offset + 7) as IldaFormatOnDisk;
		const name         = readAscii(view, offset + 8,  8);
		const company      = readAscii(view, offset + 16, 8);
		let   recordCount  = view.getUint16(offset + 24, false);
		const frameNumber  = view.getUint16(offset + 26, false);
		const totalFrames  = view.getUint16(offset + 28, false);
		const scannerHead  = view.getUint8 (offset + 30);

		// Zero-record terminator → end of file.
		if (recordCount === 0) break;

		const bytesPerPoint = pointStride(format);
		if (bytesPerPoint === 0) {
			throw new Error(`ILDA: unsupported format ${format} at byte ${offset} (recognized formats: 0, 1, 2, 4, 5)`);
		}
		let sectionBytes = HEADER_BYTES + recordCount * bytesPerPoint;
		// Some files in the wild (incl. portions of the official ILDA test suite)
		// truncate the last record by a few bytes. Clamp recordCount to what the
		// buffer actually contains and warn, rather than refusing to decode.
		if (offset + sectionBytes > view.byteLength) {
			const availablePointBytes = view.byteLength - offset - HEADER_BYTES;
			if (availablePointBytes < 0) {
				throw new Error(`ILDA: section at byte ${offset} truncated (no point data, need ${sectionBytes}, have ${view.byteLength - offset})`);
			}
			const clamped = Math.floor(availablePointBytes / bytesPerPoint);
			if (clamped === 0) {
				throw new Error(`ILDA: section at byte ${offset} truncated (need ${sectionBytes}, have ${view.byteLength - offset})`);
			}
			console.warn(`ILDA: section at byte ${offset} truncated (declared ${recordCount} records, only ${clamped} fit in remaining ${view.byteLength - offset - HEADER_BYTES} bytes) — reading what's available`);
			recordCount = clamped;
			sectionBytes = HEADER_BYTES + recordCount * bytesPerPoint;
		}

		if (format === 2) {
			// Palette table — stash for subsequent indexed frames; not returned.
			palette = new Uint8Array(recordCount * 3);
			let p = offset + HEADER_BYTES;
			for (let i = 0; i < recordCount; i++) {
				palette[i * 3]     = view.getUint8(p);     // R
				palette[i * 3 + 1] = view.getUint8(p + 1); // G
				palette[i * 3 + 2] = view.getUint8(p + 2); // B
				p += 3;
			}
			offset += sectionBytes;
			continue;
		}

		const points: IldaPoint[] = new Array(recordCount);
		let p = offset + HEADER_BYTES;
		const has3D     = format === 0 || format === 4;
		const isIndexed = format === 0 || format === 1;

		for (let i = 0; i < recordCount; i++) {
			const x = view.getInt16(p, false); p += 2;
			const y = view.getInt16(p, false); p += 2;
			let z = 0;
			if (has3D) { z = view.getInt16(p, false); p += 2; }
			const status = view.getUint8(p); p += 1;

			let r: number, g: number, b: number;
			if (isIndexed) {
				const idx     = view.getUint8(p); p += 1;
				const palLen  = palette.length / 3;
				const palIdx  = palLen > 0 ? (idx % palLen) : 0;
				const palOff  = palIdx * 3;
				r = palette[palOff]     / 255;
				g = palette[palOff + 1] / 255;
				b = palette[palOff + 2] / 255;
			} else {
				const bByte = view.getUint8(p); p += 1;
				const gByte = view.getUint8(p); p += 1;
				const rByte = view.getUint8(p); p += 1;
				r = rByte / 255; g = gByte / 255; b = bByte / 255;
			}
			points[i] = {
				x:     i16ToNdc(x),
				y:     i16ToNdc(y),
				z:     has3D ? i16ToNdc(z) : undefined,
				r, g, b,
				blank: (status & STATUS_BLANK) !== 0,
			};
		}

		// Surface the on-disk format so downstream code can preserve the file's
		// original shape; the IldaFormat encode type is a subset that excludes
		// the indexed variants (encode-only restriction).
		frames.push({
			format:      (format as unknown) as IldaFormat,
			name, company, frameNumber, totalFrames, scannerHead, points,
		});
		offset += sectionBytes;
	}
	return frames;
}

/** Returns bytes-per-record for each format, or 0 if the format is unknown. */
function pointStride(format: IldaFormatOnDisk): number {
	switch (format) {
		case 0: return 8;   // 3D indexed
		case 1: return 6;   // 2D indexed
		case 2: return 3;   // palette entry (R, G, B)
		case 4: return 10;  // 3D true colour
		case 5: return 8;   // 2D true colour
		default: return 0;
	}
}

// ─── COORD_STRIDE adapter — bridges pathBuilder coord buffer ↔ ILDA points ───

/**
 * Convert an interleaved coord buffer (stride 7: x,y,r,g,b,a,blank) produced
 * by buildCoordBuffer into an ILDA frame. r/g/b are encoded in the [-1, +1]
 * audio range; we remap to [0, 1] here so the file gets the actual intensity.
 */
export function coordBufferToIldaFrame(
	data:    Float32Array,
	nPoints: number,
	meta:    Partial<Omit<IldaFrame, 'points' | 'format'>> & { format?: IldaFormat } = {},
): IldaFrame {
	const stride = 7;
	const points: IldaPoint[] = new Array(nPoints);
	for (let i = 0; i < nPoints; i++) {
		const o = i * stride;
		const blank = data[o + 6] > 0.5;
		// Audio-range [-1, +1] → [0, 1]; blanked points end up with negative values
		// from the upstream pipeline, so clamp to [0, 1] before writing.
		const r = blank ? 0 : Math.max(0, Math.min(1, 0.5 + 0.5 * data[o + 2]));
		const g = blank ? 0 : Math.max(0, Math.min(1, 0.5 + 0.5 * data[o + 3]));
		const b = blank ? 0 : Math.max(0, Math.min(1, 0.5 + 0.5 * data[o + 4]));
		points[i] = {
			x:     data[o],
			y:     data[o + 1],
			r, g, b,
			blank,
		};
	}
	return {
		format:      meta.format      ?? 5,
		name:        meta.name        ?? 'frame',
		company:     meta.company     ?? 'woahscope',
		frameNumber: meta.frameNumber ?? 0,
		totalFrames: meta.totalFrames ?? 1,
		scannerHead: meta.scannerHead ?? 0,
		points,
	};
}

/**
 * Convert one ILDA frame into the same interleaved coord-buffer layout the
 * sceneInputProcessor worklet consumes, so an .ild file can be played back
 * through the existing pipeline.
 */
export function ildaFrameToCoordBuffer(frame: IldaFrame): { data: Float32Array; nPoints: number } {
	const stride = 7;
	const n      = frame.points.length;
	const data   = new Float32Array(n * stride);
	for (let i = 0; i < n; i++) {
		const pt = frame.points[i];
		const o  = i * stride;
		data[o]     = pt.x;
		data[o + 1] = pt.y;
		// [0, 1] → [-1, +1] audio range; blank points encode color as -1 (matches
		// the buildCoordBuffer convention so MasterOutput sees identical signal).
		data[o + 2] = pt.blank ? -1 : (2 * pt.r - 1);
		data[o + 3] = pt.blank ? -1 : (2 * pt.g - 1);
		data[o + 4] = pt.blank ? -1 : (2 * pt.b - 1);
		data[o + 5] = pt.blank ? -1 : 1; // alpha channel: full intensity for visible points
		data[o + 6] = pt.blank ? 1  : 0;
	}
	return { data, nPoints: n };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ndcToI16(v: number): number {
	const c = Math.max(-1, Math.min(1, v));
	return Math.round(c * I16_MAX);
}

function i16ToNdc(v: number): number { return v / I16_MAX; }

function channelTo8(v: number): number {
	const c = Math.max(0, Math.min(1, v));
	return Math.round(c * 255);
}

function clampU16(v: number): number { return Math.max(0, Math.min(0xffff, v | 0)); }

function writeAscii(view: DataView, offset: number, s: string, len: number): void {
	for (let i = 0; i < len; i++) {
		const c = i < s.length ? s.charCodeAt(i) : 0;
		view.setUint8(offset + i, c < 128 ? c : 0x3f /* '?' */);
	}
}

function readAscii(view: DataView, offset: number, len: number): string {
	let s = '';
	for (let i = 0; i < len; i++) {
		const c = view.getUint8(offset + i);
		if (c === 0) break;
		s += String.fromCharCode(c);
	}
	return s;
}
