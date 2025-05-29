// Example of how to update your existing OscillatorNode.tsx to use the new Slider component

// Replace the FrequencySlider component with:
import { Slider } from '../components/ui/Slider';

// In your OscillatorNode component, replace the frequency slider with:
<Slider
	label="Frequency"
	value={params.frequency}
	min={80}
	max={2000}
	step={1}
	onChange={handleFrequencyChange}
	formatValue={(value) => `${value}Hz`}
	color="orange"
	size="md"
/>

// Replace the DetuneSlider component with:
<Slider
	label="Detune"
	value={params.detune}
	min={-1200}
	max={1200}
	step={1}
	onChange={handleDetuneChange}
	formatValue={(value) => `${value > 0 ? '+' : ''}${value} cents`}
	color="orange"
	size="md"
/>

// For GainNode.tsx, replace the gain slider with:
<Slider
	label="Gain"
	value={params.gain}
	min={0}
	max={2}
	step={0.01}
	onChange={handleGainChange}
	formatValue={(value) => value.toFixed(2)}
	color="default"
	size="md"
	disabled={params.mute}
/>

// For VisualizerNode.tsx, replace the smoothing slider with:
<Slider
	label="Smoothing"
	value={params.smoothing}
	min={0}
	max={1}
	step={0.01}
	onChange={handleSmoothingChange}
	formatValue={(value) => value.toFixed(2)}
	color="default"
	size="md"
	variant="compact" // Use compact variant for space-constrained areas
/>
