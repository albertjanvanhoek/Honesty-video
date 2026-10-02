// The film's look, from the mood board (docs/moodboard.webp): a cinematic journey from a rainy
// night to a golden sunrise over wide, layered landscapes. The landscape is one WebGL shader; the
// camera glides over it faster when the music has more energy. Pure function of song time.
import * as THREE from 'three';

/** Palette from the mood board's swatch strip, plus a few working tones (sRGB hex). */
export const PALETTE = {
  charcoal: 0x172429,
  slate: 0x222627,
  stone: 0x71716f,
  sand: 0x9e8f7f,
  ochre: 0xbb8e5e,
  amber: 0xcd924f,
  peach: 0xe39c74,
  // working tones
  paper: 0xe9e1d2,
  cream: 0xf4ece0,
  ink: 0x14100c,
  brass: 0xc79a52,
  needle: 0xd9583e,
  frost: 0xd8e4ec,
} as const;

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const vec3 = (c: number) => {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  return `vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})`;
};

export const CSS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, hex(v)])
) as Record<keyof typeof PALETTE, string>;

const LANDSCAPE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float t;
uniform float phase;   // 0 rainy night → 0.2 storm → 0.4 blue hour → 0.6 dawn → 0.8 sunrise → 1 golden hour
uniform float rain;    // 0..1
uniform float city;    // 0..1 the night city skyline instead of the far hills
uniform float flight;  // distance travelled
uniform float kick;    // 0..1 kick pulse
uniform float drop;    // 0..1 how much drop the music is in
uniform float flash;   // 0..1 lightning / light burst

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float hash1(float x) { return fract(sin(x * 91.17) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
  return v;
}
float ridge(float x, float seed) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int k = 0; k < 5; k++) { v += a * (1.0 - abs(vnoise(vec2(x * f, seed)) * 2.0 - 1.0)); f *= 2.1; a *= 0.48; }
  return v;
}

// the sky's two key colours along the journey
vec3 skyTop(float p) {
  vec3 c = mix(vec3(0.035, 0.055, 0.07), vec3(0.07, 0.09, 0.11), smoothstep(0.0, 0.2, p));
  c = mix(c, vec3(0.09, 0.15, 0.22), smoothstep(0.2, 0.4, p));
  c = mix(c, vec3(0.17, 0.20, 0.29), smoothstep(0.4, 0.6, p));
  c = mix(c, vec3(0.26, 0.31, 0.40), smoothstep(0.6, 0.8, p));
  c = mix(c, vec3(0.38, 0.40, 0.46), smoothstep(0.8, 1.0, p));
  return c;
}
vec3 skyHorizon(float p) {
  vec3 c = mix(vec3(0.10, 0.14, 0.17), vec3(0.20, 0.23, 0.25), smoothstep(0.0, 0.2, p));
  c = mix(c, vec3(0.33, 0.40, 0.47), smoothstep(0.2, 0.4, p));
  c = mix(c, ${vec3(PALETTE.peach)} * 0.85, smoothstep(0.4, 0.6, p));
  c = mix(c, ${vec3(PALETTE.peach)}, smoothstep(0.6, 0.8, p));
  c = mix(c, vec3(0.96, 0.72, 0.42), smoothstep(0.8, 1.0, p));
  return c;
}

