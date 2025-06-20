import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppStore } from './types';
import { createThemeSlice } from './themeSlice';
import { createUISlice } from '../../flow/stores/uiSlice';
import { createAudioSlice } from '../../audio/stores/audioSlice';
import { createFlowSlice } from '../../flow/stores/flowSlice';
import { createSceneSlice } from '../../nodes/stores/sceneSlice';

// Create the main store by combining slices
export const useAppStore = create<AppStore>()(
	devtools(
		(set, get, api) => ({
			// Combine all slices with proper typing
			...createThemeSlice(set, get, api),
			...createUISlice(set, get, api),
			...createAudioSlice(set, get, api),
			...createFlowSlice(set, get, api),
			...createSceneSlice(set, get, api),
		}),
		{
			name: 'reactoscope-store', // Name for devtools
		}
	)
);
