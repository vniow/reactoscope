import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import { HW_INSET } from '../../daw/nodes/shared/hwStyles';

interface AudioFileLoaderProps {
	color:       string;
	onLoad:      (url: string, filename: string) => void;
	/** File picker filter (e.g. 'audio/*' or '.ild,.ILD'). Defaults to audio. */
	accept?:     string;
	/** Placeholder shown when nothing is loaded. */
	placeholder?: string;
}

function truncate(s: string, max = 22): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function AudioFileLoader({ color, onLoad, accept = 'audio/*', placeholder = 'drop file or click' }: AudioFileLoaderProps) {
	const inputRef              = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver]         = useState(false);
	const [urlMode,  setUrlMode]          = useState(false);
	const [urlInput, setUrlInput]         = useState('');
	const [displayName, setDisplayName]   = useState<string | null>(null);

	const commit = (url: string, name: string) => {
		setDisplayName(name);
		onLoad(url, name);
	};

	const handleFile = (file: File) => {
		commit(URL.createObjectURL(file), file.name);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
		e.target.value = '';
	};

	const handleUrlSubmit = () => {
		const url = urlInput.trim();
		if (!url) return;
		const name = url.split('/').pop()?.split('?')[0] ?? url;
		commit(url, name);
		setUrlMode(false);
		setUrlInput('');
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter')  handleUrlSubmit();
		if (e.key === 'Escape') { setUrlMode(false); setUrlInput(''); }
	};

	if (urlMode) {
		return (
			<Box sx={{ display: 'flex', gap: 0.5 }} className='nodrag'>
				<InputBase
					// eslint-disable-next-line jsx-a11y/no-autofocus
					autoFocus
					placeholder='Paste audio URL…'
					value={urlInput}
					onChange={(e) => setUrlInput(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => { if (!urlInput.trim()) setUrlMode(false); }}
					sx={{
						flex: 1, ...HW_INSET, px: 0.75,
						'& input': { p: 0, fontSize: 9, color: 'text.primary' },
					}}
				/>
				<Box
					onClick={handleUrlSubmit}
					sx={{
						...HW_INSET, px: 0.75, py: 0.25,
						cursor: 'pointer', fontSize: 9, color, fontWeight: 600,
						display: 'flex', alignItems: 'center',
						'&:hover': { filter: 'brightness(1.3)' },
					}}
				>
					load
				</Box>
			</Box>
		);
	}

	const loaded = displayName !== null;

	return (
		<Box
			onClick={() => inputRef.current?.click()}
			onDrop={handleDrop}
			onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
			onDragLeave={() => setDragOver(false)}
			sx={{
				...HW_INSET,
				px: 1, py: 0.75,
				display: 'flex', alignItems: 'center', gap: 0.5,
				cursor: 'pointer',
				...(dragOver && { border: `1px solid ${color}80`, boxShadow: `inset 0 2px 4px rgba(0,0,0,0.55), 0 0 6px ${color}28` }),
			}}
			className='nodrag'
		>
			<AudioFileIcon sx={{ fontSize: 11, color: loaded ? color : 'text.disabled', flexShrink: 0 }} />
			<Typography sx={{
				fontSize: 9, flex: 1,
				color: loaded ? 'text.secondary' : 'text.disabled',
				overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
			}}>
				{loaded ? truncate(displayName) : placeholder}
			</Typography>
			<Box
				component='span'
				onClick={(e) => { e.stopPropagation(); setUrlMode(true); }}
				sx={{ fontSize: 8, color: 'text.disabled', flexShrink: 0, px: 0.25, '&:hover': { color } }}
			>
				url
			</Box>
			<input ref={inputRef} type='file' accept={accept} onChange={handleFileInput} style={{ display: 'none' }} />
		</Box>
	);
}
