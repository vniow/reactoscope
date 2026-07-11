import { useDawStore, MASTER_NODE_ID } from '../store/daw';

// Deterministic oscillator -> master output graph for the memory-leak
// harness (scripts/memory-leak-harness). Fresh Playwright profiles have no
// localStorage, so there's no saved default patch to load — this builds one
// programmatically instead of hand-writing a PatchFile literal.
export function loadLeakTestFixture(): void {
	const { addNode, onConnect } = useDawStore.getState();
	const oscId = addNode('oscillator', { x: 100, y: 100 });
	onConnect({
		source:       oscId,
		sourceHandle: 'out-0',
		target:       MASTER_NODE_ID,
		targetHandle: 'in-0',
	});
}
