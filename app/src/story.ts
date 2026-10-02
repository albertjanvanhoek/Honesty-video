// The story layer, after the mood board: torn-paper notes with handwriting (written word by word
// as they are sung), and a silhouetted figure: walking through the rain at the start, standing on
// a cliff with open arms in the golden finale. Canvas2D in 1920x1080 logical px; pure function of t.
import { CSS } from './look';
import { type LineTiming, clamp01, findLine, findWord, smoothstep } from './lyrics';
import { dropAmount, kickPulse } from './music';

const W = 1920;
const H = 1080;
type Pt = [number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (x: number) => {
  const k = clamp01(x), c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- torn paper

/** A torn paper rectangle path with a ragged edge, seeded so it is the same every frame. */
export function tornRect(g: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const rand = mulberry32(seed);
  const jag = (n: number) => Array.from({ length: n }, () => (rand() - 0.5) * 9);
  const top = jag(18), right = jag(10), bottom = jag(18), left = jag(10);
  g.beginPath();
  g.moveTo(0, top[0]);
  top.forEach((j, i) => g.lineTo((i / (top.length - 1)) * w, j));
  right.forEach((j, i) => g.lineTo(w + j, (i / (right.length - 1)) * h));
  bottom.forEach((j, i) => g.lineTo(w - (i / (bottom.length - 1)) * w, h + j));
  left.forEach((j, i) => g.lineTo(j, h - (i / (left.length - 1)) * h));
  g.closePath();
}

export interface NoteLine {
  text: string;
  /** 0..1 how much of the line is written */
  write: number;
  /** 0..1 how far a strike-through has been drawn */
  strike?: number;
  color?: string;
}

/** A taped, torn note with handwritten lines, written progressively. */
export function drawNote(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, rot: number, lines: NoteLine[],
  appear: number, seed: number, size = 46,
): void {
  if (appear <= 0.001) return;
  const lh = size * 1.18, h = 50 + lh * lines.length;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.globalAlpha *= clamp01(appear * 1.5);
  const s = lerp(1.12, 1, easeOutBack(appear));
  g.scale(s, s);
  g.translate(-w / 2, -h / 2);
  // paper with a soft shadow
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.5)'; g.shadowBlur = 26; g.shadowOffsetY = 14;
  tornRect(g, w, h, seed);
  g.fillStyle = CSS.paper;
  g.fill();
  g.restore();
  // faint ruled lines
  g.strokeStyle = 'rgba(90, 110, 130, 0.18)'; g.lineWidth = 1.5;
  for (let i = 0; i < lines.length; i++) {
    const ly = 30 + lh * (i + 1) - 6;
    g.beginPath(); g.moveTo(14, ly); g.lineTo(w - 14, ly); g.stroke();
  }
  // a strip of tape
  g.save();
  g.translate(w / 2, -4);
  g.rotate(-0.05);
  g.fillStyle = 'rgba(225, 215, 190, 0.75)';
  g.fillRect(-60, -14, 120, 28);
  g.restore();
  // the handwriting, revealed left to right with a clip, as if being written
  g.font = `600 ${size}px Caveat, cursive`;
  g.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    if (l.write <= 0) return;
    const ly = 30 + lh * (i + 1) - 14;
    const tw = g.measureText(l.text).width;
    g.save();
    g.beginPath(); g.rect(20, ly - size, tw * clamp01(l.write) + 4, size * 1.4); g.clip();
    g.fillStyle = l.color ?? '#2c2620';
    g.fillText(l.text, 24, ly);
    g.restore();
    if (l.strike && l.strike > 0) {
      g.strokeStyle = '#a3362a'; g.lineWidth = 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(18, ly - size * 0.28); g.lineTo(18 + (tw + 12) * clamp01(l.strike), ly - size * 0.3 - 2); g.stroke();
    }
  });
  g.restore();
}

// ---------------------------------------------------------------- the figure

/** A two-segment limb from `a`, with angles in radians from straight down. */
export function limb(g: CanvasRenderingContext2D, a: Pt, a1: number, a2: number, l1: number, l2: number, w: number): void {
  const b: Pt = [a[0] + Math.sin(a1) * l1, a[1] + Math.cos(a1) * l1];
  const c: Pt = [b[0] + Math.sin(a1 + a2) * l2, b[1] + Math.cos(a1 + a2) * l2];
  g.lineWidth = w;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke();
}

