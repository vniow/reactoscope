precision highp float;

// vTexCoord      — UV for effect textures (blur targets, CRT noise)
// vTexCoordCanvas — UV for lineRT, which uses the same space as vTexCoord
//                   (kept as a separate varying so aspect-ratio correction can
//                   be applied here in future without touching the fragment shader)
varying vec2 vTexCoord;
varying vec2 vTexCoordCanvas;

void main(void) {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    vTexCoord = uv;
    vTexCoordCanvas = uv;
}
