/**
 * FAB + add-menu + drag-drop import veil — sibling of the R3F <Canvas>
 * (mounted outside it, in SceneInputPanel). Selection/arrangement itself
 * lives in SceneSourcesArrangeScene, inside <Canvas>.
 */

import { useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { useDawStore } from '../../../store/daw';
import { hwDeleteIconBtn } from '../../nodes/shared/hwStyles';
import { NODE_COLORS } from '../../nodes/shared/nodeColors';
import { PRIMITIVE_SOURCE_TYPES, SOURCE_TYPE_LABEL } from '../../../scene/sources/sourceRegistry';
import { fileToDataUri, sourceTypeForFile } from '../../../scene/sources/assetImport';
import type { GeometrySourceType } from '../../../store/dawTypes';

const COLOR = NODE_COLORS.scene;

const PRIMITIVE_ICON: Record<string, React.ComponentType<SvgIconProps>> = {
	cube:   CheckBoxOutlineBlankIcon,
	circle: RadioButtonUncheckedIcon,
	plane:  CropSquareIcon,
	sphere: PanoramaFishEyeIcon,
};

export function SceneSourcesOverlay() {
	const sources    = useDawStore(s => s.sources);
	const addSource  = useDawStore(s => s.addSource);
	const [menuOpen, setMenuOpen] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const importFile = useCallback(async (file: File) => {
		const type = sourceTypeForFile(file);
		if (!type) return;
		const assetDataUri = await fileToDataUri(file);
		addSource(type as GeometrySourceType, { assetDataUri, assetName: file.name });
	}, [addSource]);

	const handleAddPrimitive = useCallback((type: GeometrySourceType) => {
		addSource(type);
		setMenuOpen(false);
	}, [addSource]);

	const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
	const handleDragLeave = useCallback(() => setDragOver(false), []);
	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) void importFile(file);
	}, [importFile]);

	const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) void importFile(file);
		e.target.value = '';
	}, [importFile]);

	return (
		<Box
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			sx={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
		>
			<input ref={fileInputRef} type='file' accept='.svg,.glb,.gltf'
				style={{ display: 'none' }} onChange={handleFileInputChange} />

			{dragOver && (
				<Box sx={{
					position: 'absolute', inset: 0, pointerEvents: 'none',
					bgcolor: `${COLOR}14`, border: `2px dashed ${COLOR}80`,
					display: 'flex', alignItems: 'center', justifyContent: 'center',
				}}>
					<Typography sx={{ fontSize: 12, color: COLOR, fontWeight: 600 }}>Drop to import (SVG / glTF)</Typography>
				</Box>
			)}

			<Typography sx={{
				position: 'absolute', top: 8, left: 8, fontSize: 8.5, color: 'text.disabled', letterSpacing: 0.4,
			}}>
				{sources.length} source{sources.length === 1 ? '' : 's'} — click an object to select
			</Typography>

			<Box sx={{ position: 'absolute', bottom: 12, right: 12, pointerEvents: 'auto' }}>
				{menuOpen && (
					<Box sx={{
						position: 'absolute', bottom: '100%', right: 0, mb: 1,
						bgcolor: 'rgba(20,20,24,0.95)', border: `1px solid ${COLOR}40`, borderRadius: 1,
						p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25, width: 150,
					}}>
						{PRIMITIVE_SOURCE_TYPES.map((t) => {
							const Icon = PRIMITIVE_ICON[t];
							return (
								<Box key={t} component='button' onClick={() => handleAddPrimitive(t)}
									sx={{
										display: 'flex', alignItems: 'center', gap: 0.75,
										background: 'none', border: 'none', color: 'text.secondary', cursor: 'pointer',
										fontSize: 10, p: 0.5, borderRadius: 0.5, textAlign: 'left',
										'&:hover': { color: COLOR, background: `${COLOR}14` },
									}}>
									<Icon sx={{ fontSize: 13 }} />
									{SOURCE_TYPE_LABEL[t]}
								</Box>
							);
						})}
						<Box component='button' onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}
							sx={{
								display: 'flex', alignItems: 'center', gap: 0.75,
								background: 'none', border: 'none', color: 'text.secondary', cursor: 'pointer',
								fontSize: 10, p: 0.5, borderRadius: 0.5, textAlign: 'left',
								borderTop: `1px solid ${COLOR}20`, mt: 0.25, pt: 0.75,
								'&:hover': { color: COLOR, background: `${COLOR}14` },
							}}>
							<FileUploadIcon sx={{ fontSize: 13 }} />
							Import file…
						</Box>
					</Box>
				)}
				<IconButton onClick={() => setMenuOpen(v => !v)}
					sx={{
						...hwDeleteIconBtn(COLOR), width: 34, height: 34,
						color: menuOpen ? '#000' : COLOR,
						background: menuOpen ? `linear-gradient(to bottom, ${COLOR}ee, ${COLOR}cc)` : undefined,
						transform: menuOpen ? 'rotate(45deg)' : 'none',
						transition: 'transform 120ms ease',
					}}>
					<AddIcon />
				</IconButton>
			</Box>
		</Box>
	);
}
