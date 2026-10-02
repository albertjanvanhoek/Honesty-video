// Scenes 0:00–0:59: honesty as something you own (rain, a museum of possessions, an eye, height
// marks, a trophy sealed under glass that shatters), then honesty as a sport you play (a stadium,
// a running track), a flight over the night city, and the compass slamming down as drop A hits.
import {
  type Frame, type Pt, type Scene, H, L, W, camera, clamp01, cutAt, ease, hash, lerp, lineVis, lyric, mulberry32, smooth, word,
} from './engine';
import { type LineTiming } from './lyrics';
import { drawTrophy, makeDial, drawNeedle } from './compass';
import { figure, tornRect } from './story';

// ---------------------------------------------------------------- shared pieces

export function fill(g: CanvasRenderingContext2D, c: string): void {
  g.fillStyle = c;
  g.fillRect(-W, -H, W * 3, H * 3);
}

export function vignette(g: CanvasRenderingContext2D, k = 0.7): void {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${k})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  g.restore();
}

/**
 * Lyrics as a caption for whichever of `lines` is being sung: one line at a time (a line gives
 * way as the next one arrives), on a soft dark band so it reads over bright parts of the scene.
 */
export function captions(f: Frame, lines: LineTiming[], y = 900, size = 66, extra: Partial<Parameters<typeof lyric>[2]> = {}): void {
  const g = f.g;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  lines.forEach((line, i) => {
    const next = lines[i + 1];
    // a clean handover: the old line is gone before the next one fades in
    const v = lineVis(line, f.t, 0.15) * (next ? 1 - smooth(next.start - 0.34, next.start - 0.17, f.t) : 1);
    if (v <= 0.001) return;
    const band = g.createLinearGradient(0, y - size * 1.6, 0, y + size * 1.6);
    band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(0.5, `rgba(0,0,0,${0.5 * v})`); band.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = band;
    g.fillRect(0, y - size * 1.6, W, size * 3.2);
    lyric(f, line, { x: W / 2, y, size, wrap: 1500, ...extra }, v);
  });
  g.restore();
}

