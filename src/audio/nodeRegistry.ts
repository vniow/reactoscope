import type { NodeTypeHandler } from './nodes/nodeHandler';
import { gainHandler }             from './nodes/gain';
import { dcSignalHandler }         from './nodes/dcSignal';
import { oscillatorHandler }       from './nodes/oscillator';
import { noiseHandler }            from './nodes/noise';
import { lfoHandler }              from './nodes/lfo';
import { fmOscillatorHandler }     from './nodes/fmOscillator';
import { amOscillatorHandler }     from './nodes/amOscillator';
import { fatOscillatorHandler }    from './nodes/fatOscillator';
import { pulseOscillatorHandler }  from './nodes/pulseOscillator';
import { pwmOscillatorHandler }    from './nodes/pwmOscillator';
import { reverbHandler }           from './nodes/reverb';
import { jcReverbHandler }         from './nodes/jcReverb';
import { freeverbHandler }         from './nodes/freeverb';
import { delayHandler }            from './nodes/delay';
import { feedbackDelayHandler }    from './nodes/feedbackDelay';
import { pingPongDelayHandler }    from './nodes/pingPongDelay';
import { distortionHandler }       from './nodes/distortion';
import { chebyshevHandler }        from './nodes/chebyshev';
import { bitCrusherHandler }       from './nodes/bitCrusher';
import { frequencyShifterHandler } from './nodes/frequencyShifter';
import { pitchShiftHandler }       from './nodes/pitchShift';
import { stereoWidenerHandler }    from './nodes/stereoWidener';
import { phaserHandler }           from './nodes/phaser';
import { chorusHandler }           from './nodes/chorus';
import { tremoloHandler }          from './nodes/tremolo';
import { vibratoHandler }          from './nodes/vibrato';
import { autoFilterHandler }       from './nodes/autoFilter';
import { autoPannerHandler }       from './nodes/autoPanner';
import { autoWahHandler }          from './nodes/autoWah';
import { debugHandler }            from './nodes/debug';
import { stubHandler }             from './nodes/stub';
import { playerHandler }           from './nodes/player';
import { grainPlayerHandler }      from './nodes/grainPlayer';
import { micInputHandler }         from './nodes/micInput';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _registry = new Map<string, NodeTypeHandler<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _byKind   = new Map<string, NodeTypeHandler<any>>();

export const nodeRegistry = {
	/**
	 * `kind` is the audio-entry discriminant the handler stores in _audioNodes.
	 * It equals the React Flow node type for every handler except
	 * noiseGenerator, whose entries use kind 'noise'.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	register(type: string, handler: NodeTypeHandler<any>, kind: string = type): void {
		_registry.set(type, handler);
		_byKind.set(kind, handler);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get(type: string): NodeTypeHandler<any> | undefined {
		return _registry.get(type);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getByKind(kind: string): NodeTypeHandler<any> | undefined {
		return _byKind.get(kind);
	},
};

nodeRegistry.register('gain',             gainHandler);
nodeRegistry.register('dcSignal',         dcSignalHandler);
nodeRegistry.register('oscillator',       oscillatorHandler);
nodeRegistry.register('noiseGenerator',   noiseHandler, 'noise');
nodeRegistry.register('lfo',              lfoHandler);
nodeRegistry.register('fmOscillator',     fmOscillatorHandler);
nodeRegistry.register('amOscillator',     amOscillatorHandler);
nodeRegistry.register('fatOscillator',    fatOscillatorHandler);
nodeRegistry.register('pulseOscillator',  pulseOscillatorHandler);
nodeRegistry.register('pwmOscillator',    pwmOscillatorHandler);
nodeRegistry.register('reverb',           reverbHandler);
nodeRegistry.register('jcReverb',         jcReverbHandler);
nodeRegistry.register('freeverb',         freeverbHandler);
nodeRegistry.register('delay',            delayHandler);
nodeRegistry.register('feedbackDelay',    feedbackDelayHandler);
nodeRegistry.register('pingPongDelay',    pingPongDelayHandler);
nodeRegistry.register('distortion',       distortionHandler);
nodeRegistry.register('chebyshev',        chebyshevHandler);
nodeRegistry.register('bitCrusher',       bitCrusherHandler);
nodeRegistry.register('frequencyShifter', frequencyShifterHandler);
nodeRegistry.register('pitchShift',       pitchShiftHandler);
nodeRegistry.register('stereoWidener',    stereoWidenerHandler);
nodeRegistry.register('phaser',           phaserHandler);
nodeRegistry.register('chorus',           chorusHandler);
nodeRegistry.register('tremolo',          tremoloHandler);
nodeRegistry.register('vibrato',          vibratoHandler);
nodeRegistry.register('autoFilter',       autoFilterHandler);
nodeRegistry.register('autoPanner',       autoPannerHandler);
nodeRegistry.register('autoWah',          autoWahHandler);
nodeRegistry.register('debug',            debugHandler);
nodeRegistry.register('stub',             stubHandler);
nodeRegistry.register('player',           playerHandler);
nodeRegistry.register('grainPlayer',      grainPlayerHandler);
nodeRegistry.register('micInput',         micInputHandler);
