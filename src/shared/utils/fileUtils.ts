/**
 * File handling utilities for GridFileInput component
 */

export interface FileTypeInfo {
	category: 'audio' | 'image' | 'video' | 'text' | 'data' | 'unknown';
	icon: string;
	color: string;
	description: string;
}

export interface FileValidator {
	name: string;
	validate: (file: File) => Promise<boolean> | boolean;
	errorMessage: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

// File type definitions with icons and colors
export const FILE_TYPES: Record<string, FileTypeInfo> = {
	// Audio files
	'audio/mpeg': {
		category: 'audio',
		icon: '🎵',
		color: 'purple',
		description: 'MP3 Audio',
	},
	'audio/wav': {
		category: 'audio',
		icon: '🎵',
		color: 'purple',
		description: 'WAV Audio',
	},
	'audio/flac': {
		category: 'audio',
		icon: '🎵',
		color: 'purple',
		description: 'FLAC Audio',
	},
	'audio/ogg': {
		category: 'audio',
		icon: '🎵',
		color: 'purple',
		description: 'OGG Audio',
	},
	'audio/mp4': {
		category: 'audio',
		icon: '🎵',
		color: 'purple',
		description: 'M4A Audio',
	},

	// Image files
	'image/jpeg': {
		category: 'image',
		icon: '🖼️',
		color: 'blue',
		description: 'JPEG Image',
	},
	'image/png': {
		category: 'image',
		icon: '🖼️',
		color: 'blue',
		description: 'PNG Image',
	},
	'image/gif': {
		category: 'image',
		icon: '🖼️',
		color: 'blue',
		description: 'GIF Image',
	},
	'image/svg+xml': {
		category: 'image',
		icon: '🖼️',
		color: 'blue',
		description: 'SVG Image',
	},
	'image/webp': {
		category: 'image',
		icon: '🖼️',
		color: 'blue',
		description: 'WebP Image',
	},

	// Video files
	'video/mp4': {
		category: 'video',
		icon: '🎬',
		color: 'red',
		description: 'MP4 Video',
	},
	'video/webm': {
		category: 'video',
		icon: '🎬',
		color: 'red',
		description: 'WebM Video',
	},
	'video/quicktime': {
		category: 'video',
		icon: '🎬',
		color: 'red',
		description: 'MOV Video',
	},

	// Text/Data files
	'text/plain': {
		category: 'text',
		icon: '📄',
		color: 'gray',
		description: 'Text File',
	},
	'application/json': {
		category: 'data',
		icon: '📊',
		color: 'green',
		description: 'JSON Data',
	},
	'text/csv': {
		category: 'data',
		icon: '📊',
		color: 'green',
		description: 'CSV Data',
	},
	'text/markdown': {
		category: 'text',
		icon: '📝',
		color: 'gray',
		description: 'Markdown',
	},
};

// Default file type info for unknown types
const DEFAULT_FILE_TYPE: FileTypeInfo = {
	category: 'unknown',
	icon: '📁',
	color: 'gray',
	description: 'Unknown File Type',
};

/**
 * Get file type information based on MIME type and extension
 */
export function getFileType(file: File): FileTypeInfo {
	// First try to match by MIME type
	if (file.type && FILE_TYPES[file.type]) {
		return FILE_TYPES[file.type];
	}

	// Fallback to extension matching
	const extension = getFileExtension(file.name).toLowerCase();
	const typeByExtension = Object.entries(FILE_TYPES).find(([, info]) => {
		const category = info.category;
		const commonExtensions: Record<string, string[]> = {
			audio: ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'],
			image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'],
			video: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
			text: ['.txt', '.md', '.rtf'],
			data: ['.json', '.csv', '.xml', '.yaml', '.yml'],
		};

		return commonExtensions[category]?.includes(extension);
	});

	return typeByExtension ? typeByExtension[1] : DEFAULT_FILE_TYPE;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * Validate a file against multiple validators
 */
export async function validateFile(
	file: File,
	validators: FileValidator[]
): Promise<ValidationResult> {
	const errors: string[] = [];

	for (const validator of validators) {
		try {
			const isValid = await validator.validate(file);
			if (!isValid) {
				errors.push(validator.errorMessage);
			}
		} catch {
			errors.push(`Validation error: ${validator.name}`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Built-in validator creators
 */
export const createSizeValidator = (maxBytes: number): FileValidator => ({
	name: 'size',
	validate: (file) => file.size <= maxBytes,
	errorMessage: `File must be smaller than ${formatFileSize(maxBytes)}`,
});

export const createTypeValidator = (allowedTypes: string[]): FileValidator => ({
	name: 'type',
	validate: (file) => {
		// Check MIME type
		if (
			allowedTypes.some((type) => {
				if (type.includes('*')) {
					// Handle wildcard types like 'audio/*'
					const baseType = type.split('/')[0];
					return file.type.startsWith(baseType + '/');
				}
				return file.type === type;
			})
		) {
			return true;
		}

		// Check file extension
		const extension = getFileExtension(file.name).toLowerCase();
		return allowedTypes.some((type) => {
			if (type.startsWith('.')) {
				return extension === type.substring(1);
			}
			return false;
		});
	},
	errorMessage: `File type not supported. Allowed: ${allowedTypes.join(', ')}`,
});

export const createMinSizeValidator = (minBytes: number): FileValidator => ({
	name: 'minSize',
	validate: (file) => file.size >= minBytes,
	errorMessage: `File must be larger than ${formatFileSize(minBytes)}`,
});

export const createNameValidator = (pattern: RegExp): FileValidator => ({
	name: 'filename',
	validate: (file) => pattern.test(file.name),
	errorMessage: 'Filename does not match required pattern',
});

/**
 * Create a preview URL for supported file types
 */
export function createFilePreview(file: File): Promise<string | null> {
	return new Promise((resolve) => {
		const fileType = getFileType(file);

		if (fileType.category === 'image') {
			const reader = new FileReader();
			reader.onload = (e) => resolve((e.target?.result as string) || null);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(file);
		} else {
			// For non-image files, return null (no preview)
			resolve(null);
		}
	});
}

/**
 * Check if browser supports drag and drop
 */
export function isDragAndDropSupported(): boolean {
	const div = document.createElement('div');
	return (
		('draggable' in div || ('ondragstart' in div && 'ondrop' in div)) &&
		'FormData' in window &&
		'FileReader' in window
	);
}
