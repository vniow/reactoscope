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
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={onClose}
		>
			<div
				className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex justify-between items-center mb-4'>
					<h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
						Flow State Manager
					</h2>
					<button
						onClick={onClose}
						className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
					>
						✕
					</button>
				</div>

				{/* Mode Tabs */}
				<div className='flex border-b border-gray-200 dark:border-gray-700 mb-4'>
					<button
						onClick={() => setMode('save')}
						className={`px-4 py-2 text-sm font-medium ${
							mode === 'save'
								? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
								: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
						}`}
					>
						Save Current
					</button>
					<button
						onClick={() => setMode('restore')}
						className={`px-4 py-2 text-sm font-medium ${
							mode === 'restore'
								? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
								: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
						}`}
					>
						Restore ({savedStates.length})
					</button>
					<button
						onClick={() => setMode('import-export')}
						className={`px-4 py-2 text-sm font-medium ${
							mode === 'import-export'
								? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
								: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
						}`}
					>
						Import/Export
					</button>
				</div>

				{/* Save Mode */}
				{mode === 'save' && (
					<div className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Save Name *
							</label>
							<input
								type='text'
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
								placeholder='Enter a name for this save...'
								className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Description (optional)
							</label>
							<textarea
								value={saveDescription}
								onChange={(e) => setSaveDescription(e.target.value)}
								placeholder='Describe this flow state...'
								rows={3}
								className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
							/>
						</div>
						<button
							onClick={handleSave}
							className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium'
						>
							💾 Save Current State
						</button>
					</div>
				)}

				{/* Restore Mode */}
				{mode === 'restore' && (
					<div className='space-y-3'>
						{savedStates.length === 0 ? (
							<p className='text-gray-600 dark:text-gray-400 text-center py-8'>
								No saved states yet. Create some saves first!
							</p>
						) : (
							savedStates.map((savedState) => (
								<div
									key={savedState.id}
									className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
								>
									<div className='flex justify-between items-start'>
										<div className='flex-1'>
											<h3 className='font-medium text-gray-900 dark:text-gray-100'>
												{savedState.name}
											</h3>
											<p className='text-sm text-gray-600 dark:text-gray-400'>
												{formatDate(savedState.timestamp)}
											</p>
											{savedState.description && (
												<p className='text-sm text-gray-700 dark:text-gray-300 mt-1'>
													{savedState.description}
												</p>
											)}
											<div className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
												{savedState.nodes.length} nodes,{' '}
												{savedState.edges.length} edges
											</div>
										</div>
										<div className='flex gap-2 ml-4'>
											<button
												onClick={() => handleRestore(savedState)}
												className='px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700'
											>
												📋 Restore
											</button>
											<button
												onClick={() => handleDelete(savedState)}
												className='px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700'
											>
												🗑️ Delete
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
					<div className='space-y-4'>
						<div>
							<h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
								Export Current State
							</h3>
							<p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
								Download your current flow as a JSON file to share or backup.
							</p>
							<button
								onClick={handleExport}
								className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium'
							>
								📤 Export & Download
							</button>
						</div>

						<div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
							<h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
								Import State
							</h3>
							<p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
								Paste the JSON data from an exported flow to load it.
							</p>
							<textarea
								value={importData}
								onChange={(e) => setImportData(e.target.value)}
								placeholder='Paste exported JSON data here...'
								rows={8}
								className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm'
							/>
							<button
								onClick={handleImport}
								className='w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium'
							>
								📥 Import Flow State
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
