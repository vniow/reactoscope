import { useContext } from 'react';
import { Canvas3DContext } from './CanvasProvider';

export function useCanvas3DContext() {
	return useContext(Canvas3DContext);
}