/**
 * A silhouetted figure standing on `feet`, `height` px tall. `walk` is the walk cycle phase
 * (radians); `stride` 0..1 how much it walks; `arms` 0..1 how far the arms open upward.
 */
export function figure(g: CanvasRenderingContext2D, feet: Pt, height: number, walk: number, stride: number, arms: number, rim: number): void {
  const u = height / 100;
  const hip: Pt = [feet[0], feet[1] - 48 * u];
  const neck: Pt = [feet[0] + 1.5 * u, feet[1] - 84 * u];
  const sh: Pt = [feet[0] + 1 * u, feet[1] - 80 * u];
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  const col = '#0b0f12';
  g.strokeStyle = col; g.fillStyle = col;
  // legs
  // standing, the feet are planted a little apart
  const sw = Math.sin(walk) * 0.42 * stride, stance = 0.1 * (1 - stride);
  limb(g, [hip[0] - 3 * u, hip[1]], sw - stance, Math.max(0, -sw) * 0.9 + 0.05, 25 * u, 24 * u, 10 * u);
  limb(g, [hip[0] + 3 * u, hip[1]], -sw + stance, Math.max(0, sw) * 0.9 + 0.05, 25 * u, 24 * u, 10 * u);
  // body (a jacket)
  g.beginPath();
  g.moveTo(sh[0] - 11 * u, sh[1] + 1 * u); g.quadraticCurveTo(sh[0], sh[1] - 3 * u, sh[0] + 11 * u, sh[1] + 1 * u);
  g.lineTo(hip[0] + 9 * u, hip[1] + 3 * u); g.lineTo(hip[0] - 9 * u, hip[1] + 3 * u);
  g.closePath(); g.fill();
  // arms: swinging while walking, opening up toward the light
  // (limb angles are measured from straight down; positive swings toward +x)
  const swing = -Math.sin(walk) * 0.35 * stride;
  const open = arms * 2.1;
  limb(g, [sh[0] - 7 * u, sh[1] + 2 * u], swing - open, -0.15 - 0.35 * arms, 17 * u, 16 * u, 7 * u);
  limb(g, [sh[0] + 7 * u, sh[1] + 2 * u], -swing + open, 0.15 + 0.35 * arms, 17 * u, 16 * u, 7 * u);
  // head
  g.beginPath(); g.arc(neck[0], neck[1] - 8 * u, 7.5 * u, 0, Math.PI * 2); g.fill();
  // a thin warm rim of light around the silhouette when the sun is behind it
  if (rim > 0.01) {
    g.globalCompositeOperation = 'destination-over';
    g.shadowColor = `rgba(255, 190, 120, ${0.7 * rim})`;
    g.shadowBlur = 6 * u;
    g.beginPath(); g.arc(neck[0], neck[1] - 8 * u, 7.5 * u, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export function cliff(g: CanvasRenderingContext2D, x: number, y: number, rim: number): void {
  g.save();
  g.fillStyle = '#0b0f12';
  g.beginPath();
  g.moveTo(x - 260, H);
  g.lineTo(x - 210, y + 40); g.lineTo(x - 120, y + 12); g.lineTo(x - 40, y); g.lineTo(x + 70, y + 6);
  g.lineTo(x + 140, y + 30); g.lineTo(x + 230, y + 90); g.lineTo(x + 330, y + 170); g.lineTo(x + 420, H);
  g.closePath(); g.fill();
  if (rim > 0.01) {
    g.strokeStyle = `rgba(255, 190, 120, ${0.4 * rim})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 120, y + 12); g.lineTo(x - 40, y); g.lineTo(x + 70, y + 6); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the layer

/** How much of a line's words have been sung, 0..1, for writing notes along with the voice. */
const sung = (line: LineTiming, t: number) => smoothstep(line.start, line.end, t);

export class StoryLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;

  private readonly L = {
    people: findLine('People say'),
    notHow: findLine('not how honesty works'),
    sport: findLine('You play sport'),
    practice: findLine('You practice'),
    lose: findLine('You lose'),
    learn: findLine('You learn'),
    better: findLine('You get better'),
    noDifferent: findLine('honesty is no different'),
    question: findLine('then comes the question'),
    defend: findLine('defend yourself'),
    change: findLine('Or do you change'),
    notSaying: findLine('honesty is not saying'),
    closer: findLine('closer to true'),
    weakness: findLine('That is not weakness'),
    turning: findLine('keep turning toward'),
    teach: findLine('Teach me'),
    home: findLine('How you come home'),
  };

  constructor(parent: Element) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'story';
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d')!;
    parent.appendChild(this.canvas);
  }

  setDisplaySize(w: number, h: number): void {
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  render(t: number, phase: number): void {
    const g = this.g, L = this.L;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    const rim = smoothstep(0.55, 0.9, phase);

    // the figure walks through the rain at the start, until the compass rises
    const walkOut = 1 - smoothstep(L.notHow.start, L.notHow.end, t);
    if (walkOut > 0.01) {
      g.save();
      g.globalAlpha = smoothstep(0.5, 3.5, t) * walkOut;
      const x = lerp(1720, 1420, smoothstep(0, L.notHow.end, t));
      // tall enough to stand against the city's glow on the horizon
      figure(g, [x, 930], 300, t * 5.2, 1, 0, 0);
      g.restore();
    }

    // "You play sport. You practice. You lose. You learn. You get better." in a notebook
    const sportIn = smoothstep(L.sport.start - 0.3, L.sport.start + 0.3, t) * (1 - smoothstep(L.noDifferent.start, L.noDifferent.start + 0.6, t));
    drawNote(g, 270, 820, 400, -0.06, [
      { text: 'practice ✓', write: sung(L.practice, t) },
      { text: 'lose ✗', write: sung(L.lose, t), color: '#8a2e22' },
      { text: 'learn ✓', write: sung(L.learn, t) },
      { text: 'get better ↗', write: sung(L.better, t) },
    ], sportIn, 11);

    // "Do you defend yourself? Or do you change?": the old answers crossed out, new ones written
    const journalIn = smoothstep(L.question.start - 0.2, L.question.start + 0.4, t) * (1 - smoothstep(L.notSaying.start + 1.2, L.notSaying.start + 2, t));
    const strikeAt = findWord(L.change, 'change').start;
    const strike = (i: number) => smoothstep(strikeAt + i * 0.18, strikeAt + i * 0.18 + 0.3, t);
    const write = (i: number) => smoothstep(strikeAt + 0.8 + i * 0.5, strikeAt + 1.3 + i * 0.5, t);
    drawNote(g, 1680, 800, 380, 0.05, [
      { text: 'Defend myself', write: sung(L.defend, t) * 1.3, strike: strike(0) },
      { text: 'Blame', write: sung(L.defend, t) * 1.6 - 0.3, strike: strike(1) },
      { text: 'Ignore', write: sung(L.defend, t) * 1.8 - 0.6, strike: strike(2) },
      { text: 'Stay the same', write: sung(L.defend, t) * 2 - 0.9, strike: strike(3) },
      { text: 'Tell the truth', write: write(0) },
      { text: 'Choose change', write: write(1) },
      { text: 'Be better', write: write(2) },
      { text: 'Come home', write: write(3) },
    ], journalIn, 23, 32);

    // small notes in the margins, after the board's handwriting
    const scrap = (line: LineTiming, text: string, x: number, y: number, rot: number, seed: number) => {
      const k = smoothstep(line.start - 0.1, line.start + 0.4, t) * (1 - smoothstep(line.end + 1.6, line.end + 2.2, t));
      drawNote(g, x, y, 340, rot, [{ text, write: sung(line, t) * 1.2 }], k, seed, 44);
    };
    scrap(L.closer, 'closer to true.', 1660, 880, 0.06, 31);
    scrap(L.weakness, 'a braver version of me.', 270, 880, -0.05, 37);
    scrap(L.turning, 'turn toward what is real.', 1660, 880, 0.04, 41);

    // the finale: a figure on a cliff, arms opening to the sunrise, lifting with the kick
    const finale = smoothstep(L.home.end + 0.6, L.home.end + 3, t);
    if (finale > 0.01) {
      g.save();
      g.globalAlpha = finale;
      const lift = kickPulse(t) * dropAmount(t);
      cliff(g, 1460, 860, rim);
      const arms = smoothstep(L.home.end + 2, L.home.end + 6, t) * (0.85 + 0.15 * lift);
      figure(g, [1460, 862 - lift * 3], 230, 0, 0, arms, rim);
      g.restore();
    }
  }
}
