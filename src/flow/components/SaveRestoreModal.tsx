import { useState } from 'react';
import { useAppStore } from '../../shared/stores/appStore';
import type { SavedFlowState } from '../stores/flowSlice';

interface SaveRestoreModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SaveRestoreModal({ isOpen, onClose }: SaveRestoreModalProps) {
	const [mode, setMode] = useState<'save' | 'restore' | 'import-export'>(
		'save'
	);
	const [saveName, setSaveName] = useState('');
	const [saveDescription, setSaveDescription] = useState('');
	const [importData, setImportData] = useState('');

	const savedStates = useAppStore((state) => state.savedStates);
	const saveFlowState = useAppStore((state) => state.saveFlowState);
	const restoreFlowState = useAppStore((state) => state.restoreFlowState);
	const deleteSavedState = useAppStore((state) => state.deleteSavedState);
	const exportFlowState = useAppStore((state) => state.exportFlowState);
	const importFlowState = useAppStore((state) => state.importFlowState);

	const handleSave = () => {
		if (!saveName.trim()) {
			alert('Please enter a name for the saved state');
			return;
		}

		saveFlowState(saveName.trim(), saveDescription.trim() || undefined);
		setSaveName('');
		setSaveDescription('');
		// Don't close modal so user can see the new saved state
	};

	const handleRestore = (savedState: SavedFlowState) => {
		const success = restoreFlowState(savedState.id);
		if (success) {
			onClose();
		} else {
			alert('Failed to restore flow state');
		}
	};

	const handleDelete = (savedState: SavedFlowState) => {
		if (confirm(`Are you sure you want to delete "${savedState.name}"?`)) {
			deleteSavedState(savedState.id);
		}
	};

