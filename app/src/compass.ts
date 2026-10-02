// The background layer (the "30 %"): honesty as a compass needle that keeps swinging back to
// north. Before the compass arrives, honesty is shown the way people talk about it: as things
// you own (an eye-colour swatch, a height mark, a trophy), then as a sport you practise.
// Drawn with Canvas2D in 1920x1080 logical px (y down); a pure function of song time.
import { CSS } from './look';
import { type LineTiming, type WordTiming, clamp01, findLine, findWord, smoothstep } from './lyrics';

const W = 1920;
const H = 1080;
type Pt = [number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutCubic = (x: number) => {
  const k = clamp01(x);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- cues from the lyrics

const L = (fragment: string, n = 0): LineTiming => findLine(fragment, n);
const Wd = (line: LineTiming, w: string): WordTiming => findWord(line, w);

function buildCues() {
  const people = L('People say');
  const eyes = L('color of your eyes');
  const height = L('Like your height');
  const trophy = L('trophy you once won');
  const forever = L('keep forever');
  const notHow = L('not how honesty works');
  const sportLine = L('You play sport');
  const practice = L('You practice');
  const lose = L('You lose');
  const learn = L('You learn');
  const better = L('You get better');
  const noDifferent = L('honesty is no different');
  const playHonesty = L('You play honesty');
  const everys = [L('Every day'), L('Every conversation'), L('Every mistake'), L('Every moment')];
  const wrong = L('You were wrong');
  const defend = L('defend yourself');
  const change = L('Or do you change');
  const alwaysRight = L('I was always right');
  const thought = L('I thought this');
  const learned = L('I learned that');
  const andNow = L('And now');
  const closer = L('closer to true');
  const growth = L('That is growth');
  const courage = L('That is courage');
  const neverChanges = L('who never changes');
  const changesWell = L('who changes well');
  const frozen = L('frozen needle');
  const stuck = L('it is only stuck');
  const byMoving = L('by moving');
  const turn = L('Turn, and the needle');
  const everyTime = L('Every time');
  const iNever = L('I never change');
  const turning = L('keep turning toward');
  const teach = L('Teach me');
  const agains = [L('Again'), L('And again', 0), L('And again', 1)];
  const become = L('how you become');
  const home = L('How you come home');
  return {
    people, eyes, height, trophy, forever, notHow, sportLine, practice, lose, learn, better, noDifferent,
    playHonesty, everys, wrong, defend, change, alwaysRight, thought, learned, andNow, closer, growth, courage,
    neverChanges, changesWell, frozen, stuck, byMoving, turn, everyTime, iNever, turning, teach, agains, become, home,
  };
}

// ---------------------------------------------------------------- the needle

interface NeedleScript {
  /** the angle the needle is pulled toward (0 = north), radians */
  target: (t: number) => number;
  /** if not null, the needle is held at this angle (pinned, frozen) */
  hold: (t: number) => number | null;
  /** the compass housing's rotation (turning the compass), radians */
  housing: (t: number) => number;
  /** angular-velocity kicks: [time, rad/s] */
  kicks: Array<[number, number]>;
}

const OMEGA = 2 * Math.PI * 0.85; // natural swing frequency
const ZETA = 0.16;                // damping: a few visible swings, settled in about two seconds
const DRAG = 0.8;                 // how much a turning housing drags the needle along
const DT = 1 / 240;

/**
 * The needle's world angle at `t`, integrated from the start of the song with a fixed step,
 * so every render of the same time gives the same angle.
 */
function needleAngle(s: NeedleScript, t: number, start: number): number {
  let th = 0.85, w = 0;
  let k = 0;
  const kicks = s.kicks;
  for (let x = start; x < t; x += DT) {
    while (k < kicks.length && kicks[k][0] <= x) { w += kicks[k][1]; k++; }
    const held = s.hold(x);
    if (held !== null) { th = held; w = 0; continue; }
    const hv = (s.housing(x + DT) - s.housing(x)) / DT;
    const acc = -OMEGA * OMEGA * (th - s.target(x)) - 2 * ZETA * OMEGA * (w - DRAG * hv);
    w += acc * DT;
    th += w * DT;
  }
  return th;
}

// ---------------------------------------------------------------- sprites

const R = 470;  // bezel radius
const RC = 405; // dial (card) radius

function makeDial(): HTMLCanvasElement {
  const S = (R + 20) * 2, c = S / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;

  // brass bezel
  const bez = g.createRadialGradient(c - R * 0.3, c - R * 0.4, R * 0.2, c, c, R);
  bez.addColorStop(0, '#f2d38a'); bez.addColorStop(0.55, CSS.brass); bez.addColorStop(0.9, '#8a6424'); bez.addColorStop(1, '#5a3f14');
  g.fillStyle = bez;
  g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
  // knurled edge
  g.strokeStyle = 'rgba(60, 40, 10, 0.45)'; g.lineWidth = 2;
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * (R - 3), c + Math.sin(a) * (R - 3));
    g.lineTo(c + Math.cos(a) * (R - 16), c + Math.sin(a) * (R - 16));
    g.stroke();
  }
  // inner lip
  g.strokeStyle = 'rgba(40, 26, 6, 0.6)'; g.lineWidth = 6;
  g.beginPath(); g.arc(c, c, RC + 8, 0, Math.PI * 2); g.stroke();

  // aged paper card
  const card = g.createRadialGradient(c, c, RC * 0.1, c, c, RC);
  card.addColorStop(0, CSS.cream); card.addColorStop(0.8, CSS.paper); card.addColorStop(1, '#cdb88d');
  g.fillStyle = card;
  g.beginPath(); g.arc(c, c, RC, 0, Math.PI * 2); g.fill();
  const rand = mulberry32(5);
  g.save();
  g.beginPath(); g.arc(c, c, RC, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 2600; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * RC;
    g.fillStyle = rand() < 0.5 ? 'rgba(120, 90, 50, 0.06)' : 'rgba(255, 250, 235, 0.08)';
    g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 1 + rand() * 2, 1 + rand() * 2);
  }
  g.restore();

  // rings and degree ticks (0 deg = north = up)
  g.strokeStyle = CSS.ink; g.lineWidth = 2;
  for (const rr of [RC - 18, RC - 58, RC * 0.42]) { g.beginPath(); g.arc(c, c, rr, 0, Math.PI * 2); g.stroke(); }
  for (let d = 0; d < 360; d += 2) {
    const a = (d - 90) * Math.PI / 180;
    const long = d % 10 === 0;
    g.lineWidth = long ? 2.4 : 1.2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * (RC - 18), c + Math.sin(a) * (RC - 18));
    g.lineTo(c + Math.cos(a) * (RC - (long ? 46 : 32)), c + Math.sin(a) * (RC - (long ? 46 : 32)));
    g.stroke();
  }
  g.fillStyle = CSS.ink;
  g.font = '600 22px Jost, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 30; d < 360; d += 30) {
    if (d % 90 === 0) continue;
    const a = (d - 90) * Math.PI / 180;
    g.save(); g.translate(c + Math.cos(a) * (RC - 82), c + Math.sin(a) * (RC - 82)); g.rotate(a + Math.PI / 2);
    g.fillText(String(d), 0, 0); g.restore();
  }

  // compass rose: eight points, alternating ink and honey
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    const len = i % 2 === 0 ? RC * 0.7 : RC * 0.42;
    const wdt = i % 2 === 0 ? 34 : 22;
    for (const side of [-1, 1]) {
      g.fillStyle = side < 0 ? (i % 2 === 0 ? CSS.ink : CSS.honey) : (i % 2 === 0 ? '#6b5a44' : '#e3cf9f');
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(a + side * Math.PI / 2) * wdt, c + Math.sin(a + side * Math.PI / 2) * wdt);
      g.lineTo(c + Math.cos(a) * len, c + Math.sin(a) * len);
      g.closePath(); g.fill();
    }
  }
  // cardinal letters
  g.font = '900 64px "Fraunces Variable", Georgia, serif';
  const letters: Array<[string, number]> = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [ch, d] of letters) {
    const a = (d - 90) * Math.PI / 180;
    g.save(); g.translate(c + Math.cos(a) * (RC - 108), c + Math.sin(a) * (RC - 108)); g.rotate(a + Math.PI / 2);
    g.fillStyle = ch === 'N' ? CSS.needle : CSS.ink;
    g.fillText(ch, 0, 4); g.restore();
  }
  return cv;
}

