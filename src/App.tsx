import './App.css';
import WaveScreen from './components/Screen/WaveScreen';
import { ProcessPCM } from './components/Audio/ProcessPCM';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const audioContext = new AudioContext();
const merger = audioContext.createChannelMerger(2);

function App() {
  const [width, height] = [512, 512];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene] = useState(new THREE.Scene());
  const [camera] = useState(
    new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000)
  );
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const [pcmX, setPcmX] = useState(new Float32Array(width).fill(0));
  const [pcmY, setPcmY] = useState(new Float32Array(height).fill(0));
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
      camera.position.z = 5;
      renderer.render(scene, camera);

      const handleMouseUp = () => setIsMouseDown(false);
      window.addEventListener('mouseup', handleMouseUp);

      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [camera, scene]);

  const handleMouseDown = () => setIsMouseDown(true);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    updatePoints(x, y);
  };

  const updatePoints = (x: number, y: number) => {
    const newPoint = new THREE.Vector3(x, y, 0);
    const newPoints = [...points, newPoint];

    setPoints(newPoints);
    updateScene(newPoints);
  };

  const updatePointsArray = (newPoints: THREE.Vector3[]) => {
    setPoints((prevPoints) => [...prevPoints, ...newPoints]);
    updateScene([...points, ...newPoints]);
  };

  const generateRandomPoints = () => {
    const numberOfPoints = Math.floor(Math.random() * 10) + 1; // Generate between 1 and 10 points
    const newPoints = [];
    for (let i = 0; i < numberOfPoints; i++) {
      const x = Math.random() * 2 - 1; // Random x between -1 and 1
      const y = Math.random() * 2 - 1; // Random y between -1 and 1
      newPoints.push(new THREE.Vector3(x, y, 0));
      if (i > 0) {
        const prevPoint = newPoints[newPoints.length - 2];
        const midX = (prevPoint.x + x) / 2;
        const midY = (prevPoint.y + y) / 2;
        newPoints.splice(
          newPoints.length - 1,
          0,
          new THREE.Vector3(midX, midY, 0)
        );
      }
    }
    updatePointsArray(newPoints);
  };

  const updateScene = (points: THREE.Vector3[]) => {
    if (!canvasRef.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current }); // Initialize renderer here to ensure it's always defined
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 'rgb(4, 217, 255)' });
    const line = new THREE.Line(geometry, material);
    scene.clear();
    scene.add(line);
    renderer.render(scene, camera);
  };

  const clearCanvas = () => {
    setPoints([]);
    scene.clear();
    if (canvasRef.current) {
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
      renderer.render(scene, camera);
    }
    setPcmX(new Float32Array(width).fill(0));
    setPcmY(new Float32Array(height).fill(0));
  };

  return (
    <div>
      <div className='draw-canvas'>
        <label>draw on me</label>
        <label>warning: it'll be noisy</label>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsMouseDown(false)}
        />
      </div>
      <button onClick={clearCanvas}>clear canvas</button>
      <button onClick={generateRandomPoints}>random points</button>
      <ProcessPCM
        points={points}
        setPcmX={setPcmX}
        setPcmY={setPcmY}
      />
      <div className='wave-container'>
        <div className='wave-screen-wrapper'>
          <label>left</label>
          <WaveScreen
            pcm={pcmX}
            audioContext={audioContext}
            merger={merger}
            channel={0}
          />
        </div>
        <div className='wave-screen-wrapper'>
          <label>right</label>
          <WaveScreen
            pcm={pcmY}
            audioContext={audioContext}
            merger={merger}
            channel={1}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
