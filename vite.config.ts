import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import glsl from 'vite-plugin-glsl';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), glsl(), tailwindcss()],
	server: {
		port: 5173,
		host: true,
		open: false, // Don't auto-open browser (we'll handle this via debugger)
		strictPort: true, // Fail if port is already in use
	},
	build: {
		sourcemap: true, // Enable source maps for debugging
	},
});
