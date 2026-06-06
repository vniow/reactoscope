import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useEffects } from '../contexts/WoahscopeContext';
import { GALVO_PRESETS, type GalvoPresetId } from '../laser/presets';
import { computeFrameStats, FLICKER_COLOR } from '../laser/frameStats';
import { NODE_COLORS } from '../daw/nodes/nodeColors';
import { hwSelectSx, hwSelectMenuProps } from '../daw/nodes/hwStyles';
import { HwSliderField } from './HwSliderField';

const color = NODE_COLORS.scene;

export function GalvoControl() {
	const {
		coordBufferSize,
		galvoPresetId,             setGalvoPresetId,
		galvoBandwidthHz,          setGalvoBandwidthHz,
		galvoDampingRatio,         setGalvoDampingRatio,
		galvoModulatorTauUs,       setGalvoModulatorTauUs,
		galvoPps,                  setGalvoPps,
		galvoAnchorAggressiveness, setGalvoAnchorAggressiveness,
	} = useEffects();

	// Slider edits drift away from any named preset → tag as 'custom'.
	const onParamEdit = (setter: (v: number) => void) => (v: number) => {
		if (galvoPresetId !== 'custom') setGalvoPresetId('custom');
		setter(v);
	};

	const stats       = computeFrameStats(galvoPps, coordBufferSize);
	const flickerHex  = FLICKER_COLOR[stats.flicker];

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
			<Select
				value={galvoPresetId}
				onChange={(e) => setGalvoPresetId(e.target.value as GalvoPresetId)}
				size='small'
				sx={hwSelectSx(color)}
				MenuProps={hwSelectMenuProps(color)}
			>
				{(Object.keys(GALVO_PRESETS) as Exclude<GalvoPresetId, 'custom'>[]).map((id) => (
					<MenuItem key={id} value={id} sx={{ fontSize: 11 }}>
						{GALVO_PRESETS[id].label}
					</MenuItem>
				))}
				<MenuItem value='custom' sx={{ fontSize: 11 }}>Custom</MenuItem>
			</Select>

			<HwSliderField
				label='PPS'
				value={galvoPps}
				min={5_000} max={80_000} step={1_000}
				color={color}
				onChange={onParamEdit(setGalvoPps)}
				format={(v) => String(Math.round(v))}
				unit='pps'
				allowValueEdit
				allowBoundsEdit
			/>
			<HwSliderField
				label='anchor'
				value={galvoAnchorAggressiveness}
				min={0} max={1} step={0.05}
				color={color}
				onChange={onParamEdit(setGalvoAnchorAggressiveness)}
				format={(v) => v.toFixed(2)}
				allowValueEdit
				allowBoundsEdit
			/>
			<HwSliderField
				label='bandwidth'
				value={galvoBandwidthHz}
				min={2_000} max={40_000} step={500}
				color={color}
				onChange={onParamEdit(setGalvoBandwidthHz)}
				format={(v) => String(Math.round(v))}
				unit='Hz'
				allowValueEdit
				allowBoundsEdit
			/>
			<HwSliderField
				label='damping'
				value={galvoDampingRatio}
				min={0.1} max={1.2} step={0.02}
				color={color}
				onChange={onParamEdit(setGalvoDampingRatio)}
				format={(v) => v.toFixed(2)}
				unit='ζ'
				allowValueEdit
				allowBoundsEdit
			/>
			<HwSliderField
				label='modulator τ'
				value={galvoModulatorTauUs}
				min={0.5} max={60} step={0.5}
				color={color}
				onChange={onParamEdit(setGalvoModulatorTauUs)}
				format={(v) => v.toFixed(1)}
				unit='µs'
				allowValueEdit
				allowBoundsEdit
			/>

			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, letterSpacing: 0.5 }}>
					{stats.pointsPerFrame} pts/frame
				</Typography>
				<Typography variant='caption' sx={{ fontSize: 9, color: flickerHex, fontWeight: 600 }}>
					{stats.fps.toFixed(1)} fps · {stats.flicker}
				</Typography>
			</Box>
		</Box>
	);
}
