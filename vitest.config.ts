import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Deliberately independent of vite.config.ts: tests don't need the Sentry
// plugin, COOP/COEP headers, or chunking config.
export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		globals:     true,
		setupFiles:  './src/test/setup.ts',
		// .claude/ holds git worktrees whose file copies would double-run.
		exclude: [...configDefaults.exclude, '**/.claude/**'],
	},
});
