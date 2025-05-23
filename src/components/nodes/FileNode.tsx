import { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

// Interface for our custom node data
export interface FileNodeData {
	label: string;
	file?: File;
	nodeType?: 'audio' | 'image' | 'config' | 'data';
	description?: string;
}

export default function FileNode({ data, isConnectable }: NodeProps) {
	// Cast the data to our custom type
	const nodeData = data as unknown as FileNodeData;
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isHovering, setIsHovering] = useState(false);

	// Get node type colors
	const getNodeTypeColors = () => {
		switch (nodeData.nodeType) {
			case 'audio':
				return {
					gradient: 'from-emerald-400 to-teal-600',
					handle: 'bg-emerald-500',
					hover: 'hover:from-emerald-500 hover:to-teal-700',
					border: 'border-emerald-400',
					activeBorder: 'border-emerald-500',
				};
			case 'image':
				return {
					gradient: 'from-amber-400 to-orange-600',
					handle: 'bg-amber-500',
					hover: 'hover:from-amber-500 hover:to-orange-700',
					border: 'border-amber-400',
					activeBorder: 'border-amber-500',
				};
			case 'config':
				return {
					gradient: 'from-sky-400 to-blue-600',
					handle: 'bg-sky-500',
					hover: 'hover:from-sky-500 hover:to-blue-700',
					border: 'border-sky-400',
					activeBorder: 'border-sky-500',
				};
			default:
				return {
					gradient: 'from-violet-400 to-purple-600',
					handle: 'bg-violet-500',
					hover: 'hover:from-violet-500 hover:to-purple-700',
					border: 'border-violet-400',
					activeBorder: 'border-violet-500',
				};
		}
	};

	const colors = getNodeTypeColors();

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (files && files.length > 0) {
				setSelectedFile(files[0]);
			}
		},
		[]
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(true);
		},
		[]
	);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);

		const files = event.dataTransfer.files;
		if (files && files.length > 0) {
			setSelectedFile(files[0]);
		}
	}, []);

	// Get the file icon based on file extension
	const getFileIcon = (fileName?: string) => {
		if (!fileName) return '📄';

		const extension = fileName.split('.').pop()?.toLowerCase();

		switch (extension) {
			case 'mp3':
			case 'wav':
			case 'ogg':
			case 'flac':
				return '🎵';
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'gif':
			case 'webp':
				return '🖼️';
			case 'json':
			case 'yaml':
			case 'yml':
			case 'toml':
				return '⚙️';
			case 'txt':
			case 'md':
				return '📝';
			case 'js':
			case 'jsx':
			case 'ts':
			case 'tsx':
				return '📜';
			default:
				return '📄';
		}
	};

	return (
		<div
			className={`p-4 rounded-lg border-2 w-64 backdrop-blur-sm
                ${
									isDragging
										? `${colors.activeBorder} bg-white/10 dark:bg-black/20`
										: `${colors.border} dark:border-gray-700`
								} 
                bg-gradient-to-br from-white/90 to-gray-50/80
                dark:from-gray-800/90 dark:to-gray-900/80
                shadow-md transition-all duration-200 
                ${isHovering ? 'shadow-lg scale-[1.02]' : ''}
                hover:shadow-xl`}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
		>
			{/* Glass effect overlay */}
			<div className='absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white/30 to-transparent dark:from-white/5 rounded-t-lg pointer-events-none'></div>

			{/* Input handle */}
			<Handle
				type='target'
				position={Position.Top}
				isConnectable={isConnectable}
				className={`w-3 h-3 ${colors.handle} shadow-md transition-all duration-200 ${isHovering ? 'w-4 h-4' : ''}`}
			/>

			{/* Header with gradient text */}
			<div className='relative z-10'>
				<div
					className={`mb-3 text-lg font-medium text-center bg-clip-text text-transparent bg-gradient-to-r ${colors.gradient}`}
				>
					{nodeData.label || 'File Node'}
				</div>

				{nodeData.description && (
					<div className='text-xs text-gray-500 dark:text-gray-400 text-center mb-3 italic'>
						{nodeData.description}
					</div>
				)}
			</div>

			{/* File drop zone */}
			<div
				className={`p-4 rounded border border-dashed flex flex-col items-center justify-center gap-2
                  ${
										isDragging
											? `${colors.activeBorder} bg-white/30 dark:bg-black/30`
											: 'border-gray-300 dark:border-gray-600'
									}
                  min-h-[100px] transition-all duration-300 relative overflow-hidden
                  ${isHovering ? 'bg-white/20 dark:bg-black/20' : ''}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{/* Background glow */}
				{isDragging && (
					<div className='absolute inset-0 opacity-20 dark:opacity-10 animate-pulse'>
						<div
							className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} blur-xl`}
						></div>
					</div>
				)}

				{/* File content */}
				{selectedFile ? (
					<div className='text-center relative z-10'>
						<div className='text-4xl mb-2'>
							{getFileIcon(selectedFile.name)}
						</div>
						<p className='font-medium text-gray-800 dark:text-gray-200'>
							{selectedFile.name}
						</p>
						<p className='text-xs text-gray-500 dark:text-gray-400'>
							{(selectedFile.size / 1024).toFixed(2)} KB
						</p>
						<button
							className='mt-2 text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
							onClick={() => setSelectedFile(null)}
						>
							Remove
						</button>
					</div>
				) : (
					<div className='relative z-10'>
						<p className='text-sm text-gray-500 dark:text-gray-400 text-center mb-2'>
							Drop a file here, or click to select
						</p>
						<div className='relative'>
							<button
								className={`px-3 py-1 text-sm bg-gradient-to-r ${colors.gradient} ${colors.hover} text-white rounded-md transition-all shadow-sm hover:shadow-md`}
							>
								Select File
							</button>
							<input
								type='file'
								className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
								onChange={handleFileChange}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Output handle */}
			<Handle
				type='source'
				position={Position.Bottom}
				isConnectable={isConnectable}
				className={`w-3 h-3 ${colors.handle} shadow-md transition-all duration-200 ${isHovering ? 'w-4 h-4' : ''}`}
			/>
		</div>
	);
}
