precision highp float;
#define EPS 1E-6
uniform float uInvert;
uniform float uSize;
uniform float uGain;
uniform float uNEdges;
uniform float uFadeAmount;
uniform float uIntensity;
attribute vec2 aStart, aEnd;
attribute float aIdx;

// uvl packs four logically distinct values into one varying to stay within
// the GLSL ES 1.00 varying limit:
//   uvl.x  = local U: signed distance along the line direction from the start cap
//   uvl.y  = local V: signed distance perpendicular to the line (across width)
//   uvl.z  = line length in screen space (used as the integration bound in fsLine)
//   uvl.w  = per-edge intensity weight (fades older edges via uFadeAmount)
varying vec4 uvl;
varying vec2 vTexCoord;

void main () {
    float tang;
    vec2 current;
    float idx = mod(aIdx, 4.0);
    vec2 dir = (aEnd - aStart) * uGain;
    uvl.z = length(dir);
    if (uvl.z > EPS) {
        dir = dir / uvl.z;
    } else {
        dir = vec2(1.0, 0.0);
    }
    vec2 norm = vec2(-dir.y, dir.x);
    if (idx >= 2.0) {
        current = aEnd * uGain;
        tang = 1.0;
        uvl.x = -uSize;
    } else {
        current = aStart * uGain;
        tang = -1.0;
        uvl.x = uvl.z + uSize;
    }
    float side = (mod(idx, 2.0) - 0.5) * 2.0;
    uvl.y = side * uSize;
    uvl.w = uIntensity * mix(1.0 - uFadeAmount, 1.0,
                floor(aIdx / 4.0 + 0.5) / uNEdges);
    // uInvert is +1 or -1. When -1, it negates both X and Y — a 180° rotation
    // (point reflection through the origin), not an independent per-axis flip.
    vec4 pos = vec4((current + (tang * dir + norm * side) * uSize) * uInvert, 0.0, 1.0);
    gl_Position = pos;
    vTexCoord = 0.5 * pos.xy + 0.5;
}
