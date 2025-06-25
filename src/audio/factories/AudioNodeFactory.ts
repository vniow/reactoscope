import * as Tone from 'tone';
import type { CustomNode } from '../../shared/types';

/**
 * Base interface for all audio node creators
 * Following the Factory Pattern to encapsulate node creation logic
 */
export interface AudioNodeCreator {
	/**
	 * Creates an audio node of a specific type
	 * @param node - The CustomNode containing configuration data
	 * @returns Promise resolving to the created Tone.js audio node or undefined
	 */
	create(node: CustomNode): Promise<Tone.ToneAudioNode | undefined>;

	/**
	 * Optional cleanup method for specific node types
	 * @param nodeId - The ID of the node to clean up
	 */
	cleanup?(nodeId: string): void;
}

/**
 * Registry to store all available audio node creators
 * Following the Registry Pattern for dynamic node type management
 */
class AudioNodeFactoryRegistry {
	private creators = new Map<string, AudioNodeCreator>();

	/**
	 * Register a new audio node creator for a specific type
	 */
	register(nodeType: string, creator: AudioNodeCreator): void {
		this.creators.set(nodeType, creator);
		console.log(`✓ Registered audio node creator for type: ${nodeType}`);
	}

	/**
	 * Get a creator for a specific node type
	 */
	getCreator(nodeType: string): AudioNodeCreator | undefined {
		return this.creators.get(nodeType);
	}

	/**
	 * Check if a node type is supported
	 */
	isSupported(nodeType: string): boolean {
		return this.creators.has(nodeType);
	}

	/**
	 * Get all registered node types
	 */
	getSupportedTypes(): string[] {
		return Array.from(this.creators.keys());
	}
}

// Singleton instance following the Singleton Pattern
export const audioNodeFactory = new AudioNodeFactoryRegistry();

/**
 * Main factory function to create audio nodes
 * Following the Factory Pattern with error handling
 */
export async function createAudioNode(
	node: CustomNode
): Promise<Tone.ToneAudioNode | undefined> {
	if (!node.type) {
		console.warn('Node type is undefined');
		return undefined;
	}

	const creator = audioNodeFactory.getCreator(node.type);

	if (!creator) {
		console.warn(`No creator found for node type: ${node.type}`);
		return undefined;
	}

	try {
		console.log(`Creating audio node: ${node.type} (${node.id})`);
		const audioNode = await creator.create(node);

		if (audioNode) {
			console.log(`✓ Created ${node.type}:`, audioNode.constructor.name);
		}

		return audioNode;
	} catch (error) {
		console.error(`Failed to create audio node ${node.type}:`, error);
		return undefined;
	}
}
