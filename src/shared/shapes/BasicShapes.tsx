import { Line } from '@react-three/drei';
import { Color, Vector3, Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface ShapeProps {
  lineWidth?: number;
  rotation?: [number, number, number];
  onVertexPositions?: (positions: Vector3[]) => void;
}

export function TriangleShape({ lineWidth = 1, rotation = [0, 0, 0], onVertexPositions }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Smaller triangle, offset left
  const points: [number, number, number][] = [
    [-0.5, 0.5, 0],
    [-1.0, -0.5, 0],
    [0.0, -0.5, 0],
    [-0.5, 0.5, 0],
  ];
  // Example: cyan, magenta, yellow, cyan
  const vertexColors = [
    new Color(0x00ffff),
    new Color(0xff00ff),
    new Color(0xffff00),
    new Color(0x00ffff),
  ];
  useFrame(() => {
    if (groupRef.current && onVertexPositions) {
      const euler = new Euler(...rotation);
      const positions = points.map(([x, y, z]) => {
        const v = new Vector3(x, y, z);
        v.applyEuler(euler);
        if (groupRef.current) {
          v.applyMatrix4(groupRef.current.matrixWorld);
        }
        return v;
      });
      onVertexPositions(positions);
    }
  });
  return (
    <group ref={groupRef} rotation={rotation}>
      <Line points={points} vertexColors={vertexColors} lineWidth={lineWidth} />
    </group>
  );
}

export function SquareShape({ lineWidth = 1, rotation = [0, 0, 0], onVertexPositions }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Smaller square, offset right
  const points: [number, number, number][] = [
    [0.5, 0.5, 0],
    [1.0, 0.5, 0],
    [1.0, 0, 0],
    [0.5, 0, 0],
    [0.5, 0.5, 0],
  ];
  // Example: green, blue, red, orange, green
  const vertexColors = [
    new Color(0x00ff00),
    new Color(0x0000ff),
    new Color(0xff0000),
    new Color(0xff9900),
    new Color(0x00ff00),
  ];
  useFrame(() => {
    if (groupRef.current && onVertexPositions) {
      const euler = new Euler(...rotation);
      const positions = points.map(([x, y, z]) => {
        const v = new Vector3(x, y, z);
        v.applyEuler(euler);
        if (groupRef.current) {
          v.applyMatrix4(groupRef.current.matrixWorld);
        }
        return v;
      });
      onVertexPositions(positions);
    }
  });
  return (
    <group ref={groupRef} rotation={rotation}>
      <Line points={points} vertexColors={vertexColors} lineWidth={lineWidth} />
    </group>
  );
}
