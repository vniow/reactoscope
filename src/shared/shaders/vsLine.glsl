// Vertex shader for rendering line segments as quads
precision highp float;
#define EPS 1E-6

uniform float uSize;       // Line thickness

attribute vec2 aStart, aEnd;
attribute float aIdx;

// xy: quad orientation and side, z: segment length, w: segment index
varying vec4 uvl;

void main() {
	float idx = mod(aIdx, 4.0);

    // Determine position and tangent from vertex index
	vec2 current = (idx >= 2.0) ? aEnd : aStart;
	float tang = (idx >= 2.0) ? 1.0 : -1.0;

    // Side alternates between -1 and 1
	float side = (mod(idx, 2.0) - 0.5) * 2.0;

    // Pack values for fragment shader
	uvl.xy = vec2(tang, side);
	uvl.w = floor(aIdx / 4.0 + 0.5);  // segment index

    // Calculate direction and segment length
	vec2 dir = aEnd - aStart;
	uvl.z = length(dir);

    // Normalize direction if not too short
	if(uvl.z > EPS) {
		dir = dir / uvl.z;
	} else {
		dir = vec2(1.0, 0.0);  // Default direction
	}

    // Calculate normal vector (perpendicular)
	vec2 norm = vec2(-dir.y, dir.x);

    // Calculate final position (always inverted on Y-axis)
	gl_Position = vec4((current + (tang * dir + norm * side) * uSize) * -1.0, 0.0, 1.0);
}