/** Blurred city lights behind rainy glass. */
function bokeh(g: CanvasRenderingContext2D, t: number, n = 46, seed = 3, drift = 0): void {
  const rand = mulberry32(seed);
  const cols = ['255, 190, 110', '255, 150, 90', '230, 200, 160', '140, 170, 200', '255, 120, 80'];
  for (let i = 0; i < n; i++) {
    const x = rand() * W * 1.2 - W * 0.1 + Math.sin(t * 0.2 + i) * 8 + drift * (0.4 + rand());
    const y = H * 0.25 + rand() * H * 0.65;
    const r = 18 + rand() * 80;
    const a = 0.18 + rand() * 0.35;
    const c = cols[Math.floor(rand() * cols.length)];
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${c}, ${a})`);
    gr.addColorStop(0.75, `rgba(${c}, ${a * 0.7})`);
    gr.addColorStop(1, `rgba(${c}, 0)`);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

/** Raindrops on glass: still beads and a few running down. */
function droplets(g: CanvasRenderingContext2D, t: number, seed = 9): void {
  const rand = mulberry32(seed);
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, r = 2 + rand() * 5;
    g.fillStyle = 'rgba(200, 215, 225, 0.18)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = rand() * W, speed = 40 + rand() * 120, r = 4 + rand() * 4;
    const y = ((rand() * H + t * speed) % (H + 200)) - 100;
    g.strokeStyle = 'rgba(200, 215, 225, 0.16)'; g.lineWidth = r * 0.9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y - 120); g.lineTo(x + Math.sin(y * 0.02) * 3, y); g.stroke();
    g.fillStyle = 'rgba(230, 240, 245, 0.4)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

let haze: HTMLCanvasElement | null = null;

/** Rainy night glass; `write` wipes handwriting through the mist. */
function rainGlass(f: Frame, drift: number, write?: { text: string; x: number; y: number; size: number; k: number }): void {
  const g = f.g;
  fill(g, '#0c1418');
  bokeh(g, f.t, 46, 3, drift);
  haze ??= Object.assign(document.createElement('canvas'), { width: W, height: H });
  const h = haze.getContext('2d')!;
  h.setTransform(1, 0, 0, 1, 0, 0);
  h.globalCompositeOperation = 'source-over';
  h.clearRect(0, 0, W, H);
  h.fillStyle = 'rgba(28, 40, 46, 0.62)';
  h.fillRect(0, 0, W, H);
  if (write && write.k > 0) {
    h.globalCompositeOperation = 'destination-out';
    h.font = `600 ${write.size}px Caveat, cursive`;
    h.textAlign = 'center'; h.textBaseline = 'middle';
    const tw = h.measureText(write.text).width;
    h.save();
    h.beginPath(); h.rect(write.x - tw / 2 - 20, write.y - write.size, (tw + 40) * clamp01(write.k), write.size * 2); h.clip();
    h.shadowColor = 'black'; h.shadowBlur = 14;
    h.fillStyle = 'black';
    h.fillText(write.text, write.x, write.y);
    h.restore();
  }
  g.drawImage(haze, 0, 0);
  droplets(g, f.t);
}

/** A ragged paper strip with the title, as on the mood board. */
export function titleStrip(g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, a: number): void {
  if (a <= 0.001) return;
  const w = 1180, h = 300;
  g.save();
  g.globalAlpha *= a;
  g.translate(x, y); g.rotate(rot); g.scale(s, s); g.translate(-w / 2, -h / 2);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 20;
  tornRect(g, w, h, 77);
  g.fillStyle = '#e9e1d2'; g.fill();
  g.restore();
  g.fillStyle = '#14100c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 74px "Cormorant Garamond", serif';
  g.letterSpacing = '14px';
  g.fillText('HONESTY IS A COMPASS', w / 2 + 7, 118);
  g.font = '600 22px "Cormorant Garamond", serif';
  g.letterSpacing = '7px';
  g.globalAlpha *= 0.8;
  g.fillText('TRUTH  /  TURNING  /  GROWTH  /  COURAGE  /  COMING HOME', w / 2 + 4, 196);
  g.letterSpacing = '0px';
  g.font = '600 40px Caveat, cursive';
  g.fillStyle = '#4a3a2a';
  g.fillText('produced by Emergence', w / 2, 252);
  g.restore();
}

/** A museum spotlight from above. */
function spotlight(g: CanvasRenderingContext2D, x: number, top: number, bottom: number, w: number, a = 0.35): void {
  const gr = g.createLinearGradient(0, top, 0, bottom);
  gr.addColorStop(0, `rgba(255, 228, 180, ${a})`);
  gr.addColorStop(1, 'rgba(255, 228, 180, 0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - 30, top); g.lineTo(x + 30, top); g.lineTo(x + w, bottom); g.lineTo(x - w, bottom); g.closePath(); g.fill();
}

function pedestal(g: CanvasRenderingContext2D, x: number, y: number): void {
  const gr = g.createLinearGradient(x - 160, 0, x + 160, 0);
  gr.addColorStop(0, '#1d2326'); gr.addColorStop(0.5, '#3a4144'); gr.addColorStop(1, '#151a1c');
  g.fillStyle = gr;
  g.fillRect(x - 150, y, 300, 420);
  g.fillStyle = '#4a5255'; g.fillRect(x - 170, y - 18, 340, 22);
}

function plaque(g: CanvasRenderingContext2D, x: number, y: number, lines: string[]): void {
  const w = 360, h = 44 + lines.length * 34;
  const gr = g.createLinearGradient(x - w / 2, y, x + w / 2, y + h);
  gr.addColorStop(0, '#d9b874'); gr.addColorStop(0.5, '#a7843f'); gr.addColorStop(1, '#6f5426');
  g.fillStyle = gr; g.fillRect(x - w / 2, y, w, h);
  g.strokeStyle = 'rgba(40, 26, 8, 0.6)'; g.lineWidth = 3; g.strokeRect(x - w / 2 + 8, y + 8, w - 16, h - 16);
  g.fillStyle = '#2a1c0a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => {
    g.font = i === 0 ? '700 30px "Cormorant Garamond", serif' : 'italic 600 26px "Cormorant Garamond", serif';
    g.letterSpacing = i === 0 ? '6px' : '0px';
    g.fillText(l, x, y + 38 + i * 34);
  });
  g.letterSpacing = '0px';
}

/** A close-up iris: radial fibres around the pupil, with a window caught in the light. */
function iris(g: CanvasRenderingContext2D, x: number, y: number, r: number, warm: number, seed = 5): void {
  const rand = mulberry32(seed);
  // the white of the eye and the lids
  g.save();
  g.fillStyle = '#d8d2c8';
  g.beginPath(); g.ellipse(x, y, r * 2.6, r * 1.25, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x, y, r * 2.6, r * 1.25, 0, 0, Math.PI * 2); g.clip();
  const sh = g.createRadialGradient(x, y, r, x, y, r * 2.6);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60, 30, 20, 0.7)');
  g.fillStyle = sh; g.fillRect(x - r * 3, y - r * 2, r * 6, r * 4);
  // the iris
  const base = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  base.addColorStop(0, lerpColor('#7a5a2e', '#e3a24f', warm));
  base.addColorStop(0.6, lerpColor('#4f6a72', '#b97a3a', warm));
  base.addColorStop(1, '#1a1612');
  g.fillStyle = base;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2 + rand() * 0.02;
    const r0 = r * (0.3 + rand() * 0.08), r1 = r * (0.75 + rand() * 0.22);
    g.strokeStyle = rand() < 0.5 ? `rgba(240, 210, 150, ${0.12 + rand() * 0.2})` : `rgba(20, 15, 10, ${0.12 + rand() * 0.2})`;
    g.lineWidth = 1 + rand() * 2;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
  }
  g.fillStyle = '#050505';
  g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
  // the window, reflected
  g.fillStyle = 'rgba(255, 245, 230, 0.75)';
  g.fillRect(x - r * 0.42, y - r * 0.5, r * 0.18, r * 0.24);
  g.fillRect(x - r * 0.21, y - r * 0.5, r * 0.18, r * 0.24);
  g.restore();
}

function lerpColor(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp01(t)))).join(',')})`;
}

