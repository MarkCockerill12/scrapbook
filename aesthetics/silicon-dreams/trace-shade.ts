/**
 * The ray tracer, part two: what a hit looks like. Materials (including Perlin's four),
 * the environment, direct light, and main() — the recursion loop and the accumulation.
 */
export const TRACE_SHADE = /* glsl */ `
// --- materials -----------------------------------------------------------------------
struct Mat {
  vec3 alb;
  float spec;
  float shin;
  float f0;     // clear-coat reflectance at normal incidence; 0 = no reflection ray
  vec3 tint;    // for mirrors: the colour of the reflection
  int kind;     // 0 dielectric-coated, 1 metal mirror, 2 glass, 3 emissive
  vec3 emit;
};

/** Warm grey marble: a soft cloud, one family of grey veins. One fbm, not two. */
vec3 floorMarble(vec3 p) {
  float n = fbm(p * 0.9);
  float v = 1.0 - abs(sin(p.x * 0.7 + p.z * 0.4 + n * 3.6));
  float vein = pow(v, 5.0) * 0.55 + pow(v, 36.0) * 0.35;
  vec3 stone = mix(vec3(0.46, 0.43, 0.4), vec3(0.36, 0.34, 0.33), smoothstep(0.35, 0.7, n));
  return mix(stone, vec3(0.13, 0.13, 0.14), clamp(vein, 0.0, 1.0));
}

/**
 * Perlin's four, applied to the vase and the torus. May bend the normal (bump).
 * Exactly one fbm call site per path: every call is inlined by the HLSL compiler, and
 * this function alone used to cost five of the shader's seven seconds to compile.
 */
Mat procedural(vec3 p, inout vec3 n) {
  Mat m;
  m.kind = 0;
  m.tint = vec3(1.0);
  m.emit = vec3(0.0);
  vec3 q = uTex == 1 ? (p - vec3(48.0, 0.0, 0.0)) * vec3(1.0, 0.25, 1.0) : p;
  float sc = uTex == 0 ? 1.8 : uTex == 1 ? 2.2 : uTex == 2 ? 9.0 : 7.0;
  if (uTex == 3) {
    // Bump-mapped: the surface is smooth; only the normal is told otherwise.
    float b0 = 0.0;
    vec3 gr = vec3(0.0);
    for (int i = 0; i < 4 + uZero; i++) {
      vec3 o = i == 1 ? vec3(0.07, 0.0, 0.0) : i == 2 ? vec3(0.0, 0.07, 0.0) : i == 3 ? vec3(0.0, 0.0, 0.07) : vec3(0.0);
      float f = fbm(q * sc + o);
      if (i == 0) b0 = f;
      else gr[i - 1] = f;
    }
    gr = (gr - b0) / 0.07;
    n = normalize(n - (gr - n * dot(gr, n)) * 0.45);
    m.alb = vec3(0.6, 0.55, 0.78);
    m.spec = 0.9; m.shin = 200.0; m.f0 = 0.06;
    return m;
  }
  float f = fbm(q * sc);
  if (uTex == 0) {
    // Carrara: white stone, grey veins, polished.
    float vein = pow(1.0 - abs(sin(p.y * 2.2 + f * 6.0)), 9.0);
    m.alb = mix(vec3(0.82, 0.8, 0.76), vec3(0.28, 0.29, 0.32), vein * 0.85);
    m.spec = 0.6; m.shin = 120.0; m.f0 = 0.05;
  } else if (uTex == 1) {
    float r = length(q.xz * vec2(1.0, 0.35)) * 7.0 + f * 1.6;
    float ring = smoothstep(0.15, 0.85, abs(fract(r) * 2.0 - 1.0));
    m.alb = mix(vec3(0.36, 0.17, 0.06), vec3(0.62, 0.36, 0.15), ring) * (0.85 + 0.3 * vnoise(q * vec3(40.0, 4.0, 40.0)));
    m.spec = 0.35; m.shin = 60.0; m.f0 = 0.035;
  } else {
    // Granite: three minerals and a speckle.
    vec3 c = mix(vec3(0.55, 0.42, 0.4), vec3(0.18, 0.17, 0.19), smoothstep(0.45, 0.55, f));
    c = mix(c, vec3(0.86, 0.84, 0.8), smoothstep(0.72, 0.78, vnoise(p * 38.0)));
    c = mix(c, vec3(0.03), smoothstep(0.8, 0.86, vnoise(p * 61.0 + 7.0)));
    m.alb = c; m.spec = 0.5; m.shin = 90.0; m.f0 = 0.045;
  }
  return m;
}

const vec3 BALL_COL[7] = vec3[7](
  vec3(0.86, 0.84, 0.78), vec3(0.88, 0.62, 0.04), vec3(0.04, 0.12, 0.55),
  vec3(0.68, 0.04, 0.03), vec3(0.28, 0.05, 0.42), vec3(0.9, 0.28, 0.03), vec3(0.03, 0.33, 0.12));

Mat material(int id, vec3 p, inout vec3 n) {
  Mat m;
  m.kind = 0;
  m.tint = vec3(1.0);
  m.emit = vec3(0.0);
  m.spec = 0.0;
  m.shin = 32.0;
  m.f0 = 0.0;
  m.alb = vec3(0.5);
  if (id == M_FLOOR) {
    m.alb = floorMarble(p * 0.55);
    m.spec = 0.35; m.shin = 220.0; m.f0 = 0.04;
  } else if (id == M_GLASS) {
    m.kind = 2; m.spec = 1.6; m.shin = 900.0;
  } else if (id == M_GOLD) {
    m.kind = 1; m.tint = vec3(1.0, 0.77, 0.34); m.spec = 1.4; m.shin = 600.0;
  } else if (id == M_BEAD) {
    m.alb = vec3(0.05, 0.1, 0.5); m.spec = 0.8; m.shin = 160.0; m.f0 = 0.05;
  } else if (id == M_BLOB) {
    m.alb = vec3(0.72, 0.05, 0.035); m.spec = 1.0; m.shin = 180.0; m.f0 = 0.05;
  } else if (id == M_FELT) {
    m.alb = vec3(0.03, 0.22, 0.11) * (0.85 + 0.3 * vnoise(p * 90.0));
  } else if (id == M_RAIL) {
    // Grain runs the length of each rail: along x for the long ones, z for the short.
    bool shortRail = abs(p.x - 32.0) > 2.35;
    vec3 q = shortRail ? p.zyx : p;
    float g = fract((q.z * 0.7 + q.y) * 16.0 + fbm(q * vec3(0.5, 6.0, 6.0)) * 2.4);
    m.alb = mix(vec3(0.28, 0.12, 0.04), vec3(0.5, 0.26, 0.1), smoothstep(0.1, 0.6, g) * smoothstep(1.0, 0.7, g));
    m.spec = 0.5; m.shin = 80.0; m.f0 = 0.04;
  } else if (id == M_VASE || id == M_TORUS) {
    vec3 q = id == M_TORUS ? torusLocal(p) + TOR : p;
    m = procedural(q, n);
  } else if (id == M_LIGHT) {
    m.kind = 3;
    m.emit = vec3(1.0, 0.95, 0.86) * 14.0;
  } else if (id >= M_BALL) {
    m.alb = BALL_COL[id - M_BALL];
    m.spec = 1.0; m.shin = 260.0; m.f0 = 0.05;
  }
  return m;
}

vec3 env(vec3 rd) {
  vec3 c = mix(vec3(0.0), vec3(0.03, 0.026, 0.06), smoothstep(-0.05, 0.75, rd.y));
  // One big softbox high up behind the camera, so curved things have something to show.
  float s = dot(rd, normalize(vec3(-0.35, 0.8, 0.5)));
  c += vec3(0.9, 0.88, 0.82) * 0.55 * smoothstep(0.975, 0.992, s);
  return c;
}

vec3 directLight(vec3 p, vec3 n, vec3 rd, Mat m, int v, bool diffuse) {
  vec3 lc = lightPos(v);
  vec3 lp = lc;
  if (uStoch > 0.5) lp += rndSphere() * lightRad(v);
  vec3 L = lp - p;
  float d2 = dot(L, L);
  float d = sqrt(d2);
  L /= d;
  float nl = dot(n, L);
  if (nl <= 0.0) return vec3(0.0);
  // A spot, not a bulb: a pool of light on the floor and darkness past it.
  vec3 axis = normalize(vistaC(v) + vec3(0.0, 0.5, 0.0) - lc);
  float cone = smoothstep(0.6, 0.9, dot(-L, axis));
  if (cone <= 0.0) return vec3(0.0);
  float sh = shadow(p + n * 0.003, L, d);
  if (sh <= 0.0) return vec3(0.0);
  vec3 I = vec3(1.0, 0.95, 0.88) * 75.0 / d2 * cone * sh;
  vec3 H = normalize(L - rd);
  float s = pow(max(dot(n, H), 0.0), m.shin) * m.spec;
  return I * nl * ((diffuse ? m.alb / PI : vec3(0.0)) + s);
}

void main() {
  rs = uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(uSeed) * 26699u | 1u;
  vec2 fc = uBlock > 1.0 ? (floor(gl_FragCoord.xy / uBlock) + 0.5) * uBlock : gl_FragCoord.xy + uJitter;
  vec2 uv = fc / uRes * 2.0 - 1.0;
  uv.x *= uAspect;
  vec3 fw = normalize(uCamTgt - uCamPos);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 ro = uCamPos;
  vec3 rd = normalize(fw + (uv.x * rt + uv.y * up) * uTanFov);

  vec3 col = vec3(0.0);
  vec3 thr = vec3(1.0);
  bool lamps = false;
  int budget = uBounces;
  for (int b = 0; b < 12 + uZero; b++) {
    Hit h = trace(ro, rd, lamps);
    if (h.t < 0.0) {
      col += thr * env(rd);
      break;
    }
    vec3 p = ro + rd * h.t;
    // The void swallows distance; the next pool along is a glow, the one after is gone.
    thr *= exp(-h.t * 0.045);
    vec3 n = h.n;
    Mat m = material(h.m, p, n);
    int v = vistaOf(p);

    if (m.kind == 3) {
      col += thr * m.emit;
      break;
    }

    // One light evaluation per hit, whatever the material: written once so the shader
    // compiler inlines the shadow marches once (ANGLE's HLSL compile time is the cost).
    bool inside = m.kind == 2 && dot(rd, n) > 0.0;
    vec3 nn = inside ? -n : n;
    float F = m.f0 > 0.0 ? m.f0 + (1.0 - m.f0) * pow(1.0 - max(dot(nn, -rd), 0.0), 5.0) : 0.0;
    if (!inside) {
      vec3 dl = directLight(p, nn, rd, m, v, m.kind == 0);
      col += thr * (m.kind == 0 ? (dl + m.alb * 0.012) * (1.0 - F) : dl);
    }

    if (m.kind == 2) {
      float eta = inside ? uIor : 1.0 / uIor;
      float cosi = clamp(dot(-rd, nn), 0.0, 1.0);
      float f0 = pow((1.0 - uIor) / (1.0 + uIor), 2.0);
      F = f0 + (1.0 - f0) * pow(1.0 - cosi, 5.0);
      vec3 rr = refract(rd, nn, eta);
      bool tir = dot(rr, rr) < 1e-6;
      bool reflectIt = tir || (uStoch > 0.5 && rnd() < F);
      if (reflectIt) {
        rd = reflect(rd, nn);
        ro = p + nn * 0.003;
      } else {
        if (uStoch < 0.5) {
          col += thr * F * env(reflect(rd, nn));
          thr *= 1.0 - F;
        }
        if (!inside) thr *= vec3(0.93, 0.97, 1.0);
        rd = rr;
        ro = p - nn * 0.003;
      }
      lamps = true;
      continue;
    }

    if (m.kind == 1) {
      thr *= m.tint;
      budget--;
      if (budget < 0) break;
      ro = p + n * 0.003;
      rd = reflect(rd, n);
      lamps = true;
      continue;
    }

    budget--;
    if (F <= 0.002 || budget < 0) break;
    thr *= F;
    ro = p + n * 0.003;
    rd = reflect(rd, n);
    if (uStoch > 0.5 && h.m == M_FLOOR) rd = normalize(rd + rndSphere() * 0.025);
    lamps = h.m != M_FLOOR;
  }

  // clamp also scrubs NaN on every driver that matters; isnan() gets optimised out on D3D
  col = clamp(col, vec3(0.0), vec3(6.0));
  vec3 prev = texture(uPrev, gl_FragCoord.xy / uRes).rgb;
  fragColor = vec4(mix(prev, col, uAlpha), 1.0);
}
`;
