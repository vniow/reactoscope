import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
	// Ignore generated/config files
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
	},

	// TypeScript recommended rules
	...tseslint.configs.recommended,

	// App source
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020,
			},
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooks,
			'jsx-a11y': jsxA11y,
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			// React hooks — catches missing deps, conditional hook calls, etc.
			...reactHooks.configs['recommended-latest'].rules,

			// Three.js objects (camera, uniforms, render targets) are designed to be
			// mutated — the immutability rule produces false positives across the whole
			// WebGL rendering layer.
			'react-hooks/immutability': 'off',

			// Calling setState inside useEffect to reset component state on prop change
			// is a legitimate React pattern (e.g. resetting TonePlayer when currentTrack
			// changes). The rule is too strict for this use case.
			'react-hooks/set-state-in-effect': 'off',

			// React — key prop required in lists
			'react/jsx-key': 'error',

			// TypeScript — catch unawaited async calls (e.g. graph.play())
			'@typescript-eslint/no-floating-promises': 'error',

			// Accessibility — WCAG-level checks on JSX elements
			...jsxA11y.configs.recommended.rules,

			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},

	// Relax rules for test files
	{
		files: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
);
