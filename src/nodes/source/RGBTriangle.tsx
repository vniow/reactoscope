import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RGBTriangleProps {
  /** Scale factor for triangle size */
  scale?: number;
  /** Rotation speed for animation */
  rotationSpeed?: number;
}

/**
 * RGB Triangle Component
 * Creates a triangle with red, green, and blue vertices using BufferGeometry
 */
export function RGBTriangle({ scale = 1, rotationSpeed = 1 }: RGBTriangleProps): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  // Create triangle geometry with color attributes
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    
    // Define triangle vertices (equilateral triangle, closed loop)
    const vertices = new Float32Array([
      0.0, 1.0 * scale, 0.0,           // Top vertex (red)
      -0.866 * scale, -0.5 * scale, 0.0, // Bottom left (green)
      0.866 * scale, -0.5 * scale, 0.0,  // Bottom right (blue)
      0.0, 1.0 * scale, 0.0,           // Back to top to close
    ]);

    // Define colors for each vertex
    const colors = new Float32Array([
      1.0, 0.0, 0.0, // Red (top)
      0.0, 1.0, 0.0, // Green (bottom left)
      0.0, 0.0, 1.0, // Blue (bottom right)
      1.0, 0.0, 0.0, // Red (back to top to close)
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geom;
  }, [scale]);

  // Animate rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += rotationSpeed * delta;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true }))} />
    </group>
  );
}
