precision highp float;

varying vec2 vTexCoord;
void main(void) {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    vTexCoord = uv;
}
