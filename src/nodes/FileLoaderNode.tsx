import { useState, useCallback } from 'react';
import { BaseNode } from '../components/BaseNode';
import { GridFileInput } from '../components/ui/GridFileInput';
import { GridButton } from '../components/ui/GridButton';
import { GridBlock } from '../components/GridBlock';
import { createTypeValidator, createSizeValidator } from '../utils/fileUtils';
import { useNodeOperations } from '../hooks/useNodeOperations';
import type { NodeProps } from '@xyflow/react';
import type { FileLoaderNode as FileLoaderNodeType } from './types';

export function FileLoaderNode({
	id,
	data,
	selected,
}: NodeProps<FileLoaderNodeType>) {
	const { deleteNode } = useNodeOperations();

	// Node state
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [errors, setErrors] = useState<string[]>([]);

	// Configuration from node data
	const maxFileSize = (data?.maxFileSize as number) || 50 * 1024 * 1024; // 50MB default
	const acceptedTypes = (data?.acceptedTypes as string) || 'audio/*,image/*';

	// Handle file selection
	const handleFileSelect = useCallback((files: File[]) => {
		setSelectedFiles(files);
		setErrors([]); // Clear previous errors
		console.log(
			'Files selected:',
			files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
		);
	}, []);

	// Handle file errors
	const handleFileError = useCallback((fileErrors: string[]) => {
		setErrors(fileErrors);
		console.error('File validation errors:', fileErrors);
	}, []);

	// Handle file removal
	const handleFileRemove = useCallback((fileToRemove: File) => {
		setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
		console.log('File removed:', fileToRemove.name);
	}, []);

	// Handle clear files
	const handleClearFiles = useCallback(() => {
		setSelectedFiles([]);
		setErrors([]);
	}, []);

	return (
		<BaseNode
			nodeId={id as string}
			selected={selected as boolean}
			onDelete={deleteNode}
			title='File Loader'
			variant='signal'
			gridWidth={4}
			gridHeight={6}
		>
			{/* Main file input area */}
			<GridFileInput
				gridWidth={4}
				gridHeight={3}
				gridX={0}
				gridY={1}
				label='Select Files'
				layout='stacked'
				showFileName={true}
				showFileSize={true}
				showPreview={true}
				textSize='xs'
				placeholder='Drop audio/image files here'
				fileInputProps={{
					accept: acceptedTypes,
					multiple: true,
					maxSize: maxFileSize,
					onFileSelect: handleFileSelect,
					onFileError: handleFileError,
					onFileRemove: handleFileRemove,
					currentFiles: selectedFiles,
					validators: [
						createTypeValidator(['audio/*', 'image/*']),
						createSizeValidator(maxFileSize),
					],
					'aria-label': 'File loader input - accepts audio and image files',
				}}
			/>

			{/* Action button */}
			<GridButton
				gridWidth={4}
				gridHeight={1}
				gridX={0}
				gridY={4}
				buttonLabel='Clear All Files'
				variant='warning'
				icon='🗑️'
				onClick={handleClearFiles}
				disabled={selectedFiles.length === 0}
				aria-label='Clear all files'
			/>

			{/* Status/Info display */}
			<GridBlock
				gridWidth={4}
				gridHeight={2}
				gridX={0}
				gridY={4.5}
				className='p-2 bg-[var(--node-bg-secondary,light-dark(#f9fafb,#374151))] rounded'
			>
				<div className='w-full h-full flex flex-col justify-center text-xs text-[var(--node-text-secondary,light-dark(#6b7280,#d1d5db))]'>
					{/* File count and size info */}
					<div className='flex justify-between items-center mb-1'>
						<span>Files: {selectedFiles.length}</span>
						<span>
							Size:{' '}
							{selectedFiles.reduce((total, file) => total + file.size, 0) > 0
								? `${(selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(1)}MB`
								: '0MB'}
						</span>
					</div>

					{/* Error display */}
					{errors.length > 0 && (
						<div className='text-red-500 text-xs'>
							{errors.map((error, index) => (
								<div key={index}>⚠️ {error}</div>
							))}
						</div>
					)}

					{/* Success message */}
					{selectedFiles.length > 0 && errors.length === 0 && (
						<div className='text-green-500 text-xs'>
							✅ {selectedFiles.length} file
							{selectedFiles.length !== 1 ? 's' : ''} ready
						</div>
					)}

					{/* Accepted formats info */}
					<div className='text-xs opacity-70 mt-1'>
						Accepts: Audio & Images (max {Math.round(maxFileSize / 1024 / 1024)}
						MB)
					</div>
				</div>
			</GridBlock>
		</BaseNode>
	);
}
