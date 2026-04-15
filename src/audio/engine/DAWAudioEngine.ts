import type { Connection, Edge } from '@xyflow/react';
import * as Tone from 'tone';

/**
 * Enhanced audio connection interface for DAW-style routing
 */
export interface AudioConnection {
	readonly id: string;
	readonly sourceNodeId: string;
	readonly targetNodeId: string;
	readonly sourceHandle: string;
	readonly targetHandle: string;
	readonly channelMapping: ChannelMapping;
	readonly gainLevel: number;
	readonly muted: boolean;
	readonly status: 'connected' | 'disconnected' | 'error' | 'pending';
	readonly createdAt: number;
	readonly lastError?: string;
}

/**
 * Channel mapping for multi-channel routing
 */
export interface ChannelMapping {
	[sourceChannel: number]: {
		targetChannel: number;
		gain: number;
		enabled: boolean;
	}[];
}

/**
 * Audio bus configuration for DAW-style mixing
 */
export interface AudioBus {
	readonly id: string;
	readonly name: string;
	readonly type: 'master' | 'group' | 'aux' | 'send';
	readonly channels: number;
	readonly volume: number;
	readonly muted: boolean;
	readonly solo: boolean;
	readonly effectChain: EffectSlot[];
	readonly color?: string;
}

/**
 * Effect slot in a signal chain
 */
export interface EffectSlot {
	readonly id: string;
	readonly effectType: string;
	readonly enabled: boolean;
	readonly wetDryMix: number;
	readonly parameters: Record<string, unknown>;
	readonly bypassable: boolean;
}

/**
 * Node signal chain configuration
 */
export interface SignalChain {
	readonly nodeId: string;
	readonly inputGain: number;
	readonly outputGain: number;
	readonly effectSlots: EffectSlot[];
	readonly sends: SendConfiguration[];
	readonly muted: boolean;
	readonly solo: boolean;
	readonly bypassEffects: boolean;
}

/**
 * Send configuration for aux/effect sends
 */
export interface SendConfiguration {
	readonly id: string;
	readonly busId: string;
	readonly sendLevel: number;
	readonly preFader: boolean;
	readonly enabled: boolean;
}

/**
 * Transport state for DAW-style playback control
 */
export interface TransportState {
	readonly isPlaying: boolean;
	readonly isRecording: boolean;
	readonly bpm: number;
	readonly timeSignature: [number, number];
	readonly position: TransportPosition;
	readonly loopStart?: number;
	readonly loopEnd?: number;
	readonly isLooping: boolean;
	readonly metronomeEnabled: boolean;
	readonly countInBars: number;
}

/**
 * Transport position information
 */
export interface TransportPosition {
	readonly bars: number;
	readonly beats: number;
	readonly sixteenths: number;
	readonly samples: number;
	readonly seconds: number;
}

/**
 * Efficient connection registry for fast lookups
 */
export class ConnectionRegistry {
	private connections = new Map<string, AudioConnection>();
	private nodeInputs = new Map<string, Set<string>>();
	private nodeOutputs = new Map<string, Set<string>>();
	private busConnections = new Map<string, Set<string>>();

	addConnection(connection: AudioConnection): void {
		this.connections.set(connection.id, connection);
		this.updateNodeMappings(connection);
	}

	removeConnection(connectionId: string): boolean {
		const connection = this.connections.get(connectionId);
		if (!connection) return false;

		this.connections.delete(connectionId);
		this.removeFromNodeMappings(connection);
		return true;
	}

	getConnection(connectionId: string): AudioConnection | undefined {
		return this.connections.get(connectionId);
	}

	getNodeInputs(nodeId: string): AudioConnection[] {
		const connectionIds = this.nodeInputs.get(nodeId) || new Set();
		return Array.from(connectionIds)
			.map((id) => this.connections.get(id))
			.filter((conn): conn is AudioConnection => conn !== undefined);
	}