// ---------------------------------------------------------------- the scenes

let dial: HTMLCanvasElement | null = null;

export function scenesA(): Scene[] {
  const people = L('People say');
  const honest = L('I am honest');
  const own = L('something you own');
  const eyes = L('color of your eyes');
  const height = L('Like your height');
  const trophy = L('trophy you once won');
  const forever = L('keep forever');
  const notHow = L('not how honesty works');
  const nobody = L('Nobody says');
  const sportPlay = L('I am the sport I play');
  const playSport = L('You play sport');
  const practice = L('You practice');
  const lose = L('You lose');
  const learn = L('You learn');
  const better = L('You get better');
  const andH = L('And honesty');
  const noDiff = L('honesty is no different');
  const playH = L('You play honesty');

  return [
    {
      id: 'title',
      from: 0,
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2 + f.lt * 6, H / 2, 1.0 + 0.03 * f.lt);
        rainGlass(f, f.lt * 10);
        g.restore();
        titleStrip(g, W / 2, H * 0.47, lerp(0.9, 0.96, f.p), -0.01, smooth(0.2, 1.0, f.t) * (1 - smooth(f.dur - 0.5, f.dur, f.lt)));
        vignette(g);
      },
    },
    {
      id: 'rain-window',
      from: cutAt('People say'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2 + 40 + f.lt * 18, H / 2, 1.06 + 0.02 * f.lt, -0.01);
        rainGlass(f, 60 + f.lt * 24, {
          text: 'I am honest.', x: W / 2, y: H * 0.46, size: 210,
          k: smooth(honest.words[0].start - 0.2, honest.end, f.t),
        });
        g.restore();
        captions(f, [people], 860, 58);
        vignette(g);
      },
    },
    {
      id: 'museum',
      from: cutAt('something you own'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2 - 80 + f.lt * 26, H / 2 + 40, 1.0 + 0.04 * f.lt);
        fill(g, '#121719');
        spotlight(g, W / 2, -50, 760, 300, 0.4);
        pedestal(g, W / 2, 620);
        plaque(g, W / 2, 680, ['HONESTY', 'property of the owner']);
        g.restore();
        captions(f, [own], 900, 64, { key: ['own'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'eye',
      from: cutAt('color of your eyes'),
      draw: (f) => {
        const g = f.g;
        g.save();
        // pull out from the pupil
        camera(f, W / 2, H / 2, lerp(4.2, 1.3, ease.outCubic(f.lt / 1.6)), 0.04 * f.p);
        fill(g, '#2a1d17');
        iris(g, W / 2, H / 2, 210, 0.15);
        g.restore();
        captions(f, [eyes], 920, 64, { key: ['eyes'] });
        vignette(g, 0.75);
      },
    },
    {
      id: 'height',
      from: cutAt('Like your height'),
      draw: (f) => {
        const g = f.g;
        g.save();
        // tilt up the doorframe, past years of pencil marks
        camera(f, W / 2, lerp(1100, 380, ease.inOutCubic(f.p)), 1.15);
        fill(g, '#1e2224');
        const wood = g.createLinearGradient(780, 0, 1000, 0);
        wood.addColorStop(0, '#5b4632'); wood.addColorStop(0.5, '#8a6c4c'); wood.addColorStop(1, '#4a3826');
        g.fillStyle = wood; g.fillRect(800, -400, 180, 2000);
        g.fillStyle = '#2a2420'; g.fillRect(980, -400, 30, 2000);
        const marks: Array<[number, string]> = [[1300, 'age 3'], [1120, 'age 5'], [960, 'age 8'], [780, 'age 11'], [610, 'age 14'], [470, 'age 18']];
        g.strokeStyle = '#2b2018'; g.fillStyle = '#2b2018'; g.lineWidth = 4;
        g.font = '600 40px Caveat, cursive'; g.textAlign = 'left'; g.textBaseline = 'middle';
        for (const [y, txt] of marks) {
          g.beginPath(); g.moveTo(805, y); g.lineTo(930, y + 2); g.stroke();
          g.fillText(txt, 820, y - 26);
        }
        g.restore();
        captions(f, [height], 920, 64, { key: ['height'] });
        vignette(g, 0.75);
      },
    },
    {
      id: 'trophy',
      from: cutAt('trophy you once won'),
      draw: (f) => {
        const g = f.g;
        const domeK = smooth(forever.start, forever.start + 0.5, f.t);
        const slam = forever.start <= f.t ? Math.exp(-(f.t - forever.start - 0.5) * 8) * (f.t > forever.start + 0.5 ? 1 : 0) : 0;
        g.save();
        camera(f, W / 2 + Math.sin(f.lt * 0.6) * 40, H / 2 + 60 + slam * 6, lerp(1.25, 1.05, ease.outCubic(f.p)));
        fill(g, '#121719');
        spotlight(g, W / 2, -50, 760, 280, 0.45);
        pedestal(g, W / 2, 640);
        drawTrophy(g, W / 2, 630, domeK);
        plaque(g, W / 2, 700, ['HONEST', 'won once, kept forever']);
        g.restore();
        captions(f, [trophy, forever], 930, 62, { key: ['trophy', 'forever'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'shatter',
      from: cutAt('not how honesty works'),
      draw: (f) => {
        const g = f.g;
        const at = word(notHow, 'not').start;
        const k = Math.max(0, f.t - at);
        g.save();
        camera(f, W / 2, H / 2 + 60, 1.05 + 0.03 * f.lt, 0, 2);
        fill(g, '#121719');
        spotlight(g, W / 2, -50, 760, 280, 0.45);
        pedestal(g, W / 2, 640);
        drawTrophy(g, W / 2, 630, f.t < at ? 1 : 0);
        // the glass dome bursts into shards
        if (f.t >= at) {
          const rand = mulberry32(44);
          for (let i = 0; i < 90; i++) {
            const a = rand() * Math.PI * 2, sp = 300 + rand() * 900;
            const x = W / 2 + Math.cos(a) * (60 + sp * k), y = 420 + Math.sin(a) * (80 + sp * k * 0.6) + 900 * k * k;
            const s = 10 + rand() * 30, r = rand() * 6 + k * (rand() - 0.5) * 12;
            g.save(); g.translate(x, y); g.rotate(r);
            g.fillStyle = `rgba(220, 235, 245, ${0.35 * (1 - clamp01(k / 1.6))})`;
            g.strokeStyle = `rgba(255, 255, 255, ${0.6 * (1 - clamp01(k / 1.6))})`; g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.6, s * 0.5); g.lineTo(-s * 0.5, s * 0.3); g.closePath(); g.fill(); g.stroke();
            g.restore();
          }
          g.fillStyle = `rgba(255, 245, 230, ${0.5 * Math.exp(-k * 6)})`;
          g.fillRect(-W, -H, W * 3, H * 3);
        }
        g.restore();
        captions(f, [notHow], 920, 66, { key: ['not'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'stadium',
      from: cutAt('Nobody says'),
      draw: (f) => {
        const g = f.g;
        g.save();
        // a crane down into an empty stadium at night
        camera(f, W / 2, lerp(200, 560, ease.inOutCubic(f.p)), lerp(0.9, 1.1, f.p));
        const sky = g.createLinearGradient(0, -400, 0, 700);
        sky.addColorStop(0, '#05080a'); sky.addColorStop(1, '#16232b');
        g.fillStyle = sky; g.fillRect(-W, -H, W * 3, H * 3);
        // floodlights
        for (const x of [260, 1660]) {
          g.fillStyle = '#0b0f11'; g.fillRect(x - 8, -200, 16, 760);
          const gl = g.createRadialGradient(x, -180, 0, x, -180, 420);
          gl.addColorStop(0, 'rgba(255, 245, 225, 0.9)'); gl.addColorStop(0.1, 'rgba(255, 235, 200, 0.5)'); gl.addColorStop(1, 'rgba(255, 235, 200, 0)');
          g.fillStyle = gl; g.beginPath(); g.arc(x, -180, 420, 0, Math.PI * 2); g.fill();
        }
        // stands and the field
        g.fillStyle = '#0e1417';
        g.beginPath(); g.moveTo(-W, 560); g.lineTo(W * 2, 560); g.lineTo(W * 2, 300); g.lineTo(-W, 300); g.fill();
        const field = g.createLinearGradient(0, 560, 0, 1300);
        field.addColorStop(0, '#5a2c22'); field.addColorStop(1, '#2a140f');
        g.fillStyle = field; g.fillRect(-W, 560, W * 3, 900);
        // a scoreboard with the line on it
        g.fillStyle = '#050607'; g.fillRect(560, 60, 800, 200);
        g.strokeStyle = '#2a2f31'; g.lineWidth = 8; g.strokeRect(560, 60, 800, 200);
        g.restore();
        g.save();
        camera(f, W / 2, lerp(200, 560, ease.inOutCubic(f.p)), lerp(0.9, 1.1, f.p));
        lyric(f, sportPlay, { x: W / 2, y: 175, size: 46, font: 'caps', color: '#ffb35c', shadow: false }, smooth(sportPlay.start - 0.2, sportPlay.start, f.t));
        // the scoreboard holds "Nobody says:" until the next line comes up
        lyric(f, nobody, { x: W / 2, y: 175, size: 60, font: 'caps', color: '#ffb35c', shadow: false }, smooth(nobody.start - 0.2, nobody.start, f.t) * (1 - smooth(sportPlay.start - 0.25, sportPlay.start - 0.05, f.t)));
        g.restore();
        vignette(g, 0.75);
      },
    },
    {
      id: 'track',
      from: cutAt('You play sport'),
      draw: (f) => {
        const g = f.g;
        const fall = smooth(word(lose, 'lose').start, word(lose, 'lose').start + 0.35, f.t) * (1 - smooth(learn.start, learn.start + 0.6, f.t));
        const speed = lerp(1, 2.2, smooth(better.start, better.end, f.t)) * (1 - fall * 0.85);
        // distance run so far: a pure function of time
        const dist = f.lt * 900 + 900 * Math.max(0, f.t - better.start) * 1.2;
        g.save();
        camera(f, W / 2 + Math.sin(f.lt * 9) * 4 * speed, H / 2 + fall * 20, 1.0 + 0.02 * speed, Math.sin(f.lt * 9) * 0.004 * speed + fall * 0.05);
        const sky = g.createLinearGradient(0, 0, 0, 500);
        sky.addColorStop(0, '#05080a'); sky.addColorStop(1, '#1a2a33');
        g.fillStyle = sky; g.fillRect(-W, -H, W * 3, H * 3);
        // the track in perspective, rushing toward the camera
        const vx = W / 2, vy = 420;
        g.fillStyle = '#5c2d22';
        g.beginPath(); g.moveTo(vx - 40, vy); g.lineTo(vx + 40, vy); g.lineTo(W * 1.6, H * 1.3); g.lineTo(-W * 0.6, H * 1.3); g.fill();
        g.strokeStyle = 'rgba(240, 235, 225, 0.7)'; g.lineWidth = 3;
        for (let lane = -4; lane <= 4; lane++) {
          g.beginPath(); g.moveTo(vx + lane * 10, vy); g.lineTo(vx + lane * 330, H * 1.3); g.stroke();
        }
        // dashes and hurdles coming at us
        for (let i = 0; i < 14; i++) {
          const z = ((i * 260 - dist * 0.9) % 3640 + 3640) % 3640 + 60;
          const s = 400 / z;
          const y = vy + 700 * s;
          if (y > H * 1.3) continue;
          g.fillStyle = `rgba(240, 235, 225, ${clamp01(s * 2)})`;
          g.fillRect(vx - 6 - 330 * s, y, 12 * s * 6, 4 * s * 4);
          if (i % 5 === 0) {
            g.fillStyle = '#e9e1d2';
            g.fillRect(vx - 180 * s, y - 160 * s, 360 * s, 18 * s);
            g.fillStyle = '#14100c';
            g.fillRect(vx - 170 * s, y - 145 * s, 10 * s, 145 * s); g.fillRect(vx + 160 * s, y - 145 * s, 10 * s, 145 * s);
          }
        }
        // the runner
        g.save();
        g.translate(W / 2, 980);
        g.rotate(fall * 1.2);
        figure(g, [0, 0], 380, dist * 0.012, 1 - fall, 0, 0);
        g.restore();
        g.restore();
        captions(f, [playSport, practice, lose, learn, better], 180, 70, { key: ['lose', 'learn', 'better'] });
        vignette(g, 0.7);
      },
    },
    {
      id: 'night-flight',
      from: cutAt('And honesty'),
      draw: (f) => {
        const g = f.g;
        // flying over the rainy city at night, faster as the build rises
        const run = f.lt * 220 + Math.pow(f.lt, 2) * 14;
        g.save();
        camera(f, W / 2, H / 2, 1.1 + 0.015 * f.lt, -0.12 + 0.01 * f.lt);
        fill(g, '#06090b');
        const cell = 120;
        const ox = run % cell, row0 = Math.floor(run / cell);
        for (let gy = -6; gy < 16; gy++) {
          for (let gx = -8; gx < 24; gx++) {
            const id = (row0 + gy) * 131 + gx;
            const x = gx * cell, y = gy * cell + ox;
            g.fillStyle = `rgb(${14 + hash(id) * 12}, ${18 + hash(id) * 12}, ${22 + hash(id) * 14})`;
            g.fillRect(x + 14, y + 14, cell - 28, cell - 28);
            // lit windows from above
            if (hash(id + 3) > 0.45) {
              g.fillStyle = `rgba(255, 190, 110, ${0.25 + hash(id + 9) * 0.4})`;
              g.fillRect(x + 24 + hash(id + 5) * 50, y + 24 + hash(id + 6) * 50, 10, 10);
            }
          }
        }
        // car lights streaking along the streets
        for (let i = 0; i < 40; i++) {
          const lane = (i % 16) - 4;
          const y = ((hash(i) * 2400 + f.lt * (300 + hash(i + 1) * 400) * (i % 2 ? 1 : -1) + run) % 2400 + 2400) % 2400 - 600;
          g.fillStyle = i % 2 ? 'rgba(255, 90, 60, 0.8)' : 'rgba(255, 240, 210, 0.85)';
          g.fillRect(lane * cell - 4, y, 6, 26);
        }
        g.restore();
        // rain streaks across the lens
        g.strokeStyle = 'rgba(200, 215, 225, 0.12)'; g.lineWidth = 2;
        const rand = mulberry32(Math.floor(f.t * 24));
        for (let i = 0; i < 80; i++) {
          const x = rand() * W, y = rand() * H;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - 12, y + 60); g.stroke();
        }
        captions(f, [andH, noDiff], 880, 72, { key: ['different'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'map-slam',
      from: cutAt('You play honesty'),
      draw: (f) => {
        const g = f.g;
        dial ??= makeDial();
        const land = ease.outExpo(f.lt / 0.35);
        g.save();
        camera(f, W / 2, H / 2, lerp(1.25, 1.0, ease.outCubic(f.lt / 2)), lerp(-0.08, 0, ease.outCubic(f.lt / 2)), 1.5);
        // an old paper map
        fill(g, '#cbbfa6');
        const rand = mulberry32(8);
        g.strokeStyle = 'rgba(120, 90, 60, 0.35)'; g.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
          const cx = rand() * W, cy = rand() * H, r = 60 + rand() * 260;
          for (let k = 0; k < 4; k++) {
            g.beginPath();
            for (let a = 0; a <= 64; a++) {
              const th = (a / 64) * Math.PI * 2;
              const rr = (r - k * 24) * (1 + 0.15 * Math.sin(th * 3 + i));
              const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.7;
              if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
          }
        }
        g.strokeStyle = 'rgba(150, 50, 40, 0.45)'; g.lineWidth = 5; g.setLineDash([18, 12]);
        g.beginPath(); g.moveTo(-100, 900); g.bezierCurveTo(500, 700, 900, 980, 1300, 500); g.lineTo(2100, 300); g.stroke();
        g.setLineDash([]);
        // the compass drops onto the map on the drop
        const c: Pt = [W / 2, H / 2 + 40];
        const s = lerp(3.2, 0.92, land);
        g.save();
        g.translate(c[0], c[1]); g.scale(s, s);
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.beginPath(); g.arc(14, 22, 480, 0, Math.PI * 2); g.fill();
        g.drawImage(dial, -dial.width / 2, -dial.height / 2);
        drawNeedle(g, [0, 0], 0.5 * Math.exp(-f.lt * 1.4) * Math.cos(f.lt * 9) + 0.05 * f.kick * f.drop * Math.sin(f.beat * Math.PI), 0);
        g.restore();
        g.restore();
        // the impact flash
        g.fillStyle = `rgba(255, 230, 190, ${0.6 * Math.exp(-f.lt * 5) * (f.lt > 0.3 ? 1 : 0)})`;
        g.fillRect(0, 0, W, H);
        captions(f, [playH], 940, 84, { key: ['play'] });
        vignette(g, 0.7);
      },
    },
  ];
}
