import type { StateCreator } from 'zustand';
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react';
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import type { AppState, CustomNode, FlowSlice } from '../../shared/types';
import { nanoid } from 'nanoid';
import { initialNodes } from '../nodes';
import { initialEdges } from '../edges';

export const createFlowSlice: StateCreator<AppState, [], [], FlowSlice> = (
	set,
	get
) => {
	return {
		nodes: initialNodes,
		edges: initialEdges,
		onNodesChange: (changes: NodeChange<CustomNode>[]) => {
			const { removeAudioNode } = get();
			changes.forEach((change) => {
				if (change.type === 'remove') {
					console.log(
						'Node removal detected, cleaning up audio node:',
						change.id
					);
					removeAudioNode(change.id);
				}
			});

			set((state) => ({
				nodes: applyNodeChanges(changes, state.nodes),
			}));
		},
		onEdgesChange: (changes: EdgeChange[]) => {
			const state = get();
			changes.forEach((change) => {
				if (change.type === 'remove') {
					const edgeToRemove = state.edges.find(
						(edge) => edge.id === change.id
					);
					if (edgeToRemove) {
						console.log(
							'Edge removal detected, disconnecting audio nodes:',
							edgeToRemove
						);
						state.disconnect(edgeToRemove);
					}
				}
			});
			set((state) => ({
				edges: applyEdgeChanges(changes, state.edges),
			}));
		},
		onConnect: (connection: Connection) => {
			set((state) => ({
				edges: addEdge(connection, state.edges),
			}));
			get().connect(connection);
		},
		addNode: (type: string, position: { x: number; y: number }) => {
			const newNode: CustomNode = {
				id: nanoid(),
				type,
				position,
				data: { label: `${type} node` },
			};
			set((state) => ({
				nodes: [...state.nodes, newNode],
			}));
			get().addAudioNode(newNode);
		},
		addOscillatorDestinationPair: () => {
			const oscId = nanoid();
			const destId = nanoid();

			// Calculate position based on existing nodes to avoid overlap
			const existingNodes = get().nodes;
			const yOffset = existingNodes.length * 150;

			const oscillatorNode: CustomNode = {
				id: oscId,
				type: 'oscillator',
				position: { x: 100, y: 100 + yOffset },
				data: {
					frequency: 440,
					type: 'sine',
					playing: false,
					label: 'Oscillator',
				},
			};

			const destinationNode: CustomNode = {
				id: destId,
				type: 'destination',
				position: { x: 400, y: 100 + yOffset },
				data: {
					volume: 0.7,
					muted: false,
					label: 'Output',
				},
			};

			const edge = {
				id: `${oscId}->${destId}`,
				source: oscId,
				target: destId,
				animated: true,
			};

			// Add nodes and edge to the flow
			set((state) => ({
				nodes: [...state.nodes, oscillatorNode, destinationNode],
				edges: [...state.edges, edge],
			}));

			// Add audio nodes to registry - ensure this completes
			console.log('Creating audio nodes for pair:', { oscId, destId });
			get().addAudioNode(oscillatorNode);
			get().addAudioNode(destinationNode);

			// Connect the audio nodes immediately, no timeout needed
			get().connect({
				source: oscId,
				target: destId,
				sourceHandle: null,
				targetHandle: null,
			});
		},
		addMultiOscillator: () => {
			const existingNodes = get().nodes;
			const yOffset = existingNodes.length * 150;

			const multiOscNode: CustomNode = {
				id: nanoid(),
				type: 'multioscillator',
				position: { x: 100, y: 100 + yOffset },
				data: {
					oscillators: [
						{ frequency: 220, type: 'sine', playing: false },
						{ frequency: 440, type: 'square', playing: false },
						{ frequency: 880, type: 'sawtooth', playing: false },
					],
					label: 'Multi-Oscillator',
				},
			};

			set((state) => ({
				nodes: [...state.nodes, multiOscNode],
			}));

			get().addAudioNode(multiOscNode);
		},
		addOscilloscope: () => {
			const existingNodes = get().nodes;
			const yOffset = existingNodes.length * 150;

			const scopeNode: CustomNode = {
				id: nanoid(),
				type: 'oscilloscope',
				position: { x: 500, y: 100 + yOffset },
				data: {
					scale: 1.0,
					color: '#00ff41',
					gridVisible: true,
					label: 'Oscilloscope',
				},
			};

			set((state) => ({
				nodes: [...state.nodes, scopeNode],
			}));

			get().addAudioNode(scopeNode);
		},
	};
};
