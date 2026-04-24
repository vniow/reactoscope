import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
	server: {
		headers: {
			'Cross-Origin-Opener-Policy':   'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
	preview: {
		headers: {
			'Cross-Origin-Opener-Policy':   'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			sourcemap: false,
		},
	},
	build: {
		target: 'es2020',
		// 'hidden' generates .map files for Sentry upload but omits sourceMappingURL
		// comments so browsers never request them. SENTRY_UPLOAD=1 enables map
		// generation in CI; otherwise maps are skipped entirely.
		sourcemap: process.env.SENTRY_UPLOAD ? 'hidden' : false,
		// Three.js is 718 KB min — it cannot be split further without breaking its
		// internal circular imports. Raise the warning threshold to suppress the
		// false-positive rather than hiding a real actionable issue.
		chunkSizeWarningLimit: 750,
		rollupOptions: {
			output: {
				manualChunks: {
					'vendor-three': ['three'],
					'vendor-r3f':   ['@react-three/fiber', '@react-three/drei'],
					'vendor-tone':  ['tone'],
					'vendor-mui':   ['@mui/material', '@mui/icons-material'],
				},
			},
		},
	},
	plugins: [
		react(),
		glsl({
			include: '**/*.glsl',
			exclude: undefined,
			warnDuplicatedImports: true,
			defaultExtension: 'glsl',
			watch: true,
		}),
		// Only upload source maps to Sentry in CI (set SENTRY_UPLOAD=1).
		// deleteAfterUpload removes .map files before Vercel receives the artifact.
		...(process.env.SENTRY_UPLOAD ? [sentryVitePlugin({
			org:       process.env.SENTRY_ORG,
			project:   process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN,
			sourcemaps: { assets: './dist/**', deleteAfterUpload: true },
		})] : []),
	],
});
