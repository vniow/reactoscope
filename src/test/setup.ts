import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';

// Clear localStorage between tests so useLocalStorage starts fresh.
beforeEach(() => {
	window.localStorage.clear();
});

// Clean up any mounted React trees after each test.
afterEach(() => {
	// @testing-library/react auto-unmounts via its own afterEach;
	// this is a safety net for any manual renders.
});
