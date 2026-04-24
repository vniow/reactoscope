/**
 * Lock-free ring buffer backed by SharedArrayBuffer for cross-thread audio streaming.
 *
 * Layout (byte offsets):
 *   [0..3]   Int32  writeHead — next write position (index into channel arrays)
 *   [4..7]   Int32  readHead  — next read position
 *   [8..]    Float32[capacity] × CHANNEL_COUNT — channel data (non-interleaved)
 *
 * Thread safety: Atomics.load/store on Int32 elements provide SC atomicity.
 * The main thread writes; the audio worklet reads.
 */

export const RING_CHANNEL_COUNT = 6;

const HEADER_INTS  = 2;                    // writeHead, readHead
const HEADER_BYTES = HEADER_INTS * 4;      // 8 bytes

export type RingBuffer = {
	sab:       SharedArrayBuffer;
	capacity:  number;
	writeHead: Int32Array;
	readHead:  Int32Array;
	channels:  Float32Array[];
};

/**
 * @param sampleRate  AudioContext sample rate
 * @param frames      Frames of headroom; higher = more stable, higher latency.
 *                    Defaults to 60 (~1 s at 60fps / 44.1 kHz).
 */
export function createRingBuffer(sampleRate: number, frames = 60): RingBuffer {
	const samplesPerFrame = Math.ceil(sampleRate / 60);
	const capacity        = samplesPerFrame * frames;
	const sabBytes        = HEADER_BYTES + capacity * 4 * RING_CHANNEL_COUNT;
	const sab             = new SharedArrayBuffer(sabBytes);

	const header    = new Int32Array(sab, 0, HEADER_INTS);
	const writeHead = new Int32Array(sab, 0,  1);
	const readHead  = new Int32Array(sab, 4,  1);

	Atomics.store(header, 0, 0); // writeHead = 0
	Atomics.store(header, 1, 0); // readHead  = 0

	const channels: Float32Array[] = [];
	for (let ch = 0; ch < RING_CHANNEL_COUNT; ch++) {
		const byteOffset = HEADER_BYTES + ch * capacity * 4;
		channels.push(new Float32Array(sab, byteOffset, capacity));
	}

	return { sab, capacity, writeHead, readHead, channels };
}

/**
 * Write nSamples from data[6] into the ring buffer.
 * Returns false if the buffer was full (samples are dropped).
 */
export function writeRing(
	channels:  Float32Array[],
	writeHead: Int32Array,
	readHead:  Int32Array,
	capacity:  number,
	data:      Float32Array[],
	nSamples:  number,
): boolean {
	const wh = Atomics.load(writeHead, 0);
	const rh = Atomics.load(readHead,  0);
	const available = (rh - wh - 1 + capacity) % capacity;
	if (nSamples > available) return false; // overflow — drop

	for (let i = 0; i < nSamples; i++) {
		const pos = (wh + i) % capacity;
		for (let ch = 0; ch < RING_CHANNEL_COUNT; ch++) {
			channels[ch][pos] = data[ch] ? data[ch][i] : 0;
		}
	}
	Atomics.store(writeHead, 0, (wh + nSamples) % capacity);
	return true;
}

/**
 * Read nSamples from the ring buffer into out[6].
 * Returns false if insufficient data was available (out is filled with zeros).
 */
export function readRing(
	channels:  Float32Array[],
	writeHead: Int32Array,
	readHead:  Int32Array,
	capacity:  number,
	out:       Float32Array[],
	nSamples:  number,
): boolean {
	const rh = Atomics.load(readHead,  0);
	const wh = Atomics.load(writeHead, 0);
	const available = (wh - rh + capacity) % capacity;
	if (nSamples > available) {
		// Underrun: fill with zeros
		for (let ch = 0; ch < RING_CHANNEL_COUNT; ch++) {
			if (out[ch]) out[ch].fill(0);
		}
		return false;
	}

	for (let i = 0; i < nSamples; i++) {
		const pos = (rh + i) % capacity;
		for (let ch = 0; ch < RING_CHANNEL_COUNT; ch++) {
			if (out[ch]) out[ch][i] = channels[ch][pos];
		}
	}
	Atomics.store(readHead, 0, (rh + nSamples) % capacity);
	return true;
}
