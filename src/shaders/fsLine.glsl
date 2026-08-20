precision highp float;
#define EPS 1E-6
// sqrt(2π) — normalization constant for the 1D Gaussian: G(x) = exp(…) / (SQRT_TWO_PI · σ)
#define SQRT_TWO_PI 2.5066282746310002
#define SQRT2       1.4142135623730951
uniform float uSize;
uniform sampler2D uScreen;

// See vsLine.glsl for the packing convention.
varying vec4 uvl;
varying vec2 vTexCoord;
varying vec4 vColor;

float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma)) / (SQRT_TWO_PI * sigma);
}

// Error function approximation — Abramowitz & Stegun, eq. 7.1.28.
// Max absolute error ≈ 2.5e-5; sufficient for visual anti-aliasing.
float erf(float x) {
    float s = sign(x), a = abs(x);
    x = 1.0 + (0.278393 + (0.230389 + 0.078108 * (a * a)) * a) * a;
    x *= x;
    return s - s / (x * x);
}

void main (void) {
    float len = uvl.z;
    vec2 xy = uvl.xy;
    float sigma = uSize / 5.0;

    // Branch-free selection between point and line brightness.
    // isPoint = 1.0 for degenerate (zero-length) segments, 0.0 otherwise.
    float isPoint = step(len, EPS);

    // Guard the denominator so line-brightness arithmetic stays finite even
    // when len ≈ 0; the mix below discards this value in the point case.
    float safelen = max(len, EPS);

    // Line: integrate Gaussian profile along the segment, then apply
    // a Gaussian cross-section in the perpendicular direction.
    float lineBrightness = erf(xy.x / (SQRT2 * sigma)) - erf((xy.x - safelen) / (SQRT2 * sigma));
    lineBrightness *= exp(-xy.y * xy.y / (2.0 * sigma * sigma)) / (2.0 * safelen);

    // Point: radial Gaussian for degenerate zero-length segments.
    float pointBrightness = gaussian(length(xy), sigma);

    float brightness = mix(lineBrightness, pointBrightness, isPoint) * uvl.w;

    // vColor.rgb = beam colour; vColor.a carries the Z (intensity/blanking) channel — 0 → dim/off
    vec3 tinted = 2.0 * texture2D(uScreen, vTexCoord).rgb * brightness * vColor.rgb * vColor.a;
    gl_FragColor = vec4(tinted, 1.0);
}
