import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppStore } from './types';
import { createThemeSlice } from './themeSlice';
import { createUISlice } from '../../flow/stores/uiSlice';
import { createFlowSlice } from '../../flow/stores/flowSlice';

// Create the main store by combining slices
export const useAppStore = create<AppStore>()(
	devtools(
		(set, get, api) => ({
			// Combine all slices with proper typing
			...createThemeSlice(set, get, api),
			...createUISlice(set, get, api),
			...createFlowSlice(set, get, api),
		}),
		{
			name: 'reactoscope-store', // Name for devtools
		}
	)
);
