import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppStore } from './types';
import { createThemeSlice } from './slices/themeSlice';
import { createFlowSlice } from './slices/flowSlice';
import { createUISlice } from './slices/uiSlice';
import { createAudioSlice } from './slices/audioSlice';

// Create the main store by combining slices
export const useAppStore = create<AppStore>()(
	devtools(
		(set, get, api) => ({
			// Combine all slices with proper typing
			...createThemeSlice(set, get, api),
			...createFlowSlice(set, get, api),
			...createUISlice(set, get, api),
			...createAudioSlice(set, get, api),
		}),
		{
			name: 'reactoscope-store', // Name for devtools
		}
	)
);
