// Song data and the small timing helpers shared by the lyrics and the thread.
import lyricData from '../../data/lyrics.json';
import audioData from '../../data/audio.json';

export type WordTiming = { w: string; start: number; end: number };
export type LineTiming = { text: string; start: number; end: number; words: WordTiming[] };

export const lines = (lyricData as { lines: LineTiming[] }).lines;
export const beats = (audioData as { beats: number[] }).beats;

// `occurrence` selects a repeated line: 0 is the first time it is sung, 1 the second.
export function findLine(fragment: string, occurrence = 0): LineTiming {
  const matches = lines.filter((x) => x.text.toLowerCase().includes(fragment.toLowerCase()));
  const line = matches[occurrence];
  if (!line) throw new Error(`Missing lyric line: ${fragment} (#${occurrence + 1})`);
  return line;
}

/** The first word of `line` equal to `w` (case-insensitive). */
export function findWord(line: LineTiming, w: string): WordTiming {
  const word = line.words.find((x) => x.w.toLowerCase() === w.toLowerCase());
  if (!word) throw new Error(`Missing word "${w}" in: ${line.text}`);
  return word;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
}

export function wordProgress(word: WordTiming, t: number): number {
  return smoothstep(word.start, word.end, t);
}

export function nearestBeatPulse(t: number, width = 0.10): number {
  let best = Infinity;
  for (const beat of beats) {
    if (beat > t + width) break;
    best = Math.min(best, Math.abs(t - beat));
  }
  return clamp01(1 - best / width);
}

/** Continuous beat position: 12.25 is a quarter of the way from beat 12 to beat 13. */
export function beatPosition(t: number): number {
  if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
  for (let i = 0; i < beats.length - 1; i++) {
    if (t < beats[i + 1]) return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
  }
  const n = beats.length - 1;
  return n + (t - beats[n]) / (beats[n] - beats[n - 1]);
}

/** The time of the first beat at or after `t`. */
export function beatAtOrAfter(t: number): number {
  return beats.find((b) => b >= t) ?? t;
}
