// The scene engine. The film is a list of scenes; each one draws the whole frame (on a Canvas2D
// layer, optionally over the WebGL landscape). Cuts are anchored to lyric lines and snapped to
// the beat, so the edit follows the music. Every frame is a pure function of song time.
import { type LineTiming, type WordTiming, findLine } from './lyrics';
import { beatPos, dropAmount, kickPulse } from './music';
import audioData from '../../data/audio.json';
import type { LandscapeState } from './look';

export const W = 1920;
export const H = 1080;
export type Pt = [number, number];

// ---------------------------------------------------------------- maths

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / Math.max(1e-4, b - a));
  return k * k * (3 - 2 * k);
};
export const ease = {
  outCubic: (x: number) => 1 - Math.pow(1 - clamp01(x), 3),
  inOutCubic: (x: number) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  outExpo: (x: number) => { const k = clamp01(x); return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); },
  inExpo: (x: number) => { const k = clamp01(x); return k <= 0 ? 0 : Math.pow(2, 10 * k - 10); },
  outBack: (x: number) => { const k = clamp01(x), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- music and lyrics

const BEATS = (audioData as { beats: number[] }).beats;

/** The last beat at or before t (cuts land on the beat, never after the word). */
export function snapToBeat(t: number): number {
  let best = BEATS[0];
  for (const b of BEATS) { if (b <= t + 0.02) best = b; else break; }
  return best;
}

/** The time of beat index i (fractional allowed). */
export function beatTime(i: number): number {
  const k = Math.max(0, Math.min(BEATS.length - 2, Math.floor(i)));
  return BEATS[k] + (BEATS[k + 1] - BEATS[k]) * (i - k);
}

export const L = (fragment: string, n = 0): LineTiming => findLine(fragment, n);
export const word = (line: LineTiming, w: string): WordTiming => {
  const x = line.words.find((v) => v.w.toLowerCase() === w.toLowerCase());
  if (!x) throw new Error(`Missing word "${w}" in: ${line.text}`);
  return x;
};
/** A cut point: the beat at or before the first word of a line. */
export const cutAt = (fragment: string, n = 0) => snapToBeat(L(fragment, n).start);

// ---------------------------------------------------------------- frames and scenes

export interface Frame {
  t: number;
  /** time since the scene started */
  lt: number;
  /** scene length in seconds */
  dur: number;
  /** progress through the scene, 0..1 */
  p: number;
  /** kick pulse (1 on the kick, decaying) */
  kick: number;
  /** 0..1 how much drop the music is in */
  drop: number;
  /** continuous beat position */
  beat: number;
  g: CanvasRenderingContext2D;
  /** call to show the WebGL landscape behind this scene, with these settings */
  land: (s: Partial<LandscapeState>) => void;
}

export interface Scene {
  id: string;
  from: number;
  draw: (f: Frame) => void;
}

export function frameFor(scenes: Scene[], t: number, g: CanvasRenderingContext2D, land: Frame['land']): { scene: Scene; f: Frame } {
  let i = 0;
  for (let k = 0; k < scenes.length; k++) if (t >= scenes[k].from) i = k;
  const scene = scenes[i];
  const to = scenes[i + 1]?.from ?? (audioData as { duration: number }).duration;
  const dur = Math.max(0.01, to - scene.from);
  const lt = t - scene.from;
  return {
    scene,
    f: { t, lt, dur, p: clamp01(lt / dur), kick: kickPulse(t), drop: dropAmount(t), beat: beatPos(t), g, land },
  };
}

// ---------------------------------------------------------------- camera

/** Apply a camera: centre (cx, cy) in frame px, zoom and roll, plus the kick punch in drops. */
export function camera(f: Frame, cx = W / 2, cy = H / 2, zoom = 1, rot = 0, punch = 1): void {
  const g = f.g;
  const z = zoom * (1 + 0.035 * f.kick * f.drop * punch);
  g.translate(W / 2, H / 2);
  g.rotate(rot);
  g.scale(z, z);
  g.translate(-cx, -cy);
}

// ---------------------------------------------------------------- lyrics

export interface LyricStyle {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  weight?: number;
  /** width at which the line wraps onto two rows */
  wrap?: number;
  /** unsung word colour; the sung word turns amber, then cream */
  dim?: number;
  shadow?: boolean;
  /** lowercase words to emphasise in amber, larger */
  key?: string[];
  font?: 'serif' | 'hand' | 'caps';
  color?: string;
}

const isQuote = (line: LineTiming) => /^["“]/.test(line.text) || /["”]\.?$/.test(line.text);

function fontFor(o: LyricStyle, size: number, italic: boolean): string {
  if (o.font === 'hand') return `600 ${size}px Caveat, cursive`;
  return `${italic ? 'italic ' : ''}${o.weight ?? 700} ${size}px "Cormorant Garamond", Georgia, serif`;
}

/**
 * Draw a lyric line in the scene, word by word: dim until sung, amber while sung, cream after.
 * In the drops each word slams in on its own hit. Returns the drawn width.
 */
export function lyric(f: Frame, line: LineTiming, o: LyricStyle, opacity = 1): number {
  const g = f.g, t = f.t;
  if (opacity <= 0.001) return 0;
  const italic = o.italic ?? isQuote(line);
  const caps = o.font === 'caps';
  const words = line.words.map((w, i) => {
    let text = caps ? w.w.toUpperCase() : w.w;
    if (isQuote(line) && !caps) {
      if (i === 0) text = '“' + text;
      if (i === line.words.length - 1) text += '”';
    }
    return { w, text, key: !!o.key?.includes(w.w.toLowerCase()) };
  });
  g.save();
  g.textBaseline = 'alphabetic';
  const space = o.size * 0.28 + (caps ? o.size * 0.2 : 0);
  const sizeOf = (k: boolean) => (k ? o.size * 1.22 : o.size);
  const widthOf = (x: { text: string; key: boolean }) => {
    g.font = fontFor(o, sizeOf(x.key), italic);
    if (caps) g.letterSpacing = `${(o.size * 0.18).toFixed(1)}px`;
    return g.measureText(x.text).width;
  };
  // wrap into rows
  const rows: Array<typeof words> = [[]];
  let rowW = 0;
  for (const x of words) {
    const w = widthOf(x);
    if (o.wrap && rowW > 0 && rowW + space + w > o.wrap) { rows.push([]); rowW = 0; }
    rows[rows.length - 1].push(x);
    rowW += (rowW > 0 ? space : 0) + w;
  }
  const lh = o.size * 1.08;
  let maxW = 0;
  rows.forEach((row, ri) => {
    const widths = row.map(widthOf);
    const total = widths.reduce((a, b) => a + b, 0) + space * (row.length - 1);
    maxW = Math.max(maxW, total);
    let x = o.align === 'left' ? o.x : o.align === 'right' ? o.x - total : o.x - total / 2;
    const y = o.y + (ri - (rows.length - 1) / 2) * lh;
    row.forEach((item, wi) => {
      const ww = widths[wi];
      const before = t < item.w.start, during = t >= item.w.start && t < item.w.end;
      const hit = !before ? Math.exp(-(t - item.w.start) / 0.09) * f.drop : 0;
      const s = 1 + 0.3 * hit;
      g.save();
      g.translate(x + ww / 2, y - o.size * 0.3);
      g.scale(s, s);
      g.font = fontFor(o, sizeOf(item.key), italic);
      if (caps) g.letterSpacing = `${(o.size * 0.18).toFixed(1)}px`;
      g.textAlign = 'center';
      g.globalAlpha = opacity * (before ? (o.dim ?? 0.55) * (1 - 0.4 * f.drop) : 1);
      if (o.shadow !== false) { g.shadowColor = 'rgba(0, 0, 0, 0.6)'; g.shadowBlur = o.size * 0.35; g.shadowOffsetY = o.size * 0.04; }
      g.fillStyle = o.color ?? (during || (item.key && !before) ? '#e8aa60' : '#f4ece0');
      g.fillText(item.text, 0, o.size * 0.3);
      g.restore();
      x += ww + space;
    });
  });
  g.restore();
  return maxW;
}

/** Opacity for a line shown from slightly before it is sung until a moment after it ends. */
export const lineVis = (line: LineTiming, t: number, pre = 0.25, post = 0.8) =>
  smooth(line.start - pre, line.start, t) * (1 - smooth(line.end + post * 0.5, line.end + post, t));