vec3 sky(vec2 uv, vec2 sun, float sunUp) {
  float h = clamp((uv.y - 0.28) / 0.72, 0.0, 1.0);
  vec3 col = mix(skyHorizon(phase), skyTop(phase), pow(h, 0.7));
  // the city's sodium glow on the horizon
  col += vec3(0.55, 0.33, 0.15) * exp(-pow((uv.y - 0.33) / 0.09, 2.0)) * city * 0.45;
  // stars at night
  float stars = step(0.9975, hash(floor(uv * vec2(900.0, 500.0)))) * (1.0 - smoothstep(0.15, 0.45, phase)) * (1.0 - rain * 0.8);
  col += stars * 0.6 * h;
  // sun: disk and wide glow
  vec2 d = (uv - sun) * vec2(1.7778, 1.0);
  float r = length(d);
  vec3 sunCol = mix(${vec3(PALETTE.peach)}, vec3(1.0, 0.86, 0.6), smoothstep(0.7, 1.0, phase));
  col += sunCol * (0.55 * exp(-r * 5.0) + 0.25 * exp(-r * 1.6)) * sunUp * (1.0 + 0.6 * kick * drop);
  col = mix(col, vec3(1.0, 0.93, 0.78), smoothstep(0.045, 0.035, r) * sunUp);
  // clouds, lit from the sun's side
  float cl = fbm(vec2(uv.x * 2.4 + flight * 0.15 + t * 0.006, uv.y * 5.0));
  float cloud = smoothstep(0.48, 0.78, cl) * smoothstep(0.32, 0.6, uv.y);
  vec3 cloudCol = mix(vec3(0.05, 0.07, 0.08), mix(${vec3(PALETTE.stone)} * 0.7, ${vec3(PALETTE.peach)}, smoothstep(0.45, 0.9, phase)), smoothstep(0.1, 0.7, phase));
  cloudCol += sunCol * 0.35 * exp(-r * 3.0) * sunUp;
  col = mix(col, cloudCol, cloud * mix(0.85, 0.55, phase));
  return col;
}

