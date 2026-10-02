// The song's musical data (data/audio.json): a ~207 BPM frenchcore beat grid, how hard each
// kick hits, smooth energy curves, and the sections. Everything is a pure function of time.
import audioData from '../../data/audio.json';

type Section = { name: string; start: number; end: number };
const A = audioData as {
  duration: number; tempo: number; beats: number[]; kick: number[];
  envRate: number; energy: number[]; bass: number[]; sections: Section[];
};

export const DURATION = A.duration;
export const SECTIONS = A.sections;

function sampleEnv(arr: number[], t: number): number {
  const x = t * A.envRate;
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(x)));
  const u = Math.max(0, Math.min(1, x - i));
  return arr[i] * (1 - u) + arr[i + 1] * u;
}

/** Overall loudness, 0..1 (smoothed). */
export const energy = (t: number) => sampleEnv(A.energy, t);
/** Sub-bass (the kick and bass), 0..1 (smoothed). */
export const bass = (t: number) => sampleEnv(A.bass, t);

/** The index of the last beat at or before t (binary search). */
function beatIndex(t: number): number {
  const b = A.beats;
  let lo = 0, hi = b.length - 1;
  if (t < b[0]) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (b[mid] <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/**
 * A sharp pulse on every kick, scaled by how hard that kick hits: 1 on the kick,
 * decaying over `decay` seconds. This is the frenchcore heartbeat of the visuals.
 */
export function kickPulse(t: number, decay = 0.11): number {
  const i = beatIndex(t);
  if (i < 0) return 0;
  const dt = t - A.beats[i];
  return A.kick[i] * Math.exp(-dt / decay);
}

/** Continuous beat position (12.5 = halfway between beats 12 and 13). */
export function beatPos(t: number): number {
  const i = beatIndex(t);
  if (i < 0) return 0;
  if (i >= A.beats.length - 1) return i;
  return i + (t - A.beats[i]) / (A.beats[i + 1] - A.beats[i]);
}

/** 0..1: how much "drop" the music is in (heavy kick and bass), smoothed. */
export function dropAmount(t: number): number {
  const b = bass(t);
  return Math.max(0, Math.min(1, (b - 0.45) / 0.4));
}

export function sectionAt(t: number): Section {
  return A.sections.find((s) => t >= s.start && t < s.end) ?? A.sections[A.sections.length - 1];
}

/**
 * How far the camera has travelled over the landscape by time t: the integral of a speed that
 * rises with the music's energy. Precomputed once, so it is a pure lookup.
 */
const FLIGHT_RATE = 20;
const flightTable: number[] = (() => {
  const out = [0];
  for (let i = 1; i <= Math.ceil(A.duration * FLIGHT_RATE) + 1; i++) {
    const t = i / FLIGHT_RATE;
    const speed = 0.012 + 0.05 * energy(t) + 0.06 * dropAmount(t);
    out.push(out[i - 1] + speed / FLIGHT_RATE);
  }
  return out;
})();

export function flight(t: number): number {
  const x = Math.max(0, t * FLIGHT_RATE);
  const i = Math.min(flightTable.length - 2, Math.floor(x));
  const u = x - i;
  return flightTable[i] * (1 - u) + flightTable[i + 1] * u;
}
