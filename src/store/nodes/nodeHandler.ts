// ─── NodeTypeHandler protocol ─────────────────────────────────────────────────
// Each audio node type implements this interface and registers itself in
// nodeRegistry. The Zustand store dispatches through the registry so node
// components only ever interact with the store, never with audio internals.
//
// start() returns true if it recreated the Tone.js node (single-use sources
// only). The store coordinator calls reconnectSourceEdges() when true is returned.
//
// defaultData is used by addNode() to build the initial Zustand node state
// without any per-type logic in the store.

export interface NodeTypeHandler<D = unknown> {
	defaultData: D;
	create(id: string, data: D): void;
	dispose(id: string): void;
	setAudioParam(id: string, update: Partial<D>): void;
	start?(id: string): Promise<boolean>;
	stop?(id: string): void;
}
