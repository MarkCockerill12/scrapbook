/**
 * The ray tracer, part one: what exists and how a ray finds it. Uniforms, the four
 * vistas' geometry, noise, the implicit surfaces and every intersection routine, plus
 * the shadow query. Joined with trace-shade.ts into one fragment shader (glsl.ts).
 */
export const TRACE_WORLD = /* glsl */ `
precision highp float;
precision highp int;

uniform vec2 uRes;
uniform vec3 uCamPos;
uniform vec3 uCamTgt;
uniform float uTanFov;
uniform float uAspect;
uniform vec2 uJitter;
uniform float uSeed;
uniform float uTime;
uniform vec3 uLight;
uniform float uLightR;
uniform int uActive;
uniform float uIor;
uniform int uBounces;
uniform vec3 uBalls[7];
uniform vec4 uBlob;
uniform int uTex;
uniform float uStoch;
uniform float uBlock;
uniform float uAlpha;
uniform sampler2D uPrev;
/**
 * Always 0. Added to loop bounds so the HLSL compiler (ANGLE on Windows) cannot treat
 * them as constants and unroll each loop at every place it gets inlined.
 */
uniform int uZero;

out vec4 fragColor;

const float PI = 3.14159265;
const vec3 C1 = vec3(0.0, 0.0, 0.0);
const vec3 C2 = vec3(16.0, 0.0, 0.0);
const vec3 C3 = vec3(32.0, 0.0, 0.0);
const vec3 C4 = vec3(48.0, 0.0, 0.0);

// --- vista I: Whitted -------------------------------------------------------
const vec4 GLASS = vec4(-0.95, 1.05, 0.35, 1.0);
const vec4 GOLD = vec4(1.35, 0.85, -0.7, 0.85);
const vec4 BEAD = vec4(0.35, 0.32, 1.45, 0.32);
// --- vista III: Cook ----------------------------------------------------------
const float BALL_R = 0.13;
const vec3 SLAB_C = vec3(32.0, 0.06, 0.0);
const vec3 SLAB_H = vec3(2.3, 0.06, 1.35);
// --- vista IV: Perlin ---------------------------------------------------------
const vec3 VASE = vec3(47.15, 0.0, 0.15);
const vec3 TOR = vec3(49.3, 1.0, -0.25);
// --- vista II: Blinn ----------------------------------------------------------
const vec3 BLOB_C = vec3(16.0, 1.35, 0.0);

const int M_FLOOR = 1;
const int M_GLASS = 2;
const int M_GOLD = 3;
const int M_BEAD = 4;
const int M_BLOB = 5;
const int M_FELT = 6;
const int M_RAIL = 7;
const int M_VASE = 8;
const int M_TORUS = 9;
const int M_LIGHT = 10;
const int M_BALL = 20;

// ---------------------------------------------------------------------------
uint rs;
float rnd() {
  rs = rs * 747796405u + 2891336453u;
  uint w = ((rs >> ((rs >> 28u) + 4u)) ^ rs) * 277803737u;
  return float((w >> 22u) ^ w) / 4294967295.0;
}
vec3 rndSphere() {
  float z = rnd() * 2.0 - 1.0;
  float a = rnd() * 2.0 * PI;
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(a), r * sin(a), z) * pow(rnd(), 0.3333);
}

float h31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5 + uZero; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

// --- lights -------------------------------------------------------------------
vec3 vistaC(int v) {
  return v == 0 ? C1 : v == 1 ? C2 : v == 2 ? C3 : C4;
}
int vistaOf(vec3 p) {
  return int(clamp(floor((p.x + 8.0) / 16.0), 0.0, 3.0));
}
vec3 lightPos(int v) {
  return v == uActive ? uLight : vistaC(v) + vec3(2.2, 6.0, 3.2);
}
float lightRad(int v) {
  return v == uActive ? uLightR : 0.5;
}

// --- implicit surfaces ----------------------------------------------------------
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
vec3 blobPos(int i) {
  float f = float(i);
  float t = uTime;
  return BLOB_C + vec3(
    sin(t * (0.43 + 0.11 * f) + f * 1.7) * 0.95,
    sin(t * (0.37 + 0.07 * f) + f * 2.9) * 0.5,
    cos(t * (0.31 + 0.09 * f) + f * 0.8) * 0.7);
}
float sdBlob(vec3 p) {
  float d = 1e9;
  for (int i = 0; i < 5 + uZero; i++) d = smin(d, length(p - blobPos(i)) - (0.42 + 0.08 * float(i % 3)), 0.8);
  if (uBlob.w > 0.5) d = smin(d, length(p - uBlob.xyz) - 0.46, 0.8);
  return d;
}
float vaseR(float y) {
  return 0.42 + 0.26 * sin(y * 2.0 - 0.6) + 0.12 * smoothstep(1.75, 2.2, y);
}
float sdVase(vec3 p) {
  vec3 q = p - VASE;
  float r = length(q.xz);
  float R = vaseR(clamp(q.y, 0.0, 2.2));
  float d = (r - R) * 0.7;
  d = max(d, -q.y);
  d = max(d, q.y - 2.2);
  // hollow from the shoulder up, so the mouth is a mouth and not a lid
  float cavity = max((r - (R - 0.045)) * 0.7, 1.0 - q.y);
  return max(d, -cavity);
}
vec3 torusLocal(vec3 p) {
  vec3 q = p - TOR;
  float a = 0.95;
  q.yz = mat2(cos(a), -sin(a), sin(a), cos(a)) * q.yz;
  float b = 0.45;
  q.xy = mat2(cos(b), -sin(b), sin(b), cos(b)) * q.xy;
  return q;
}
float sdTorus(vec3 p) {
  vec3 q = torusLocal(p);
  return length(vec2(length(q.xz) - 0.62, q.y)) - 0.27;
}
float sdObj(int o, vec3 p) {
  return o == 0 ? sdBlob(p) : o == 1 ? sdVase(p) : sdTorus(p);
}
vec4 objBound(int o) {
  if (o == 0) return vec4(BLOB_C, uBlob.w > 0.5 ? 2.9 : 2.4);
  if (o == 1) return vec4(VASE + vec3(0.0, 1.1, 0.0), 1.45);
  return vec4(TOR, 0.95);
}
vec3 objNormal(int o, vec3 p) {
  // tetrahedral gradient, as a loop so the SDF is emitted once rather than four times
  vec3 n = vec3(0.0);
  for (int i = 0; i < 4 + uZero; i++) {
    vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e * sdObj(o, p + e * 0.0015);
  }
  return normalize(n);
}

// --- intersection ------------------------------------------------------------------
vec2 iSphere2(vec3 ro, vec3 rd, vec4 s) {
  vec3 oc = ro - s.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - s.w * s.w;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
float iSphere(vec3 ro, vec3 rd, vec4 s) {
  vec2 t = iSphere2(ro, rd, s);
  if (t.y < 1e-3) return -1.0;
  return t.x > 1e-3 ? t.x : t.y;
}
float iBox(vec3 ro, vec3 rd, vec3 c, vec3 h, out vec3 n) {
  vec3 m = 1.0 / rd;
  vec3 o = ro - c;
  vec3 k = abs(m) * h;
  vec3 t1 = -m * o - k;
  vec3 t2 = -m * o + k;
  float tn = max(max(t1.x, t1.y), t1.z);
  float tf = min(min(t2.x, t2.y), t2.z);
  if (tn > tf || tf < 1e-3) return -1.0;
  n = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return tn > 1e-3 ? tn : -1.0;
}
float march(int o, vec3 ro, vec3 rd, float tmax, int steps) {
  vec4 b = objBound(o);
  vec2 bt = iSphere2(ro, rd, b);
  if (bt.y < 1e-3 || bt.x > tmax) return -1.0;
  float t = max(bt.x, 1e-3);
  float te = min(bt.y, tmax);
  for (int i = 0; i < steps + uZero; i++) {
    float d = sdObj(o, ro + rd * t);
    if (d < 0.0012 * max(t, 1.0)) return t;
    t += d;
    if (t > te) break;
  }
  return -1.0;
}

struct Hit {
  float t;
  int m;
  vec3 n;
};

void trySphere(vec3 ro, vec3 rd, vec4 s, int m, inout Hit h) {
  float t = iSphere(ro, rd, s);
  if (t > 0.0 && t < h.t) {
    h.t = t;
    h.m = m;
    h.n = (ro + rd * t - s.xyz) / s.w;
  }
}
void tryBox(vec3 ro, vec3 rd, vec3 c, vec3 hs, int m, inout Hit h) {
  vec3 n;
  float t = iBox(ro, rd, c, hs, n);
  if (t > 0.0 && t < h.t) {
    h.t = t;
    h.m = m;
    h.n = n;
  }
}

Hit trace(vec3 ro, vec3 rd, bool lamps) {
  Hit h;
  h.t = 1e9;
  h.m = 0;
  h.n = vec3(0.0, 1.0, 0.0);
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    if (t > 1e-3) {
      h.t = t;
      h.m = M_FLOOR;
    }
  }
  trySphere(ro, rd, GLASS, M_GLASS, h);
  trySphere(ro, rd, GOLD, M_GOLD, h);
  trySphere(ro, rd, BEAD, M_BEAD, h);
  for (int i = 0; i < 7 + uZero; i++) trySphere(ro, rd, vec4(uBalls[i], BALL_R), M_BALL + i, h);
  tryBox(ro, rd, SLAB_C, SLAB_H, M_FELT, h);
  tryBox(ro, rd, vec3(32.0, 0.12, 1.47), vec3(2.54, 0.12, 0.12), M_RAIL, h);
  tryBox(ro, rd, vec3(32.0, 0.12, -1.47), vec3(2.54, 0.12, 0.12), M_RAIL, h);
  tryBox(ro, rd, vec3(34.42, 0.12, 0.0), vec3(0.12, 0.12, 1.35), M_RAIL, h);
  tryBox(ro, rd, vec3(29.58, 0.12, 0.0), vec3(0.12, 0.12, 1.35), M_RAIL, h);
  // The lamps are only seen in reflections off the objects, the way a studio light is —
  // never directly, and never mirrored in the floor, where they read as floating orbs.
  if (lamps) {
    for (int v = 0; v < 4 + uZero; v++) trySphere(ro, rd, vec4(lightPos(v), lightRad(v)), M_LIGHT, h);
  }
  for (int o = 0; o < 3 + uZero; o++) {
    float t = march(o, ro, rd, h.t, 90);
    if (t > 0.0 && t < h.t) {
      h.t = t;
      h.m = o == 0 ? M_BLOB : o == 1 ? M_VASE : M_TORUS;
      h.n = objNormal(o, ro + rd * t);
    }
  }
  if (h.t >= 1e9) h.t = -1.0;
  return h;
}

/** Transmittance towards a light: 0 blocked, 1 clear. Glass lets most of it through. */
float shadow(vec3 ro, vec3 rd, float dist) {
  float tr = 1.0;
  vec3 n;
  float t = iSphere(ro, rd, GLASS);
  if (t > 0.0 && t < dist) tr *= 0.62;
  t = iSphere(ro, rd, GOLD);
  if (t > 0.0 && t < dist) return 0.0;
  t = iSphere(ro, rd, BEAD);
  if (t > 0.0 && t < dist) return 0.0;
  for (int i = 0; i < 7 + uZero; i++) {
    t = iSphere(ro, rd, vec4(uBalls[i], BALL_R));
    if (t > 0.0 && t < dist) return 0.0;
  }
  t = iBox(ro, rd, SLAB_C, SLAB_H, n);
  if (t > 0.0 && t < dist) return 0.0;
  for (int o = 0; o < 3 + uZero; o++) {
    t = march(o, ro, rd, dist, 48);
    if (t > 0.0) return 0.0;
  }
  return tr;
}
`;
