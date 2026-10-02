// The film's look: the same record-sleeve series as "Kindness Is Not Magic" (painted backdrop,
// cream paper, outlined vintage type, print grain), here in ink blue and brass, the colours of an
// old compass and a nautical chart. Everything here is a pure function of song time.
import * as THREE from 'three';

/** Palette (sRGB hex). See docs/STYLE_BIBLE.md. */
export const PALETTE = {
  deep: 0x141e2a,
  dark: 0x1d3045,
  mid: 0x2a445f,
  light: 0x3d5b78,
  haze: 0x5d7894,
  cream: 0xf3e6c8,
  paper: 0xeadbb8,
  brass: 0xd4a84f,
  honey: 0xb8914f,
  ground: 0x6b5236,
  brown: 0x5a3d22,
  ink: 0x1a120b,
  needle: 0xc4513a,
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

const BACKDROP_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float t;
uniform float beat;
uniform float ground;   // 0..1 how much of the ground strip is shown

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
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

void main() {
  vec2 uv = vUv;
  vec2 p = uv * vec2(1.7778, 1.0);

  // Painted backdrop: large soft patches, smaller dabs, and directional brush strokes.
  float n = fbm(p * 2.1 + vec2(t * 0.010, -t * 0.006));
  float m = fbm(p * 5.5 + n * 1.6 + vec2(3.1, -t * 0.004));
  float strokes = fbm(vec2(p.x * 3.0 + m * 1.2, p.y * 13.0 + m * 2.0));

  vec3 col = mix(${vec3(PALETTE.dark)}, ${vec3(PALETTE.mid)}, smoothstep(0.32, 0.68, n));
  col = mix(col, ${vec3(PALETTE.light)}, smoothstep(0.52, 0.80, m) * 0.65);
  col = mix(col, ${vec3(PALETTE.haze)}, smoothstep(0.55, 0.85, strokes) * 0.30);
  col = mix(col, ${vec3(PALETTE.deep)}, smoothstep(0.55, 0.20, n) * 0.35);

  // Studio light: brighter behind the subject, falling off to the corners.
  vec2 d = (uv - vec2(0.5, 0.58)) * vec2(1.25, 1.6);
  float spot = exp(-dot(d, d) * 2.4);
  col *= 0.74 + 0.40 * spot + 0.02 * beat;

  // Burlap ground: a woven table surface at the bottom of the frame.
  float horizon = mix(-0.05, 0.15, ground);
  float g = smoothstep(horizon + 0.012, horizon - 0.012, uv.y);
  if (g > 0.0) {
    // perspective: threads get finer toward the horizon
    float depth = clamp((horizon - uv.y) / max(horizon, 1e-3), 0.0, 1.0);
    float rows = 1.0 / (0.08 + depth);
    vec2 q = vec2((uv.x - 0.5) * 1.7778 * mix(1.6, 1.0, depth) * 900.0, rows * 60.0);
    float jitter = vnoise(q * vec2(0.02, 0.15)) * 1.5;
    float warp = 0.5 + 0.5 * sin(q.x + jitter);
    float weft = 0.5 + 0.5 * sin(q.y * 6.2832 + vnoise(q * 0.03) * 2.0);
    float over = step(0.5, fract(floor(q.x / 6.2832) * 0.5 + floor(q.y) * 0.5));
    float weave = mix(warp, weft, over);
    float fibre = vnoise(q * vec2(0.6, 3.0)) * 0.5 + fbm(q * 0.01) * 0.5;
    vec3 burlap = ${vec3(PALETTE.ground)} * (0.86 + 0.10 * weave + 0.12 * (fibre - 0.5));
    // fade the weave out in the distance, where it would only alias
    burlap = mix(burlap, ${vec3(PALETTE.ground)} * 0.92, smoothstep(0.35, 0.0, depth));
    // light falls off toward the front edge; a soft contact shadow sits at the seam
    burlap *= mix(1.0, 0.70, depth);
    burlap *= 1.0 - 0.30 * smoothstep(0.10, 0.0, depth);
    col = mix(col, burlap, g);
  }

  // Vignette, as in an old print.
  float v = length((uv - 0.5) * vec2(1.15, 1.0));
  col *= mix(1.0, 0.58, smoothstep(0.38, 0.85, v));

  gl_FragColor = vec4(col, 1.0);
}
`;

const BACKDROP_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export class Backdrop {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      uniforms: { t: { value: 0 }, beat: { value: 0 }, ground: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });
    // a clip-space quad: always fills the canvas, whatever the camera does
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  update(t: number, beat: number, ground = 0): void {
    this.material.uniforms.t.value = t;
    this.material.uniforms.beat.value = beat;
    this.material.uniforms.ground.value = ground;
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
 * Print grain over the whole frame, text included: a CSS layer showing a seeded noise
 * tile whose offset changes 24 times a second, keyed to song time.
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
    const frame = Math.floor(t * 24);
    const seeded = mulberry32(frame * 9973 + 11);
    this.el.style.backgroundPosition = `${Math.floor(seeded() * 256)}px ${Math.floor(seeded() * 256)}px`;
  }
}
