import { useCallback, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LayersIcon       from '@mui/icons-material/Layers';
import AddIcon          from '@mui/icons-material/Add';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import SyncIcon         from '@mui/icons-material/Sync';
import ContentCopyIcon  from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon       from '@mui/icons-material/Delete';
import FolderOpenIcon   from '@mui/icons-material/FolderOpen';
import StarIcon         from '@mui/icons-material/Star';
import StarBorderIcon   from '@mui/icons-material/StarBorder';
import { useDawStore, downloadPatch }             from '../store/daw';
import { usePatchStore, isValidPatchFile, fileTimestamp, shortTimestamp } from '../store/patchStore';
import { METAL_BG }      from './nodes/metalBackground';
import { HW_INSET, hwIconBtn, hwIconBtnLit } from './nodes/hwStyles';
import { NODE_COLORS }   from './nodes/nodeColors';
import type { SavedPatch } from '../store/patchStore';

const COLOR = NODE_COLORS.scene;

// ─── PatchRow ─────────────────────────────────────────────────────────────────

type PatchRowProps = {
	saved:          SavedPatch;
	isDefault:      boolean;
	onLoad:         (saved: SavedPatch) => void;
	onUpdate:       (id: string) => void;
	onDuplicate:    (id: string) => void;
	onDownload:     (saved: SavedPatch) => void;
	onDelete:       (id: string) => void;
	onToggleDefault:(id: string) => void;
};

function PatchRow({ saved, isDefault, onLoad, onUpdate, onDuplicate, onDownload, onDelete, onToggleDefault }: PatchRowProps) {
	const renamePatch = usePatchStore(s => s.renamePatch);
	const [renaming, setRenaming]           = useState(false);
	const [renameVal, setRenameVal]         = useState(saved.name);
	const [deleteArmed, setDeleteArmed]     = useState(false);

	const commitRename = useCallback(() => {
		const trimmed = renameVal.trim();
		if (trimmed && trimmed !== saved.name) renamePatch(saved.id, trimmed);
		else setRenameVal(saved.name);
		setRenaming(false);
	}, [renameVal, saved.id, saved.name, renamePatch]);

	const handleDeleteClick = useCallback(() => {
		if (deleteArmed) {
			onDelete(saved.id);
		} else {
			setDeleteArmed(true);
		}
	}, [deleteArmed, onDelete, saved.id]);

	const tinySx = { fontSize: 10 };
	const actionBtn = (lit: boolean) => ({ ...(lit ? hwIconBtnLit(COLOR) : hwIconBtn(COLOR)), p: 0.35 });

	return (
		<Box sx={{
			borderBottom: `1px solid ${COLOR}18`,
			py: 0.75, px: 0.5,
			'&:last-of-type': { borderBottom: 'none' },
		}}>
			{/* Line 1: star + name + timestamp */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
				<Tooltip title={isDefault ? 'Clear default' : 'Set as default (loads on startup)'} placement='right'>
					<IconButton size='small' onClick={() => onToggleDefault(saved.id)}
						sx={actionBtn(isDefault)}>
						{isDefault
							? <StarIcon       sx={{ ...tinySx, color: COLOR }} />
							: <StarBorderIcon sx={tinySx} />
						}
					</IconButton>
				</Tooltip>

				<Box sx={{ flex: 1, minWidth: 0 }}>
					{renaming ? (
						<InputBase
							autoFocus
							value={renameVal}
							onChange={e => setRenameVal(e.target.value)}
							onBlur={commitRename}
							onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenameVal(saved.name); setRenaming(false); } }}
							sx={{
								...HW_INSET, px: 0.5, py: 0.1, width: '100%',
								fontSize: 10, color: 'text.primary',
								'& .MuiInputBase-input': { p: 0 },
							}}
						/>
					) : (
						<Tooltip title='Click to rename' placement='top'>
							<Typography
								onClick={() => { setRenameVal(saved.name); setRenaming(true); }}
								sx={{
									fontSize: 10, color: 'text.primary', cursor: 'text',
									overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
									'&:hover': { color: COLOR },
								}}
							>
								{saved.name}
							</Typography>
						</Tooltip>
					)}
				</Box>

				<Typography sx={{ fontSize: 9, color: 'text.disabled', flexShrink: 0, ml: 0.5 }}>
					{shortTimestamp(saved.savedAt)}
				</Typography>
			</Box>

			{/* Line 2: action buttons */}
			<Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, pl: 3 }}>
				<Tooltip title='Load — replaces current session' placement='top'>
					<IconButton size='small' onClick={() => onLoad(saved)} sx={actionBtn(false)}>
						<PlayArrowIcon sx={tinySx} />
					</IconButton>
				</Tooltip>
				<Tooltip title='Replace with current session' placement='top'>
					<IconButton size='small' onClick={() => onUpdate(saved.id)} sx={actionBtn(false)}>
						<SyncIcon sx={tinySx} />
					</IconButton>
				</Tooltip>
				<Tooltip title='Duplicate' placement='top'>
					<IconButton size='small' onClick={() => onDuplicate(saved.id)} sx={actionBtn(false)}>
						<ContentCopyIcon sx={tinySx} />
					</IconButton>
				</Tooltip>
				<Tooltip title='Download' placement='top'>
					<IconButton size='small' onClick={() => onDownload(saved)} sx={actionBtn(false)}>
						<FileDownloadIcon sx={tinySx} />
					</IconButton>
				</Tooltip>
				<Tooltip title={deleteArmed ? 'Click again to confirm' : 'Delete'} placement='top'>
					<IconButton size='small'
						onClick={handleDeleteClick}
						onBlur={() => setDeleteArmed(false)}
						sx={{
							...actionBtn(false),
							...(deleteArmed ? {
								border: '1px solid #cc3333',
								color: '#cc3333',
								'&:hover': { background: '#cc333322', color: '#ff5555' },
							} : {}),
						}}>
						<DeleteIcon sx={tinySx} />
					</IconButton>
				</Tooltip>
			</Box>
		</Box>
	);
}