function makeFrost(): HTMLCanvasElement {
  const S = RC * 2 + 8, c = S / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.save();
  g.beginPath(); g.arc(c, c, RC, 0, Math.PI * 2); g.clip();
  const haze = g.createRadialGradient(c, c, RC * 0.2, c, c, RC);
  haze.addColorStop(0, 'rgba(216, 228, 236, 0.35)'); haze.addColorStop(1, 'rgba(216, 228, 236, 0.85)');
  g.fillStyle = haze; g.fillRect(0, 0, S, S);
  // ice ferns growing in from the rim
  const rand = mulberry32(17);
  g.strokeStyle = 'rgba(245, 250, 255, 0.75)'; g.lineCap = 'round';
  const fern = (x: number, y: number, a: number, len: number, depth: number) => {
    if (depth <= 0 || len < 4) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = depth * 0.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    fern(x2, y2, a + (rand() - 0.5) * 0.5, len * 0.82, depth - 1);
    fern(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, a + 0.9, len * 0.45, depth - 2);
    fern(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, a - 0.9, len * 0.45, depth - 2);
  };
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2;
    fern(c + Math.cos(a) * RC, c + Math.sin(a) * RC, a + Math.PI + (rand() - 0.5) * 0.6, 26 + rand() * 30, 6);
  }
  g.restore();
  return cv;
}

