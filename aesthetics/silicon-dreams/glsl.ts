/**
 * The renderer, as shaders. GLSL ES 3.00 for a RawShaderMaterial (three prepends the
 * `#version` line and nothing else).
 *
 * TRACE is a real ray tracer, not a raymarched approximation of one: spheres, boxes and
 * the floor are intersected analytically, and only the three implicit objects (the
 * blobs, the vase, the torus) are sphere-traced, each inside its own bounding sphere.
 * Reflection and refraction recurse through a loop with a throughput, so the "bounces"
 * dial genuinely cuts the recursion off — mirrors go black at the depth you allow.
 *
 * Every frame adds one sample to an accumulation buffer. Sub-pixel jitter, a jittered
 * point on the area light and a Fresnel coin-flip at glass all converge as samples
 * pile up: anti-aliasing, soft shadows and glass that both reflects and refracts. That
 * is the progressive refinement every renderer of the period showed you while you
 * waited, and it is also what lets a still frame end up far better than any one pass.
 *
 * The world: four pools of light on one polished black marble floor, 16 units apart
 * along x, in a void. Each pool is one landmark image of 1980s rendering research.
 */

import { TRACE_SHADE } from "./trace-shade";
import { TRACE_WORLD } from "./trace-world";

export const VERT = /* glsl */ `
precision highp float;
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const TRACE = TRACE_WORLD + TRACE_SHADE;

/** Accumulated linear light -> the screen. Also draws the scanline reveal. */
export const DISPLAY = /* glsl */ `
precision highp float;
uniform sampler2D uAcc;
uniform sampler2D uFront;
uniform vec2 uOut;
uniform float uReveal;
uniform float uExposure;
out vec4 fragColor;

vec3 film(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  float row = 1.0 - uv.y;
  vec3 c;
  if (uReveal >= 0.0 && row > uReveal) {
    c = film(texture(uFront, uv).rgb);
  } else {
    c = film(texture(uAcc, uv).rgb);
  }
  c = pow(c, vec3(1.0 / 2.2));
  // The line being written, brighter than the finished ones.
  if (uReveal >= 0.0 && uReveal < 1.0) {
    float d = abs(row - uReveal) * uOut.y;
    c += vec3(0.55, 0.6, 0.62) * smoothstep(1.6, 0.0, d);
  }
  fragColor = vec4(c, 1.0);
}
`;

export const COPY = /* glsl */ `
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uOut;
out vec4 fragColor;
void main() { fragColor = texture(uSrc, gl_FragCoord.xy / uOut); }
`;
