// Fragment shader for anti-aliased line segments
precision highp float;

#define EPS 1E-6
#define SQRT2 1.4142135623730951

uniform float uSize;      // Line thickness
uniform float uIntensity; // Line brightness

varying vec4 uvl;         // .xy: orientation, .z: length, .w: index
varying vec3 vColor;

// Error function approximation for analytical integration
float erf(float x) {
	float s = sign(x), a = abs(x);
	x = 1.0 + (0.278393 + (0.230389 + (0.000972 + 0.078108 * a) * a) * a) * a;
	x *= x;
	return s - s / (x * x);
}

void main(void) {
	// Discard segments with NaN or zero-length to avoid persistent central dot
	if(uvl.z != uvl.z || uvl.z < EPS)
		discard;
	float len = uvl.z;
	vec2 xy = vec2((len / 2.0 + uSize) * uvl.x + len / 2.0, uSize * uvl.y);
	float sigma = uSize / 4.0;

	// Calculate alpha based on line length
	float alpha;
	if(len < EPS) {
		// Point case
		alpha = exp(-pow(length(xy), 2.0) / (2.0 * sigma * sigma)) / 2.0 / sqrt(uSize);
	} else {
		// Line segment case
		alpha = erf((len - xy.x) / SQRT2 / sigma) + erf(xy.x / SQRT2 / sigma);
		alpha *= exp(-xy.y * xy.y / (2.0 * sigma * sigma)) / 2.0 / len * uSize;
	}

	// Apply afterglow effect
	float afterglow = smoothstep(0.0, 0.33, uvl.w / 2048.0);
	alpha *= afterglow * uIntensity;

	// Final color: use per-vertex color from vColor
	gl_FragColor = vec4(vColor, alpha);
}
