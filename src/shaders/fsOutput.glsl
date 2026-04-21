precision highp float;

uniform sampler2D uTexture0;      // lineRT        — raw oscilloscope beam
uniform sampler2D uTexture1;      // blur1RT       — tight glow (256×256)
uniform sampler2D uTexture2;      // blur3RT       — wide scatter (32×32)
uniform sampler2D uTexture3;      // screenTexture — CRT noise mask (or white when CRT off)
uniform float uExposure;
uniform float uGlowStrength;
uniform float uScatterStrength;
// Minimum scatter contribution added to blur3RT before modulation.
// Lifts the dark regions slightly to simulate ambient phosphor scatter.
uniform float uScatterBias;
// Controls how quickly the beam colour desaturates to white at high brightness.
// At uWhitePoint = 0.0 the colour stays pure at mid-brightness;
// at 1.0 it begins mixing toward white much earlier.
uniform float uWhitePoint;

varying vec2 vTexCoord;
varying vec2 vTexCoordCanvas;

void main(void) {
    vec4 line      = texture2D(uTexture0, vTexCoordCanvas);
    vec4 tightGlow = texture2D(uTexture1, vTexCoord);
    vec4 scatter   = texture2D(uTexture2, vTexCoord) + uScatterBias;

    // CRT noise texture channel roles (when CRT is enabled):
    //   screen.g — primary mask; squared for a non-linear, high-contrast modulation
    //              of the tight glow and scatter terms
    //   screen.r — secondary contribution to scatter, adds a colour-channel offset
    //              that varies across the noise pattern
    // When CRT is disabled, screenTexture = white (1,1,1,1), collapsing both
    // channels to 1.0 and removing the modulation entirely.
    vec4 screen = texture2D(uTexture3, vTexCoord);

    // Luminance of the per-point coloured beam stored in lineRT
    float luma = dot(line.rgb, vec3(0.2126, 0.7152, 0.0722));
    float light = luma + uGlowStrength * screen.g * screen.g * dot(tightGlow.rgb, vec3(0.333));
    light += uScatterStrength * scatter.g * (2.0 + screen.g + 0.5 * screen.r);

    // Filmic tone mapping: maps [0, ∞) → [0, 1) with an exposure-controlled knee.
    float tlight  = 1.0 - pow(2.0, -uExposure * light);
    // Raise to the 6th power for a strong highlight roll-off.
    float tlight2 = tlight * tlight * tlight;

    // Recover per-point hue from lineRT (colour baked in by fsLine).
    // Normalise by luminance to extract hue direction, then re-apply tone-mapped brightness.
    // Mix toward white at high brightness to simulate phosphor saturation.
    vec3 beamHue = line.rgb / (luma + 0.001);
    gl_FragColor.rgb = mix(beamHue, vec3(1.0), uWhitePoint + tlight2 * tlight2 * 0.5) * tlight;
    gl_FragColor.a = 1.0;
}
