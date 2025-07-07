# Lanczos and Smoothing for Anti-Aliasing in XYscope.js

This document explains how `xyscope.js` implements custom Lanczos and other smoothing for anti-aliasing, and provides the exact code used for these operations.

---

## Description

**Purpose:**

- To reduce aliasing artifacts and produce visually smooth, anti-aliased oscilloscope lines, especially for high-frequency or noisy signals.
- Smoothing is applied to the raw audio waveform data before rendering.

**How it works:**

- The `XXY_Filter` object manages smoothing.
- It creates a Lanczos (windowed sinc) kernel for convolution.
- The kernel is applied to the audio sample buffer, producing a smoothed output that reduces high-frequency noise and aliasing.
- The smoothed samples are then used for rendering, resulting in anti-aliased, visually pleasing lines.

---

## Relevant Code from xyscope.js

```javascript
var XXY_Filter = {
	lanczosTweak: 1.5,

	init: function (bufferSize, a, steps) {
		this.kernel = this.createLanczosKernel(bufferSize, a, steps);
	},

	// Generate smoothed samples by convolving input with kernel
	generateSmoothedSamples: function (oldSamples, samples, smoothedSamples) {
		for (var i = 0; i < samples.length; i++) {
			var acc = 0;
			for (var j = 0; j < this.kernel.length; j++) {
				var idx = i + j - Math.floor(this.kernel.length / 2);
				if (idx >= 0 && idx < samples.length) {
					acc += samples[idx] * this.kernel[j];
				}
			}
			smoothedSamples[i] = acc;
		}
	},

	// Create a Lanczos kernel for smoothing
	createLanczosKernel: function (bufferSize, a, steps) {
		var kernel = [];
		var center = Math.floor(bufferSize / 2);
		for (var i = 0; i < bufferSize; i++) {
			var x = (i - center) / a;
			if (x === 0) {
				kernel[i] = 1;
			} else if (Math.abs(x) < 1) {
				kernel[i] =
					(a * Math.sin(Math.PI * x) * Math.sin((Math.PI * x) / a)) /
					(Math.PI * Math.PI * x * x);
			} else {
				kernel[i] = 0;
			}
		}
		// Normalize kernel
		var sum = kernel.reduce(function (a, b) {
			return a + b;
		}, 0);
		for (var i = 0; i < kernel.length; i++) {
			kernel[i] /= sum;
		}
		return kernel;
	},
};
```

---

## Summary

- The code above shows how XYscope.js creates a Lanczos kernel and applies it to smooth audio data before rendering, which is key to its anti-aliasing strategy.
