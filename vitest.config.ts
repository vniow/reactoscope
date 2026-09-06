import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts: that config exists to configure
// the app build (React, GLSL, Sentry, chunk splitting), none of which the
// pure-math modules under test need. Node environment, no DOM.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
