import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
	server: {
		headers: {
			'Cross-Origin-Opener-Policy':   'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
	},
	preview: {
		headers: {
			'Cross-Origin-Opener-Policy':   'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless',
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
		rolldownOptions: {
			output: {
				// Rolldown (Vite 8) rejects object-form manualChunks and its function
				// form silently folds three into the r3f chunk (groups pull in their
				// dependencies). codeSplitting.groups is the native replacement; group
				// order matters — earlier groups claim their modules first, so
				// vendor-three must precede vendor-r3f or three gets absorbed as a
				// dependency of @react-three/fiber.
				codeSplitting: {
					groups: [
						{ name: 'vendor-three', test: /node_modules[\\/]three[\\/]/ },
						{ name: 'vendor-r3f',   test: /node_modules[\\/]@react-three[\\/]/ },
						{ name: 'vendor-tone',  test: /node_modules[\\/]tone[\\/]/ },
						{ name: 'vendor-mui',   test: /node_modules[\\/]@mui[\\/]/ },
					],
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