	getNodeOutputs(nodeId: string): AudioConnection[] {
		const connectionIds = this.nodeOutputs.get(nodeId) || new Set();
		return Array.from(connectionIds)
			.map((id) => this.connections.get(id))
			.filter((conn): conn is AudioConnection => conn !== undefined);
	}

	getBusConnections(busId: string): AudioConnection[] {
		const connectionIds = this.busConnections.get(busId) || new Set();
		return Array.from(connectionIds)
			.map((id) => this.connections.get(id))
			.filter((conn): conn is AudioConnection => conn !== undefined);
	}

	getAllConnections(): AudioConnection[] {
		return Array.from(this.connections.values());
	}

	getSignalPath(nodeId: string): SignalPath {
		const inputs = this.getNodeInputs(nodeId);
		const outputs = this.getNodeOutputs(nodeId);

		return {
			nodeId,
			inputs,
			outputs,
			depth: this.calculateSignalDepth(nodeId),
		};
	}

	private updateNodeMappings(connection: AudioConnection): void {
		// Update input mappings
		if (!this.nodeInputs.has(connection.targetNodeId)) {
			this.nodeInputs.set(connection.targetNodeId, new Set());
		}
		this.nodeInputs.get(connection.targetNodeId)!.add(connection.id);

		// Update output mappings
		if (!this.nodeOutputs.has(connection.sourceNodeId)) {
			this.nodeOutputs.set(connection.sourceNodeId, new Set());
		}
		this.nodeOutputs.get(connection.sourceNodeId)!.add(connection.id);
	}

	private removeFromNodeMappings(connection: AudioConnection): void {
		this.nodeInputs.get(connection.targetNodeId)?.delete(connection.id);
		this.nodeOutputs.get(connection.sourceNodeId)?.delete(connection.id);
	}

	private calculateSignalDepth(
		nodeId: string,
		visited = new Set<string>()
	): number {
		if (visited.has(nodeId)) return 0; // Prevent infinite loops
		visited.add(nodeId);

		const inputs = this.getNodeInputs(nodeId);
		if (inputs.length === 0) return 0;

		const maxDepth = Math.max(
			...inputs.map((conn) =>
				this.calculateSignalDepth(conn.sourceNodeId, new Set(visited))
			)
		);

		return maxDepth + 1;
	}
}

/**
 * Signal path information for a node
 */
export interface SignalPath {
	readonly nodeId: string;
	readonly inputs: AudioConnection[];
	readonly outputs: AudioConnection[];
	readonly depth: number;
}

/**
 * Bus manager for DAW-style mixing
 */
export class BusManager {
	private buses = new Map<string, AudioBus>();
	private busInstances = new Map<string, Tone.Channel>();

	addBus(bus: AudioBus): void {
		this.buses.set(bus.id, bus);
		this.createBusInstance(bus);
	}

	removeBus(busId: string): boolean {
		const bus = this.buses.get(busId);
		if (!bus) return false;

		this.disposeBusInstance(busId);
		this.buses.delete(busId);
		return true;
	}

	getBus(busId: string): AudioBus | undefined {
		return this.buses.get(busId);
	}

	getBusInstance(busId: string): Tone.Channel | undefined {
		return this.busInstances.get(busId);
	}

	getAllBuses(): AudioBus[] {
		return Array.from(this.buses.values());
	}

	updateBusVolume(busId: string, volume: number): void {
		const busInstance = this.busInstances.get(busId);
		if (busInstance) {
			busInstance.volume.value = Tone.gainToDb(volume);
		}
	}

	updateBusMute(busId: string, muted: boolean): void {
		const busInstance = this.busInstances.get(busId);
		if (busInstance) {
			busInstance.mute = muted;
		}
	}

	private createBusInstance(bus: AudioBus): void {
		const busInstance = new Tone.Channel({
			volume: Tone.gainToDb(bus.volume),
			mute: bus.muted,
			channelCount: bus.channels,
		});

		// Connect to master if it's not the master bus
		if (bus.type !== 'master') {
			const masterBus = this.getMasterBus();
			if (masterBus) {
				busInstance.connect(masterBus);
			} else {
				busInstance.toDestination();
			}
		} else {
			busInstance.toDestination();
		}

		this.busInstances.set(bus.id, busInstance);
	}