	const handleExport = () => {
		const jsonData = exportFlowState();
		// Create a download link
		const blob = new Blob([jsonData], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `reactoscope-flow-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleImport = () => {
		if (!importData.trim()) {
			alert('Please paste the JSON data to import');
			return;
		}

		const success = importFlowState(importData);
		if (success) {
			setImportData('');
			onClose();
		} else {
			alert('Failed to import flow state. Please check the JSON format.');
		}
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	};

	if (!isOpen) return null;

	return (
		<div
			className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'
			onClick={onClose}
		>
			<div
				className='bg-canvas border border-interactive rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4 shadow-xl'
				onClick={(e) => e.stopPropagation()}
				data-variant='core'
			>
				<div className='flex justify-between items-center mb-6'>
					<h2 className='text-xl font-semibold text-node-primary'>
						Flow State Manager
					</h2>
					<button
						onClick={onClose}
						className='text-node-secondary hover:text-node-primary transition-colors p-1 rounded'
					>
						✕
					</button>
				</div>

				{/* Mode Tabs */}
				<div className='flex border-b border-node mb-6'>
					<button
						onClick={() => setMode('save')}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							mode === 'save'
								? 'text-node-accent border-b-2 border-node-accent'
								: 'text-node-secondary hover:text-node-primary'
						}`}
					>
						Save Current
					</button>
					<button
						onClick={() => setMode('restore')}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							mode === 'restore'
								? 'text-node-accent border-b-2 border-node-accent'
								: 'text-node-secondary hover:text-node-primary'
						}`}
					>
						Restore ({savedStates.length})
					</button>
					<button
						onClick={() => setMode('import-export')}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							mode === 'import-export'
								? 'text-node-accent border-b-2 border-node-accent'
								: 'text-node-secondary hover:text-node-primary'
						}`}
					>
						Import/Export
					</button>
				</div>

				{/* Save Mode */}
				{mode === 'save' && (
					<div className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-node-primary mb-2'>
								Save Name *
							</label>
							<input
								type='text'
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
								placeholder='Enter a name for this save...'
								className='w-full px-3 py-2 bg-node-secondary border border-node rounded-lg text-node-primary placeholder:text-node-secondary focus:outline-none focus:ring-2 focus:ring-node-accent focus:border-node-accent transition-colors'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-node-primary mb-2'>
								Description (optional)
							</label>
							<textarea
								value={saveDescription}
								onChange={(e) => setSaveDescription(e.target.value)}
								placeholder='Describe this flow state...'
								rows={3}
								className='w-full px-3 py-2 bg-node-secondary border border-node rounded-lg text-node-primary placeholder:text-node-secondary focus:outline-none focus:ring-2 focus:ring-node-accent focus:border-node-accent transition-colors resize-none'
							/>
						</div>
						<button
							onClick={handleSave}
							className='w-full px-4 py-3 bg-node-accent hover:bg-node-accent/80 text-node-on-accent rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2'
						>
							<span>💾</span>
							Save Current State
						</button>
					</div>
				)}

				{/* Restore Mode */}
				{mode === 'restore' && (
					<div className='space-y-3'>
						{savedStates.length === 0 ? (
							<div className='text-center py-12'>
								<div className='text-4xl mb-4 opacity-50'>📁</div>
								<p className='text-node-secondary'>
									No saved states yet. Create some saves first!
								</p>
							</div>
						) : (
							savedStates.map((savedState) => (
								<div
									key={savedState.id}
									className='bg-node-secondary border border-node rounded-lg p-4 hover:bg-node-interactive transition-colors'
								>
									<div className='flex justify-between items-start'>
										<div className='flex-1'>
											<h3 className='font-medium text-node-primary'>
												{savedState.name}
											</h3>
											<p className='text-sm text-node-secondary'>
												{formatDate(savedState.timestamp)}
											</p>
											{savedState.description && (
												<p className='text-sm text-node-primary mt-1 opacity-90'>
													{savedState.description}
												</p>
											)}
											<div className='text-xs text-node-secondary mt-2 flex items-center gap-4'>
												<span className='flex items-center gap-1'>
													<span>🔴</span>
													{savedState.nodes.length} nodes
												</span>
												<span className='flex items-center gap-1'>
													<span>🔗</span>
													{savedState.edges.length} edges
												</span>
											</div>
										</div>
										<div className='flex gap-2 ml-4'>
											<button
												onClick={() => handleRestore(savedState)}
												className='px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-1'
											>
												<span>📋</span>
												Restore
											</button>
											<button
												onClick={() => handleDelete(savedState)}
												className='px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-1'
											>
												<span>🗑️</span>
												Delete
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				)}

				{/* Import/Export Mode */}
				{mode === 'import-export' && (
					<div className='space-y-6'>
						<div>
							<h3 className='text-lg font-medium text-node-primary mb-3 flex items-center gap-2'>
								<span>📤</span>
								Export Current State
							</h3>
							<p className='text-sm text-node-secondary mb-4'>
								Download your current flow as a JSON file to share or backup.
							</p>
							<button
								onClick={handleExport}
								className='w-full px-4 py-3 bg-node-accent hover:bg-node-accent/80 text-node-on-accent rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2'
							>
								<span>📤</span>
								Export & Download
							</button>
						</div>

						<div className='border-t border-node pt-6'>
							<h3 className='text-lg font-medium text-node-primary mb-3 flex items-center gap-2'>
								<span>📥</span>
								Import State
							</h3>
							<p className='text-sm text-node-secondary mb-4'>
								Paste the JSON data from an exported flow to load it.
							</p>
							<textarea
								value={importData}
								onChange={(e) => setImportData(e.target.value)}
								placeholder='Paste exported JSON data here...'
								rows={8}
								className='w-full px-3 py-2 bg-node-secondary border border-node rounded-lg text-node-primary placeholder:text-node-secondary focus:outline-none focus:ring-2 focus:ring-node-accent focus:border-node-accent transition-colors font-mono text-sm resize-none'
							/>
							<button
								onClick={handleImport}
								className='w-full mt-3 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2'
							>
								<span>📥</span>
								Import Flow State
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
