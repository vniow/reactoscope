import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppState } from '../types';
import { createFlowSlice } from '../../flow/stores/flowSlice';
import { createAudioSlice } from '../../audio/stores/audioSlice';

export const useStore = create<AppState>()(
	devtools((...a) => ({
		...createFlowSlice(...a),
		...createAudioSlice(...a),
	}))
);
