import type { GeometrySourceType } from '../../store/dawTypes';

/** Which geometry-source type an imported file becomes, by extension. */
export function sourceTypeForFile(file: File): GeometrySourceType | null {
	const name = file.name.toLowerCase();
	if (name.endsWith('.svg')) return 'svgImport';
	if (name.endsWith('.glb') || name.endsWith('.gltf')) return 'gltfImport';
	return null;
}

function mimeForFile(file: File): string {
	const name = file.name.toLowerCase();
	if (name.endsWith('.svg'))  return 'image/svg+xml';
	if (name.endsWith('.glb'))  return 'model/gltf-binary';
	if (name.endsWith('.gltf')) return 'model/gltf+json';
	return file.type || 'application/octet-stream';
}

/** Chunked to avoid a call-stack overflow from spreading a huge Uint8Array. */
function arrayBufferToBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let binary = '';
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

/**
 * A single self-describing base64 data URI (issue #44) — works uniformly for
 * binary (.glb) and text (SVG) assets, keeps Patch a self-contained JSON file.
 */
export async function fileToDataUri(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	return `data:${mimeForFile(file)};base64,${arrayBufferToBase64(buffer)}`;
}
