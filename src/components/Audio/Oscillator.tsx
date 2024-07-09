import { useState, useEffect, useRef } from 'react';
import { transform } from './fft';

interface OscillatorProps {
  audioContext: AudioContext;
  merger: ChannelMergerNode;
  channel: number;
  pcm: Float32Array;
}

export function Oscillator({
  audioContext,
  merger,
  channel,
  pcm,
}: OscillatorProps) {
  const [isPlaying] = useState(true);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const oscillator = audioContext.createOscillator();
    oscillator.setPeriodicWave(
      audioContext.createPeriodicWave(
        new Float32Array([0, 0]),
        new Float32Array([0, 0])
      )
    );

    oscillator.connect(merger, 0, channel);
    merger.connect(audioContext.destination);

    if (isPlaying) {
      oscillator.start();
      oscillatorRef.current = oscillator;
    }

    const setWave = (pcm: Float32Array) => {
      if (oscillatorRef.current) {
        const real = pcm.slice();
        const imag = pcm.slice().fill(0);

        transform(real, imag);

        const period = audioContext.createPeriodicWave(
          new Float32Array(real.slice(0, real.length / 2)),
          new Float32Array(imag.slice(0, imag.length / 2))
        );
        oscillatorRef.current.setPeriodicWave(period);
        audioContext.resume();
      }
    };

    setWave(pcm);

    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
    };
  }, [audioContext, isPlaying, channel, merger, pcm]);

  return null;
}

export default Oscillator;
