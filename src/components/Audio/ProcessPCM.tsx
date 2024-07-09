import React, { useEffect } from 'react';
import * as THREE from 'three';

interface ProcessPCMProps {
  points: THREE.Vector3[];
  setPcmX: React.Dispatch<React.SetStateAction<Float32Array>>;
  setPcmY: React.Dispatch<React.SetStateAction<Float32Array>>;
}

export function ProcessPCM({ points, setPcmX, setPcmY }: ProcessPCMProps) {
  useEffect(() => {
    // webaudio's periodic wave method yells at you if the array is too small
    const arraySize = Math.max(4, points.length);
    const updatedPcmX = new Float32Array(arraySize).fill(0);
    const updatedPcmY = new Float32Array(arraySize).fill(0);

    points.forEach((point, index) => {
      updatedPcmX[index] = point.x;
      updatedPcmY[index] = point.y;
    });

    setPcmX(updatedPcmX);
    setPcmY(updatedPcmY);
  }, [points, setPcmX, setPcmY]);

  return null;
}