// ---------------------------------------------------------------- props

function drawNeedle(g: CanvasRenderingContext2D, c: Pt, angle: number, glow: number): void {
  const len = RC * 0.86, w = 30;
  g.save();
  g.translate(c[0], c[1]);
  g.rotate(angle);
  g.shadowColor = 'rgba(10, 8, 4, 0.45)'; g.shadowBlur = 14; g.shadowOffsetX = 8; g.shadowOffsetY = 12;
  // north half
  g.fillStyle = CSS.needle;
  g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(-w, 0); g.closePath(); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(0, 0, 0, 0.18)';
  g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
  // south half
  g.fillStyle = '#d9d2c4';
  g.beginPath(); g.moveTo(0, len * 0.8); g.lineTo(w, 0); g.lineTo(-w, 0); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0, 0, 0, 0.14)';
  g.beginPath(); g.moveTo(0, len * 0.8); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
  if (glow > 0.01) {
    g.globalAlpha = glow;
    g.fillStyle = '#ffd98a';
    g.beginPath(); g.arc(0, -len + 22, 14, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
  // brass pivot cap
  const cap = g.createRadialGradient(-6, -6, 2, 0, 0, 22);
  cap.addColorStop(0, '#fbe3a2'); cap.addColorStop(0.6, CSS.brass); cap.addColorStop(1, '#6b4a16');
  g.fillStyle = cap;
  g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** A roughly drawn chalk stroke. */
function chalk(g: CanvasRenderingContext2D, a: Pt, b: Pt, k: number, seed: number): void {
  if (k <= 0) return;
  const rand = mulberry32(seed);
  const e: Pt = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  g.save();
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = `rgba(243, 230, 200, ${0.28 + rand() * 0.25})`;
    g.lineWidth = 5 + rand() * 4;
    g.beginPath();
    g.moveTo(a[0] + (rand() - 0.5) * 3, a[1] + (rand() - 0.5) * 3);
    const m: Pt = [(a[0] + e[0]) / 2 + (rand() - 0.5) * 6, (a[1] + e[1]) / 2 + (rand() - 0.5) * 6];
    g.quadraticCurveTo(m[0], m[1], e[0] + (rand() - 0.5) * 3, e[1] + (rand() - 0.5) * 3);
    g.stroke();
  }
  g.restore();
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = CSS.ink): void {
  g.save();
  g.font = '700 22px Jost, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text.toUpperCase().split('').join(String.fromCharCode(8202)), x, y);
  g.restore();
}

function drawShelf(g: CanvasRenderingContext2D, y: number): void {
  g.save();
  g.shadowColor = 'rgba(5, 8, 12, 0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 16;
  const wood = g.createLinearGradient(0, y, 0, y + 36);
  wood.addColorStop(0, '#8a6a45'); wood.addColorStop(0.4, CSS.ground); wood.addColorStop(1, '#3e2c1a');
  g.fillStyle = wood;
  g.fillRect(470, y, 980, 36);
  g.restore();
  g.strokeStyle = 'rgba(30, 20, 10, 0.35)'; g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.moveTo(470, y + 8 + i * 7); g.bezierCurveTo(800, y + 4 + i * 8, 1100, y + 12 + i * 6, 1450, y + 8 + i * 7); g.stroke();
  }
}

