import Box from '@mui/material/Box';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { CompressorBandData } from '../../../store/dawTypes';

const ALL_PARAMS: (keyof CompressorBandData)[] = ['threshold', 'ratio', 'attack', 'release', 'knee'];

type Props = {
	value:    CompressorBandData;
	onChange: (update: Partial<CompressorBandData>) => void;
	color:    string;
	/** Which sliders to show — defaults to all 5. MultibandCompressor's v1 scope shows threshold+ratio only (docs/node-roadmap.md). */
	params?:  (keyof CompressorBandData)[];
};

/**
 * The threshold/ratio/attack/release/knee slider row every real Compressor
 * band needs — standalone Compressor, and each band of MidSideCompressor/
 * MultibandCompressor (docs/adr/0004-nested-param-panel-layout.md).
 */
export function CompressorControls({ value, onChange, color, params = ALL_PARAMS }: Props) {
	return (
		<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
			{params.includes('threshold') && (
				<HwArcSlider label='threshold' value={value.threshold} min={-100} max={0} step={1} color={color}
					onChange={v => onChange({ threshold: v })} format={v => v.toFixed(0)} unit='dB' allowValueEdit allowBoundsEdit />
			)}
			{params.includes('ratio') && (
				<HwArcSlider label='ratio' value={value.ratio} min={1} max={20} step={0.5} color={color}
					onChange={v => onChange({ ratio: v })} format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
			)}
			{params.includes('attack') && (
				<HwArcSlider label='attack' value={value.attack} min={0} max={1} step={0.001} color={color}
					onChange={v => onChange({ attack: v })} format={v => v.toFixed(3)} unit='s' allowValueEdit allowBoundsEdit />
			)}
			{params.includes('release') && (
				<HwArcSlider label='release' value={value.release} min={0} max={1} step={0.01} color={color}
					onChange={v => onChange({ release: v })} format={v => v.toFixed(2)} unit='s' allowValueEdit allowBoundsEdit />
			)}
			{params.includes('knee') && (
				<HwArcSlider label='knee' value={value.knee} min={0} max={40} step={1} color={color}
					onChange={v => onChange({ knee: v })} format={v => v.toFixed(0)} unit='dB' allowValueEdit allowBoundsEdit />
			)}
		</Box>
	);
}
