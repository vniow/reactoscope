import type { Node, Edge, BuiltInNode } from '@xyflow/react';
import type { Player, Gain, Split, Analyser } from 'tone';

// ─── React Flow node data ─────────────────────────────────────────────────────

export type PlayerNodeData = {
	trackUrl: string;
	label: string;
};

export type MasterOutputNodeData = {
	label: string;
};

// ─── React Flow typed node union ──────────────────────────────────────────────

export type PlayerFlowNode      = Node<PlayerNodeData,      'player'>;
export type MasterOutputFlowNode = Node<MasterOutputNodeData, 'masterOutput'>;
export type AppNode              = BuiltInNode | PlayerFlowNode | MasterOutputFlowNode;
export type AppEdge              = Edge;

// ─── Audio node registry entries ─────────────────────────────────────────────

export type PlayerAudioEntry = {
	kind:           'player';
	toneNode:       Player;
	startOffset:    number;   // track position (s) at the last play() or seek()
	currentRate:    number;   // mirrors toneNode.playbackRate
	isExplicitStop: boolean;  // true when stop/pause/seek initiated the onstop
	isPlaying:      boolean;
	playbackEndCb:  (() => void) | null;
};

export type MasterOutputAudioEntry = {
	kind:          'masterOutput';
	inputGain:     Gain;      // all sources connect here
	split:         Split;     // separates L/R for the oscilloscope
	leftAnalyser:  Analyser;  // X axis
	rightAnalyser: Analyser;  // Y axis
};

export type AudioNodeEntry = PlayerAudioEntry | MasterOutputAudioEntry;
export type AudioNodeMap   = Map<string, AudioNodeEntry>;
