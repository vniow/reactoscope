import * as Tone from 'tone';

// This instance is created only once when the module is first imported.
// As long as this file doesn't change, HMR won't touch it, and the
// JavaScript module system's own cache will keep the instance alive.
const audioNodeRegistry = new Map<string, Tone.ToneAudioNode>();

console.log('Audio Registry singleton module initialized.');

export default audioNodeRegistry;