// ─── PatchPanel ───────────────────────────────────────────────────────────────

export function PatchPanel({ columnsSwapped }: { columnsSwapped: boolean }) {
	const loadPatch     = useDawStore(s => s.loadPatch);
	const {
		patches, defaultPatchId,
		savePatch, updatePatch, deletePatch, duplicatePatch, setDefaultPatch, saveError, clearSaveError,
	} = usePatchStore();

	const [open, setOpen]         = useState(false);
	const [saveName, setSaveName] = useState('');
	const [isDragOver, setDragOver] = useState(false);
	const [statusMsg, setStatusMsg] = useState<string | null>(null);

	const containerRef  = useRef<HTMLDivElement>(null);
	const fileInputRef  = useRef<HTMLInputElement>(null);
	const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useClickOutside(containerRef, () => setOpen(false), open);

	const flash = useCallback((msg: string) => {
		setStatusMsg(msg);
		if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
		statusTimerRef.current = setTimeout(() => setStatusMsg(null), 2500);
	}, []);

	useEffect(() => () => {
		if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
	}, []);

	// ── Save current state ───────────────────────────────────────────────────

	const handleSave = useCallback(() => {
		const name = saveName.trim() || 'Untitled';
		savePatch(name);
		setSaveName('');
		flash(`Saved "${name}"`);
	}, [saveName, savePatch, flash]);

	// ── Per-row actions ──────────────────────────────────────────────────────

	const handleLoad = useCallback((saved: SavedPatch) => {
		loadPatch(saved.patch);
		flash(`Loaded "${saved.name}"`);
	}, [loadPatch, flash]);

	const handleDownload = useCallback((saved: SavedPatch) => {
		const ts   = fileTimestamp(saved.savedAt);
		const slug = saved.name.replace(/[^a-z0-9]/gi, '_') || 'patch';
		downloadPatch({ ...saved.patch, name: saved.name }, `${slug}_${ts}`);
	}, []);

	const handleUpdate = useCallback((id: string) => {
		updatePatch(id);
		const name = patches.find(p => p.id === id)?.name ?? 'patch';
		flash(`Updated "${name}"`);
	}, [updatePatch, patches, flash]);

	const handleDelete = useCallback((id: string) => {
		deletePatch(id);
	}, [deletePatch]);

	const handleDuplicate = useCallback((id: string) => {
		duplicatePatch(id);
	}, [duplicatePatch]);

	const handleToggleDefault = useCallback((id: string) => {
		setDefaultPatch(defaultPatchId === id ? null : id);
	}, [defaultPatchId, setDefaultPatch]);

	// ── Drag-and-drop ────────────────────────────────────────────────────────

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		// Only clear if leaving the panel entirely (not moving between children)
		if (!containerRef.current?.contains(e.relatedTarget as Node)) {
			setDragOver(false);
		}
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const obj = JSON.parse(evt.target?.result as string);
				if (!isValidPatchFile(obj)) { flash('Invalid patch file'); return; }
				loadPatch(obj);
				const nameFromFile = file.name.replace(/\.reactoscope\.json$/i, '').replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/, '').replace(/_/g, ' ').trim();
				savePatch(obj.name || nameFromFile || 'Imported patch');
				flash('Loaded from file');
			} catch { flash('Failed to parse file'); }
		};
		reader.readAsText(file);
	}, [loadPatch, savePatch, flash]);

	// ── File picker ──────────────────────────────────────────────────────────

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const obj = JSON.parse(evt.target?.result as string);
				if (!isValidPatchFile(obj)) { flash('Invalid patch file'); return; }
				loadPatch(obj);
				const nameFromFile = file.name.replace(/\.reactoscope\.json$/i, '').replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/, '').replace(/_/g, ' ').trim();
				savePatch(obj.name || nameFromFile || 'Imported patch');
				flash('Loaded from file');
			} catch { flash('Failed to parse file'); }
		};
		reader.readAsText(file);
		e.target.value = '';
	}, [loadPatch, savePatch, flash]);

	// ── Render ───────────────────────────────────────────────────────────────

	const btnSx = { ...hwIconBtn(COLOR), p: 0.5 };

	// Sort most-recently saved first
	const sorted = [...patches].sort((a, b) => Number(b.id) - Number(a.id));

	const isDefaultSet = defaultPatchId !== null;

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			<input ref={fileInputRef} type='file' accept='.json'
				style={{ display: 'none' }} onChange={handleFileChange} />

			<Tooltip title={isDefaultSet ? 'Patches (default set)' : 'Patches'} placement='right'>
				<IconButton size='small' onClick={() => setOpen(v => !v)}
					sx={open || isDefaultSet
						? { ...hwIconBtnLit(COLOR), p: 0.5 }
						: btnSx
					}>
					<LayersIcon sx={{ fontSize: 12 }} />
				</IconButton>
			</Tooltip>

			{open && (
				<Box
					className='nodrag nopan'
					onMouseDown={e => e.stopPropagation()}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					sx={{
						position:        'absolute',
						top:             0,
						...(columnsSwapped
							? { right: 'calc(100% + 4px)' }
							: { left:  'calc(100% + 4px)' }
						),
						backgroundImage: METAL_BG,
						border:          isDragOver
							? `1px solid ${COLOR}99`
							: `1px solid ${COLOR}40`,
						borderRadius:    1,
						width:           300,
						maxHeight:       480,
						display:         'flex',
						flexDirection:   'column',
						zIndex:          100,
						boxShadow:       isDragOver
							? `0 4px 20px rgba(0,0,0,0.8), 0 0 0 2px ${COLOR}40`
							: `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${COLOR}18`,
						transition:      'border-color 120ms, box-shadow 120ms',
					}}
				>
					{/* Header */}
					<Box sx={{
						display:        'flex',
						alignItems:     'center',
						px:             1,
						py:             0.5,
						borderBottom:   `1px solid ${COLOR}20`,
						gap:            0.5,
						flexShrink:     0,
					}}>
						<Typography sx={{
							fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
							color: 'text.disabled', flex: 1,
						}}>
							{isDragOver ? 'Drop to load' : (statusMsg ?? 'Patches')}
						</Typography>
						<Tooltip title='Open file' placement='top'>
							<IconButton size='small'
								onClick={() => fileInputRef.current?.click()}
								sx={{ ...hwIconBtn(COLOR), p: 0.35 }}>
								<FolderOpenIcon sx={{ fontSize: 10 }} />
							</IconButton>
						</Tooltip>
					</Box>

					{/* Save row */}
					<Box sx={{
						display:      'flex',
						alignItems:   'center',
						gap:          0.5,
						px:           0.75,
						py:           0.5,
						borderBottom: `1px solid ${COLOR}20`,
						flexShrink:   0,
					}}>
						<Box sx={{ ...HW_INSET, flex: 1, px: 0.75, py: 0.3, display: 'flex', alignItems: 'center' }}>
							<InputBase
								value={saveName}
								onChange={e => setSaveName(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
								placeholder='name...'
								sx={{
									fontSize: 10, color: 'text.secondary', width: '100%',
									'& .MuiInputBase-input': { p: 0 },
								}}
							/>
						</Box>
						<Tooltip title='Save current session' placement='top'>
							<IconButton size='small' onClick={handleSave}
								sx={{ ...hwIconBtn(COLOR), p: 0.35 }}>
								<AddIcon sx={{ fontSize: 12 }} />
							</IconButton>
						</Tooltip>
					</Box>

					{/* Storage error */}
					{saveError && (
						<Box sx={{ px: 1, py: 0.5, borderBottom: `1px solid ${COLOR}20`, flexShrink: 0 }}>
							<Typography sx={{
								fontSize: 9, color: '#cc4444', cursor: 'pointer',
								'&:hover': { color: '#ff6666' },
							}} onClick={clearSaveError}>
								{saveError}
							</Typography>
						</Box>
					)}

					{/* Patch list */}
					<Box sx={{ overflowY: 'auto', flex: 1 }}>
						{sorted.length === 0 ? (
							<Typography sx={{
								fontSize: 9, color: 'text.disabled', p: 1.5,
								textAlign: 'center', display: 'block',
							}}>
								No saved patches yet.{'\n'}Drop a .json file or save the current session.
							</Typography>
						) : (
							sorted.map(saved => (
								<PatchRow
									key={saved.id}
									saved={saved}
									isDefault={defaultPatchId === saved.id}
									onLoad={handleLoad}
									onUpdate={handleUpdate}
									onDuplicate={handleDuplicate}
									onDownload={handleDownload}
									onDelete={handleDelete}
									onToggleDefault={handleToggleDefault}
								/>
							))
						)}
					</Box>
				</Box>
			)}
		</div>
	);
}
