import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import glsl from 'vite-plugin-glsl';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), glsl(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		port: 5173,
		host: true,
		open: false, // Don't auto-open browser (we'll handle this via debugger)
		strictPort: false, 
		hmr: {
			overlay: false,
		},
	},
	build: {
		sourcemap: false, // Disable source maps for build
	},
});