	private disposeBusInstance(busId: string): void {
		const busInstance = this.busInstances.get(busId);
		if (busInstance) {
			busInstance.dispose();
			this.busInstances.delete(busId);
		}
	}

	private getMasterBus(): Tone.Channel | undefined {
		const masterBus = Array.from(this.buses.values()).find(
			(bus) => bus.type === 'master'
		);
		return masterBus ? this.busInstances.get(masterBus.id) : undefined;
	}
}

/**
 * Enhanced audio engine with DAW-style features
 */
export class DAWAudioEngine {
	private connectionRegistry = new ConnectionRegistry();
	private busManager = new BusManager();
	private audioNodeRegistry = new Map<string, Tone.ToneAudioNode>();
	private signalChains = new Map<string, SignalChain>();
	private transport: TransportState;

	constructor() {
		this.transport = this.createInitialTransportState();
		this.initializeDefaultBuses();
	}

	// Connection Management
	async connect(connection: AudioConnection): Promise<void> {
		try {
			const sourceNode = this.audioNodeRegistry.get(connection.sourceNodeId);
			const targetNode = this.audioNodeRegistry.get(connection.targetNodeId);

			if (!sourceNode || !targetNode) {
				throw new Error('Source or target node not found');
			}

			// Apply channel mapping
			await this.establishAudioConnection(sourceNode, targetNode, connection);

			// Update registry
			this.connectionRegistry.addConnection({
				...connection,
				status: 'connected',
			});
		} catch (error) {
			this.connectionRegistry.addConnection({
				...connection,
				status: 'error',
				lastError: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	disconnect(connectionId: string): void {
		const connection = this.connectionRegistry.getConnection(connectionId);
		if (!connection) return;

		const sourceNode = this.audioNodeRegistry.get(connection.sourceNodeId);
		const targetNode = this.audioNodeRegistry.get(connection.targetNodeId);

		if (sourceNode && targetNode) {
			try {
				sourceNode.disconnect(targetNode);
			} catch (error) {
				console.warn('Failed to disconnect audio nodes:', error);
			}
		}

		this.connectionRegistry.removeConnection(connectionId);
	}

	// Node Management
	addAudioNode(nodeId: string, audioNode: Tone.ToneAudioNode): void {
		this.audioNodeRegistry.set(nodeId, audioNode);
		this.signalChains.set(nodeId, this.createDefaultSignalChain(nodeId));
	}

	removeAudioNode(nodeId: string): void {
		// Remove all connections involving this node
		const inputs = this.connectionRegistry.getNodeInputs(nodeId);
		const outputs = this.connectionRegistry.getNodeOutputs(nodeId);

		[...inputs, ...outputs].forEach((conn) => {
			this.disconnect(conn.id);
		});

		// Dispose audio node
		const audioNode = this.audioNodeRegistry.get(nodeId);
		if (audioNode) {
			audioNode.dispose();
			this.audioNodeRegistry.delete(nodeId);
		}

		// Remove signal chain
		this.signalChains.delete(nodeId);
	}

	getAudioNode(nodeId: string): Tone.ToneAudioNode | undefined {
		return this.audioNodeRegistry.get(nodeId);
	}

	// Signal Chain Management
	getSignalChain(nodeId: string): SignalChain | undefined {
		return this.signalChains.get(nodeId);
	}

	updateSignalChain(nodeId: string, updates: Partial<SignalChain>): void {
		const current = this.signalChains.get(nodeId);
		if (current) {
			this.signalChains.set(nodeId, { ...current, ...updates });
		}
	}

	// Bus Management
	addBus(bus: AudioBus): void {
		this.busManager.addBus(bus);
	}

	removeBus(busId: string): void {
		this.busManager.removeBus(busId);
	}

	getBus(busId: string): AudioBus | undefined {
		return this.busManager.getBus(busId);
	}

	// Transport Control
	getTransport(): TransportState {
		return this.transport;
	}

	play(): void {
		if (!this.transport.isPlaying) {
			Tone.Transport.start();
			this.transport = { ...this.transport, isPlaying: true };
		}
	}

	stop(): void {
		if (this.transport.isPlaying) {
			Tone.Transport.stop();
			this.transport = { ...this.transport, isPlaying: false };
		}
	}

	setBPM(bpm: number): void {
		Tone.Transport.bpm.value = bpm;
		this.transport = { ...this.transport, bpm };
	}

	// Utility Methods
	getSignalPath(nodeId: string): SignalPath {
		return this.connectionRegistry.getSignalPath(nodeId);
	}

	getAllConnections(): AudioConnection[] {
		return this.connectionRegistry.getAllConnections();
	}

	createConnectionId(
		sourceId: string,
		sourceHandle: string,
		targetId: string,
		targetHandle: string
	): string {
		return `${sourceId}_${sourceHandle}-${targetId}_${targetHandle}`;
	}

	// Private Methods
	private async establishAudioConnection(
		sourceNode: Tone.ToneAudioNode,
		targetNode: Tone.ToneAudioNode,
		connection: AudioConnection
	): Promise<void> {
		// Handle multi-channel routing based on channel mapping
		Object.entries(connection.channelMapping).forEach(
			([sourceChannel, mappings]) => {
				mappings.forEach(
					(mapping: {
						targetChannel: number;
						gain: number;
						enabled: boolean;
					}) => {
						if (mapping.enabled) {
							// Create gain node for per-channel gain control
							const gainNode = new Tone.Gain(mapping.gain);

							// Connect: source -> gain -> target
							// Note: sourceChannel could be used for channel-specific routing
							// This is a simplified implementation - full implementation would handle
							// channel extraction and routing more sophisticatedly
							console.log(
								`Routing channel ${sourceChannel} to target channel ${mapping.targetChannel}`
							);
							sourceNode.connect(gainNode);
							gainNode.connect(targetNode);
						}
					}
				);
			}
		);
	}

	private createDefaultSignalChain(nodeId: string): SignalChain {
		return {
			nodeId,
			inputGain: 1.0,
			outputGain: 1.0,
			effectSlots: [],
			sends: [],
			muted: false,
			solo: false,
			bypassEffects: false,
		};
	}

	private createInitialTransportState(): TransportState {
		return {
			isPlaying: false,
			isRecording: false,
			bpm: 120,
			timeSignature: [4, 4],
			position: {
				bars: 0,
				beats: 0,
				sixteenths: 0,
				samples: 0,
				seconds: 0,
			},
			isLooping: false,
			metronomeEnabled: false,
			countInBars: 0,
		};
	}

	private initializeDefaultBuses(): void {
		// Create master bus
		const masterBus: AudioBus = {
			id: 'master',
			name: 'Master',
			type: 'master',
			channels: 2,
			volume: 0.8,
			muted: false,
			solo: false,
			effectChain: [],
			color: '#ff6b6b',
		};

		this.addBus(masterBus);
	}
}

/**
 * Factory function to create connection from React Flow edge
 */
export function createConnectionFromEdge(edge: Edge): AudioConnection {
	return {
		id: `${edge.source}_${edge.sourceHandle || 'audio-out'}-${edge.target}_${edge.targetHandle || 'audio-in'}`,
		sourceNodeId: edge.source,
		targetNodeId: edge.target,
		sourceHandle: edge.sourceHandle || 'audio-out',
		targetHandle: edge.targetHandle || 'audio-in',
		channelMapping: {
			0: [{ targetChannel: 0, gain: 1.0, enabled: true }],
		},
		gainLevel: 1.0,
		muted: false,
		status: 'pending',
		createdAt: Date.now(),
	};
}

/**
 * Factory function to create React Flow connection from audio connection
 */
export function createEdgeFromConnection(
	connection: AudioConnection
): Connection {
	return {
		source: connection.sourceNodeId,
		target: connection.targetNodeId,
		sourceHandle: connection.sourceHandle,
		targetHandle: connection.targetHandle,
	};
}
