import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { exportPatch } from './daw';
import type { PatchFile } from './dawTypes';

export type SavedPatch = {
	id:      string;   // String(Date.now()) — unique sort key
	name:    string;
	savedAt: string;   // ISO 8601
	patch:   PatchFile;
};

type PatchLibraryState = {
	patches:        SavedPatch[];
	defaultPatchId: string | null;
	saveError:      string | null;

	savePatch:      (name: string) => string;
	updatePatch:    (id: string) => void;
	deletePatch:    (id: string) => void;
	renamePatch:    (id: string, name: string) => void;
	duplicatePatch: (id: string) => string;
	setDefaultPatch:(id: string | null) => void;
	clearSaveError: () => void;
};

export function fileTimestamp(iso: string): string {
	const d    = new Date(iso);
	const pad  = (n: number) => String(n).padStart(2, '0');
	const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
	const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('-');
	return `${date}_${time}`;
}

export function shortTimestamp(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: 'short', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

export function isValidPatchFile(obj: unknown): obj is PatchFile {
	return (
		typeof obj === 'object' && obj !== null &&
		(obj as PatchFile).version === 1 &&
		Array.isArray((obj as PatchFile).nodes) &&
		Array.isArray((obj as PatchFile).edges)
	);
}

export const usePatchStore = create<PatchLibraryState>()(
	persist(
		(set, get) => ({
			patches:        [],
			defaultPatchId: null,
			saveError:      null,

			savePatch: (name) => {
				const id      = String(Date.now());
				const savedAt = new Date().toISOString();
				const patch   = exportPatch(name);
				const entry: SavedPatch = { id, name, savedAt, patch };
				try {
					set(s => ({ patches: [entry, ...s.patches], saveError: null }));
				} catch {
					set({ saveError: 'Storage full — download a patch to free space.' });
				}
				return id;
			},

			updatePatch: (id) => {
				set(s => {
					const existing = s.patches.find(p => p.id === id);
					if (!existing) return s;
					const savedAt = new Date().toISOString();
					const fresh   = exportPatch(existing.name);
					return {
						patches: s.patches.map(p =>
							p.id === id ? { ...p, savedAt, patch: { ...fresh, name: p.name } } : p,
						),
					};
				});
			},

			deletePatch: (id) => {
				set(s => ({
					patches:        s.patches.filter(p => p.id !== id),
					defaultPatchId: s.defaultPatchId === id ? null : s.defaultPatchId,
				}));
			},

			renamePatch: (id, name) => {
				set(s => ({
					patches: s.patches.map(p =>
						p.id === id ? { ...p, name, patch: { ...p.patch, name } } : p,
					),
				}));
			},

			duplicatePatch: (id) => {
				const original = get().patches.find(p => p.id === id);
				if (!original) return '';
				const newId    = String(Date.now());
				const savedAt  = new Date().toISOString();
				const name     = `${original.name} (copy)`;
				const copy: SavedPatch = {
					id:      newId,
					name,
					savedAt,
					patch:   { ...original.patch, name, savedAt },
				};
				set(s => ({ patches: [copy, ...s.patches] }));
				return newId;
			},

			setDefaultPatch: (id) => set({ defaultPatchId: id }),

			clearSaveError: () => set({ saveError: null }),
		}),
		{
			name:       'reactoscope.patches',
			partialize: (s) => ({
				patches:        s.patches,
				defaultPatchId: s.defaultPatchId,
			}),
		},
	),
);
