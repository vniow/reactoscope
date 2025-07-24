import { Line } from '@react-three/drei';
import { Vector3 } from 'three';

interface ConnectingLineProps {
  start?: Vector3;
  end?: Vector3;
  color?: string;
  lineWidth?: number;
}

export function ConnectingLine({ start, end, color = '#ffffff', lineWidth = 2 }: ConnectingLineProps) {
  if (!start || !end) return null;
  return <Line points={[start.toArray(), end.toArray()]} color={color} lineWidth={lineWidth} />;
}
