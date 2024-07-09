import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

import Oscillator from '../Audio/Oscillator';

interface WaveScreenProps {
  audioContext: AudioContext;
  merger: ChannelMergerNode;
  channel: number;
  pcm: Float32Array;
}

export function WaveScreen({
  audioContext,
  merger,
  channel,
  pcm,
}: WaveScreenProps) {
  const [width, height] = [256, 256];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
  const [scene] = useState(new THREE.Scene());
  const [camera] = useState(
    new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000)
  );
  const [material] = useState(
    new THREE.LineBasicMaterial({ color: 'rgb(4, 217, 255)' })
  );

  useEffect(() => {
    // Initialize renderer
    if (canvasRef.current && !renderer) {
      const newRenderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
      });
      setRenderer(newRenderer);
      camera.position.z = 5;
    }

    if (renderer && scene) {
      renderer.setSize(width, height);
      renderer.render(scene, camera);

      scene.clear();

      const points = [];
      const step = pcm.length / width;

      for (let i = 0; i < width; i++) {
        const pcmIndex = Math.floor(i * step);
        points.push(
          new THREE.Vector3(-1 + (2 * i) / (width - 1), pcm[pcmIndex], 0)
        );
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }
  }, [camera, renderer, scene, pcm, width, height, material]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
      />
      <Oscillator
        audioContext={audioContext}
        merger={merger}
        channel={channel}
        pcm={pcm}
      />
    </div>
  );
}

export default WaveScreen;
