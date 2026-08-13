/// <reference types="vite/client" />

declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}

declare module '*.glsl' {
	const content: string;
	export default content;
}

// Extend Window interface to include webkit audio context
declare global {
	interface Window {
		webkitAudioContext: typeof AudioContext;
	}
}
