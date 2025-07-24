
import { Line } from '@react-three/drei';
import { Color, Vector3, Euler } from 'three';

export interface ShapeProps {
  lineWidth?: number;
  rotation?: [number, number, number];
}

export function TriangleShape({ lineWidth = 1, rotation = [0, 0, 0] }: ShapeProps) {
  const points: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [0.5, 1, 0],
    [0, 0, 0],
  ];
  const vertexColors = [
    new Color(0xff0000),
    new Color(0x00ff00),
    new Color(0x0000ff),
    new Color(0xff0000),
  ];
  // Centroid for triangle (first 3 points)
  const centroid = points.slice(0, 3).reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0]
  ).map(v => v / 3) as [number, number, number];
  const rotationEuler = new Euler(...rotation);
  const rotatedPoints = points.map(([x, y, z]) => {
    const v = new Vector3(x - centroid[0], y - centroid[1], z - centroid[2]);
    v.applyEuler(rotationEuler);
    v.add(new Vector3(...centroid));
    return [v.x, v.y, v.z] as [number, number, number];
  });
  // Last vertex for dot
  const lastVertex = new Vector3(...points[2]);
  lastVertex.sub(new Vector3(...centroid));
  lastVertex.applyEuler(rotationEuler);
  lastVertex.add(new Vector3(...centroid));
  const dotPosition: [number, number, number] = [lastVertex.x, lastVertex.y, lastVertex.z];
  return (
    <>
      <Line points={rotatedPoints} vertexColors={vertexColors} lineWidth={lineWidth} />
      <mesh position={dotPosition}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </>
  );
}

export function SquareShape({ lineWidth = 1, rotation = [0, 0, 0] }: ShapeProps) {
  const points: [number, number, number][] = [
    [0.5, 0.5, 0],
    [1.0, 0.5, 0],
    [1.0, 0, 0],
    [0.5, 0, 0],
    [0.5, 0.5, 0],
  ];
  const vertexColors = [
    new Color(0x00ff00),
    new Color(0x0000ff),
    new Color(0xff0000),
    new Color(0xff9900),
    new Color(0x00ff00),
  ];
  // Centroid for square (first 4 points)
  const centroid = points.slice(0, 4).reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0]
  ).map(v => v / 4) as [number, number, number];
  const rotationEuler = new Euler(...rotation);
  const rotatedPoints = points.map(([x, y, z]) => {
    const v = new Vector3(x - centroid[0], y - centroid[1], z - centroid[2]);
    v.applyEuler(rotationEuler);
    v.add(new Vector3(...centroid));
    return [v.x, v.y, v.z] as [number, number, number];
  });
  // First vertex for dot
  const firstVertex = new Vector3(...points[0]);
  firstVertex.sub(new Vector3(...centroid));
  firstVertex.applyEuler(rotationEuler);
  firstVertex.add(new Vector3(...centroid));
  const dotPosition: [number, number, number] = [firstVertex.x, firstVertex.y, firstVertex.z];
  return (
    <>
      <Line points={rotatedPoints} vertexColors={vertexColors} lineWidth={lineWidth} />
      <mesh position={dotPosition}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </>
  );
}