function drawSwatch(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.save();
  g.shadowColor = 'rgba(5, 8, 12, 0.45)'; g.shadowBlur = 12; g.shadowOffsetY = 8;
  g.fillStyle = CSS.paper; g.fillRect(x - 70, y - 190, 140, 190);
  g.shadowColor = 'transparent';
  g.fillStyle = '#5a7a8f'; g.fillRect(x - 56, y - 176, 112, 112);
  g.fillStyle = '#7d5a3a'; g.beginPath(); g.arc(x, y - 120, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a120b'; g.beginPath(); g.arc(x, y - 120, 13, 0, Math.PI * 2); g.fill();
  g.restore();
  label(g, 'eyes', x, y - 34);
}

function drawRuler(g: CanvasRenderingContext2D, x: number, y: number): void {
  const h = 330;
  g.save();
  g.shadowColor = 'rgba(5, 8, 12, 0.45)'; g.shadowBlur = 12; g.shadowOffsetY = 8;
  g.fillStyle = '#e2c98f'; g.fillRect(x - 24, y - h, 48, h);
  g.shadowColor = 'transparent';
  g.strokeStyle = CSS.ink; g.lineWidth = 2;
  for (let i = 1; i < 33; i++) {
    const yy = y - i * 10;
    g.beginPath(); g.moveTo(x - 24, yy); g.lineTo(x - 24 + (i % 5 === 0 ? 22 : 11), yy); g.stroke();
  }
  // the pencil mark of a height, measured once
  g.strokeStyle = CSS.needle; g.lineWidth = 4;
  g.beginPath(); g.moveTo(x - 34, y - 262); g.lineTo(x + 34, y - 262); g.stroke();
  g.restore();
  label(g, 'height', x, y + 56, CSS.paper);
}

function drawTrophy(g: CanvasRenderingContext2D, x: number, y: number, dome: number): void {
  g.save();
  g.shadowColor = 'rgba(5, 8, 12, 0.5)'; g.shadowBlur = 16; g.shadowOffsetY = 10;
  const brass = g.createLinearGradient(x - 90, 0, x + 90, 0);
  brass.addColorStop(0, '#7a5518'); brass.addColorStop(0.35, '#f2d38a'); brass.addColorStop(0.6, CSS.brass); brass.addColorStop(1, '#5a3f14');
  // plinth
  g.fillStyle = '#2b1d12'; g.fillRect(x - 80, y - 60, 160, 60);
  g.shadowColor = 'transparent';
  g.fillStyle = brass; g.fillRect(x - 54, y - 46, 108, 32);
  g.fillStyle = CSS.ink;
  g.font = '700 18px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('H O N E S T', x, y - 30);
  // stem and cup
  g.fillStyle = brass;
  g.fillRect(x - 12, y - 130, 24, 70);
  g.fillRect(x - 40, y - 76, 80, 16);
  g.beginPath();
  g.moveTo(x - 86, y - 270); g.lineTo(x + 86, y - 270);
  g.bezierCurveTo(x + 86, y - 170, x + 40, y - 130, x, y - 130);
  g.bezierCurveTo(x - 40, y - 130, x - 86, y - 170, x - 86, y - 270);
  g.fill();
  g.lineWidth = 12; g.strokeStyle = brass;
  g.beginPath(); g.arc(x - 92, y - 220, 34, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.arc(x + 92, y - 220, 34, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
  g.restore();
  if (dome > 0) {
    // a glass dome: kept forever, untouched
    const top = lerp(y - 700, y - 360, easeOutCubic(dome));
    g.save();
    g.globalAlpha = Math.min(1, dome * 1.4);
    g.strokeStyle = 'rgba(230, 240, 248, 0.55)'; g.lineWidth = 4;
    g.fillStyle = 'rgba(200, 220, 235, 0.10)';
    g.beginPath();
    g.moveTo(x - 120, y - 60 + (top - (y - 360)));
    g.lineTo(x - 120, top + 120);
    g.bezierCurveTo(x - 120, top - 10, x + 120, top - 10, x + 120, top + 120);
    g.lineTo(x + 120, y - 60 + (top - (y - 360)));
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255, 255, 255, 0.5)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x - 92, top + 150); g.bezierCurveTo(x - 92, top + 60, x - 50, top + 30, x - 20, top + 26); g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------- the layer

export class CompassLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly cue = buildCues();
  private readonly script: NeedleScript;
  private readonly simStart: number;
  private dial: HTMLCanvasElement | null = null;
  private frost: HTMLCanvasElement | null = null;

  constructor(parent: Element) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'compass';
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d')!;
    parent.appendChild(this.canvas);
    this.script = this.buildScript();
    this.simStart = this.cue.playHonesty.start - 0.5;
  }

  /** Sprites use the display font, so they are made once the fonts have loaded. */
  prepare(): void {
    this.dial = makeDial();
    this.frost = makeFrost();
  }

  setDisplaySize(w: number, h: number): void {
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private buildScript(): NeedleScript {
    const c = this.cue;
    const kicks: Array<[number, number]> = [];
    // the compass arrives with its needle still settling
    kicks.push([c.playHonesty.start + 0.2, -1.2]);
    // every day, every conversation, every mistake, every moment: small knocks
    c.everys.forEach((line, i) => kicks.push([line.words[0].start, (i % 2 ? -1 : 1) * 1.6]));
    // "You were wrong.": a hard knock
    kicks.push([Wd(c.wrong, 'wrong').start, 6.5]);
    // growth, courage: the needle is lively, not rigid
    kicks.push([c.growth.words[2].start, -1.4]);
    kicks.push([c.courage.words[2].start, 1.4]);
    // "Teach me. Again. And again. And again."
    kicks.push([Wd(c.teach, 'teach').start, 3.2]);
    c.agains.forEach((line, i) => kicks.push([line.words[line.words.length - 1].start, (i % 2 ? 1 : -1) * 3.0]));
    kicks.sort((a, b) => a[0] - b[0]);

    const defendFrom = c.defend.start, defendTo = Wd(c.change, 'change').start;
    const rightFrom = c.alwaysRight.start, rightTo = c.thought.start;
    const neverFrom = c.neverChanges.start, neverTo = c.changesWell.start;
    const frozenFrom = c.frozen.start, frozenTo = Wd(c.byMoving, 'moving').start;
    const iNeverFrom = c.iNever.start, iNeverTo = c.turning.start;

    const steps: Array<[number, number]> = [
      [c.thought.start, 0.62],
      [c.learned.start, 0.32],
      [c.andNow.start, 0.14],
      [Wd(c.closer, 'true').start, 0],
    ];
    const turnAt = c.turn.words[0].start, backAt = c.everyTime.words[0].start;

    return {
      kicks,
      target: (t) => {
        // "I thought this. I learned that. And now… closer to true": each step nearer north
        let v = 0;
        if (t >= rightFrom && t < steps[0][0]) v = 0.9;
        for (const [at, val] of steps) if (t >= at && t < steps[steps.length - 1][0] + 0.01) v = val;
        if (t >= steps[steps.length - 1][0]) v = 0;
        return v;
      },
      hold: (t) => {
        if (t >= defendFrom && t < defendTo) return 0.95;       // pinned: "Do you defend yourself?"
        if (t >= rightFrom && t < rightTo) return 0.9;          // "I was always right"
        if (t >= neverFrom && t < neverTo) return 0;            // rigid: "never changes"
        if (t >= frozenFrom && t < frozenTo) return 0.7;        // frozen, pointing the wrong way
        if (t >= iNeverFrom && t < iNeverTo) return 0;          // "I never change"
        return null;
      },
      housing: (t) => {
        // "Turn, and the needle swings back. Every time."
        const a = easeInOutCubic((t - turnAt) / 0.9) * 1.25;
        const b = easeInOutCubic((t - backAt) / 0.9) * 1.25;
        return a - b;
      },
    };
  }

  /** Where the compass sits: it rises into the bottom of the frame on "You play honesty". */
  private compassCentre(t: number): Pt {
    const rise = easeOutCubic((t - this.cue.playHonesty.start + 0.3) / 1.4);
    const leave = easeInOutCubic((t - (this.cue.home.end + 1.2)) / 1.6);
    return [W / 2, lerp(1700, 1150, rise) + lerp(0, 600, leave)];
  }

  render(t: number): void {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    this.renderPossessions(t);
    this.renderSport(t);
    if (t >= this.cue.playHonesty.start - 0.5) this.renderCompass(t);
  }

  /** "People say: I am honest. … Like the colour of your eyes. Like your height. Like a trophy…" */
  private renderPossessions(t: number): void {
    const c = this.cue, g = this.g;
    const inAt = c.people.start;
    const out = easeInOutCubic((t - c.notHow.start) / 1.2);
    if (t < inAt - 0.5 || out >= 1) return;
    const shelfY = 880;
    const drop = out * 500;
    g.save();
    g.translate(0, drop);
    g.globalAlpha = smoothstep(inAt - 0.5, inAt + 0.8, t) * (1 - out);
    const pop = (at: number) => easeOutCubic((t - at + 0.15) / 0.5);
    const sw = pop(c.eyes.start), ru = pop(c.height.start), tr = pop(Wd(c.trophy, 'trophy').start);
    if (sw > 0) { g.save(); g.translate(0, (1 - sw) * -60); g.globalAlpha *= sw; drawSwatch(g, 640, shelfY); g.restore(); }
    if (ru > 0) { g.save(); g.translate(0, (1 - ru) * -60); g.globalAlpha *= ru; drawRuler(g, 1280, shelfY); g.restore(); }
    if (tr > 0) { g.save(); g.translate(0, (1 - tr) * -60); g.globalAlpha *= tr; drawTrophy(g, 960, shelfY, smoothstep(c.forever.start, c.forever.end + 0.4, t)); g.restore(); }
    drawShelf(g, shelfY);
    g.restore();
  }

  /** "You play sport. You practice. You lose. You learn. You get better." as chalk marks. */
  private renderSport(t: number): void {
    const c = this.cue, g = this.g;
    if (t < c.sportLine.start - 0.3 || t > c.playHonesty.start + 0.5) return;
    const fade = 1 - smoothstep(c.noDifferent.start, c.playHonesty.start, t);
    g.save();
    g.globalAlpha = fade;
    // drawn at 1.5x around the lower centre of the frame
    g.translate(960, 900); g.scale(1.5, 1.5); g.translate(-960, -900);
    const y0 = 930, x0 = 700;
    const k = (line: LineTiming) => smoothstep(line.words[line.words.length - 1].start - 0.1, line.end + 0.1, t);
    chalk(g, [x0, y0 - 120], [x0, y0], k(c.practice), 1);                 // practice: a mark
    chalk(g, [x0 + 70, y0 - 120], [x0 + 70, y0], k(c.lose), 2);           // lose: a mark…
    chalk(g, [x0 + 30, y0 - 100], [x0 + 110, y0 - 20], k(c.lose), 3);     // …crossed out
    chalk(g, [x0 + 140, y0 - 120], [x0 + 140, y0], k(c.learn), 4);        // learn: a mark
    const b = k(c.better);                                               // get better: an upward line
    chalk(g, [x0 + 220, y0 - 10], [x0 + 520, y0 - 150], b, 5);
    chalk(g, [x0 + 520, y0 - 150], [x0 + 480, y0 - 160], smoothstep(0.8, 1, b), 6);
    chalk(g, [x0 + 520, y0 - 150], [x0 + 500, y0 - 115], smoothstep(0.8, 1, b), 7);
    g.restore();
  }

  private renderCompass(t: number): void {
    if (!this.dial || !this.frost) return;
    const c = this.cue, g = this.g;
    const ctr = this.compassCentre(t);
    const housing = this.script.housing(t);
    const needle = needleAngle(this.script, t, this.simStart);

    // shadow on the backdrop
    g.save();
    const sh = g.createRadialGradient(ctr[0] + 20, ctr[1] + 30, R * 0.7, ctr[0] + 20, ctr[1] + 30, R * 1.15);
    sh.addColorStop(0, 'rgba(5, 8, 12, 0.55)'); sh.addColorStop(1, 'rgba(5, 8, 12, 0)');
    g.fillStyle = sh;
    g.beginPath(); g.arc(ctr[0] + 20, ctr[1] + 30, R * 1.15, 0, Math.PI * 2); g.fill();
    g.restore();

    // dial, turning with the housing
    g.save();
    g.translate(ctr[0], ctr[1]);
    g.rotate(housing);
    g.drawImage(this.dial, -this.dial.width / 2, -this.dial.height / 2);
    // "How you come home": north glows
    const homeGlow = smoothstep(Wd(c.home, 'home').start, c.home.end + 0.5, t) + 0.6 * smoothstep(Wd(c.turning, 'real').start, c.turning.end, t) * (1 - smoothstep(c.teach.start - 1, c.teach.start, t));
    if (homeGlow > 0.01) {
      const gl = g.createRadialGradient(0, -(RC - 108), 0, 0, -(RC - 108), 120);
      gl.addColorStop(0, `rgba(255, 214, 130, ${0.55 * Math.min(1, homeGlow)})`); gl.addColorStop(1, 'rgba(255, 214, 130, 0)');
      g.fillStyle = gl;
      g.beginPath(); g.arc(0, -(RC - 108), 120, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    // frost: "A frozen needle is not loyal to north — it is only stuck."
    const frost = smoothstep(c.frozen.start, Wd(c.stuck, 'stuck').end, t) * (1 - smoothstep(Wd(c.byMoving, 'moving').start, Wd(c.byMoving, 'moving').start + 1.2, t));

    drawNeedle(g, ctr, needle, smoothstep(Wd(c.home, 'home').start, c.home.end + 0.5, t));

    if (frost > 0.01) {
      g.save();
      g.globalAlpha = frost;
      g.drawImage(this.frost, ctr[0] - this.frost.width / 2, ctr[1] - this.frost.height / 2);
      g.restore();
    }

    // the pin that holds the needle while you "defend yourself"
    const pin = smoothstep(c.defend.start - 0.2, c.defend.start + 0.2, t) * (1 - smoothstep(Wd(c.change, 'change').start, Wd(c.change, 'change').start + 0.3, t));
    if (pin > 0.01) {
      const a = 0.95 + 0.09;
      const p: Pt = [ctr[0] + Math.sin(a) * RC * 0.7, ctr[1] - Math.cos(a) * RC * 0.7];
      g.save();
      g.globalAlpha = pin;
      const cap = g.createRadialGradient(p[0] - 4, p[1] - 4, 1, p[0], p[1], 16);
      cap.addColorStop(0, '#fbe3a2'); cap.addColorStop(1, '#6b4a16');
      g.fillStyle = cap; g.beginPath(); g.arc(p[0], p[1], 14, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    // glass: a soft highlight that does not turn with the housing
    g.save();
    g.beginPath(); g.arc(ctr[0], ctr[1], RC, 0, Math.PI * 2); g.clip();
    const glass = g.createLinearGradient(ctr[0] - RC, ctr[1] - RC, ctr[0] + RC * 0.2, ctr[1]);
    glass.addColorStop(0, 'rgba(255, 255, 255, 0.22)'); glass.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)'); glass.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = glass;
    g.fillRect(ctr[0] - RC, ctr[1] - RC, RC * 2, RC * 2);
    g.restore();
  }
}