void main() {
  vec2 uv = vUv;
  float sunUp = smoothstep(0.45, 0.85, phase);
  vec2 sun = vec2(0.64, mix(0.22, 0.46, sunUp));

  vec3 col = sky(uv, sun, sunUp);
  vec3 hor = skyHorizon(phase);

  // the lake reflects the sky, broken up by ripples
  float shore = 0.2;
  if (uv.y < shore) {
    float ripple = (vnoise(vec2(uv.x * 40.0, uv.y * 260.0 - t * 0.6)) - 0.5) * 0.02 * (1.0 + rain);
    vec2 ruv = vec2(uv.x + ripple, shore + (shore - uv.y) * 1.4);
    vec3 refl = sky(ruv, sun, sunUp);
    col = mix(refl * 0.6, ${vec3(PALETTE.charcoal)}, 0.35);
    // the sun's glitter path on the water
    float path = exp(-pow((uv.x - sun.x) * 9.0, 2.0)) * step(0.5, vnoise(vec2(uv.x * 120.0, uv.y * 400.0 + t)));
    col += vec3(1.0, 0.8, 0.55) * path * 0.35 * sunUp;
  }

  // layered ridges: far and pale (atmospheric perspective) to near and dark
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float depth = fi / 3.0;
    float speed = mix(0.25, 1.6, depth);
    float base = mix(0.36, 0.19, depth);
    float amp = mix(0.20, 0.17, depth);
    float x = uv.x * mix(0.9, 2.2, depth) + flight * speed + fi * 13.7;
    float hgt = base + amp * pow(ridge(x, fi * 3.1), 1.6);
    if (i == 0) {
      // the night city: block buildings with lit windows, fading out as the journey begins
      float bx = floor(uv.x * 46.0 + flight * 4.0);
      float bh = 0.30 + 0.16 * hash1(bx) + 0.06 * step(0.85, hash1(bx + 7.0));
      hgt = mix(hgt, bh, city);
      if (city > 0.01 && uv.y < hgt) { col = mix(col, ${vec3(PALETTE.charcoal)} * 0.5, city); }
    }
    if (uv.y < hgt && uv.y > shore - 0.002) {
      // near layers are backlit silhouettes; far layers fade into the horizon haze
      vec3 near = ${vec3(PALETTE.charcoal)} * mix(0.45, 0.8, phase);
      vec3 rc = mix(mix(hor, near, 0.35), near, pow(depth, 0.8));
      // warm rim light along the crest when the sun is up
      rc += vec3(1.0, 0.7, 0.4) * smoothstep(hgt - 0.012, hgt, uv.y) * sunUp * 0.25 * (1.0 - depth * 0.5);
      if (i == 0 && city > 0.01) {
        rc = mix(rc, ${vec3(PALETTE.charcoal)} * 0.45, city);
        vec2 w = vec2(uv.x * 46.0 + flight * 4.0, uv.y * 120.0);
        float lit = step(0.72, hash(floor(w * vec2(3.0, 1.0)))) * step(0.3, fract(w.x * 3.0)) * step(0.35, fract(w.y));
        rc += vec3(1.0, 0.75, 0.4) * lit * 0.6 * city;
      }
      col = rc;
    }
  }

  // mist over the water and in the valleys
  float mist = exp(-pow((uv.y - 0.22) / 0.07, 2.0)) * (0.35 + 0.3 * fbm(vec2(uv.x * 3.0 + t * 0.02, t * 0.01)));
  col = mix(col, hor * 1.05, mist * mix(0.5, 0.8, smoothstep(0.3, 0.7, phase)));

  // rain: thin, slanted streaks that jolt on the kick
  if (rain > 0.01) {
    vec2 rp = vec2(uv.x * 1.7778 * 90.0 + uv.y * 18.0, uv.y * 7.0 + t * 9.0 + kick * 0.6);
    vec2 cell = floor(rp);
    float streak = step(0.92, hash(cell)) * smoothstep(0.0, 0.4, fract(rp.y)) * (1.0 - smoothstep(0.4, 1.0, fract(rp.y)));
    streak *= smoothstep(0.35, 0.5, fract(rp.x)) * (1.0 - smoothstep(0.5, 0.65, fract(rp.x)));
    col += vec3(0.6, 0.68, 0.75) * streak * 0.22 * rain;
    col = mix(col, col * vec3(0.85, 0.9, 0.95), rain * 0.25);
  }

  // light bursts: lightning in the storm, a warm flash when a drop lands
  col += mix(vec3(0.6, 0.7, 0.85), vec3(1.0, 0.8, 0.55), smoothstep(0.3, 0.6, phase)) * flash * 0.35;
  // the frenchcore pulse: every kick lifts the light a little
  col *= 1.0 + 0.08 * kick * drop;

  // vignette
  float v = length((uv - 0.5) * vec2(1.15, 1.0));
  col *= mix(1.0, 0.55, smoothstep(0.4, 0.9, v));
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export interface LandscapeState {
  t: number; phase: number; rain: number; city: number; flight: number; kick: number; drop: number; flash: number;
}

export class Landscape {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: LANDSCAPE_FRAG,
      uniforms: {
        t: { value: 0 }, phase: { value: 0 }, rain: { value: 0 }, city: { value: 0 },
        flight: { value: 0 }, kick: { value: 0 }, drop: { value: 0 }, flash: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
  }

  update(s: LandscapeState): void {
    const u = this.material.uniforms;
    for (const k of Object.keys(s) as Array<keyof LandscapeState>) u[k].value = s[k];
  }
}

/** Seeded PRNG, so the grain is the same in every render. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Film grain over the whole frame, text included: a CSS layer showing a seeded noise tile
 * whose offset changes 24 times a second, keyed to song time.
 */
export class Grain {
  private readonly el: HTMLDivElement;

  constructor(parent: Element) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const rand = mulberry32(1);
    for (let i = 0; i < size * size; i++) {
      const v = Math.floor(128 + (rand() + rand() - 1) * 110);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.el = document.createElement('div');
    this.el.id = 'grain';
    this.el.style.backgroundImage = `url(${canvas.toDataURL()})`;
    parent.appendChild(this.el);
  }

  update(t: number): void {
    const seeded = mulberry32(Math.floor(t * 24) * 9973 + 11);
    this.el.style.backgroundPosition = `${Math.floor(seeded() * 256)}px ${Math.floor(seeded() * 256)}px`;
  }
}
