// Scenes 0:59–1:43: the drop A montage (every day, every conversation, every mistake, every moment),
// a stormy sea and lightning on "You were wrong", the crossroads of defend or change, the cracked
// mirror and the journal, then the breakdown: a sprout's time-lapse and a hand touching water.
import {
  type Frame, type Pt, type Scene, H, L, W, camera, clamp01, cutAt, ease, lerp, lineVis, lyric, mulberry32, smooth, word,
} from './engine';
import { captions, fill, vignette } from './scenes-a';
import { figure } from './story';

/** Big montage word, slammed on the beat. */
function slamWord(f: Frame, text: string, y: number, size: number, color = '#f4ece0'): void {
  const g = f.g;
  const k = ease.outExpo(f.lt / 0.18);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(W / 2, y);
  g.scale(lerp(1.5, 1, k), lerp(1.5, 1, k));
  g.globalAlpha = k;
  g.font = `700 ${size}px "Cormorant Garamond", serif`;
  g.letterSpacing = `${size * 0.14}px`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size * 0.3;
  g.fillStyle = color;
  g.fillText(text, size * 0.07, 0);
  g.restore();
}

function lightning(g: CanvasRenderingContext2D, x: number, seed: number, k: number): void {
  if (k <= 0.01) return;
  const rand = mulberry32(seed);
  g.save();
  g.strokeStyle = `rgba(235, 240, 255, ${k})`; g.lineWidth = 5; g.lineJoin = 'miter';
  g.shadowColor = 'rgba(200, 220, 255, 0.9)'; g.shadowBlur = 30;
  let p: Pt = [x, -20];
  g.beginPath(); g.moveTo(p[0], p[1]);
  while (p[1] < 760) {
    p = [p[0] + (rand() - 0.5) * 90, p[1] + 30 + rand() * 60];
    g.lineTo(p[0], p[1]);
    if (rand() < 0.15) {
      const b: Pt = [p[0] + (rand() - 0.5) * 200, p[1] + 80 + rand() * 80];
      g.moveTo(p[0], p[1]); g.lineTo(b[0], b[1]); g.moveTo(p[0], p[1]);
    }
  }
  g.stroke();
  g.restore();
}

export function scenesB(): Scene[] {
  const day = L('Every day');
  const moment = L('Every moment');
  const wrong = L('You were wrong');
  const question = L('then comes the question');
  const defend = L('defend yourself');
  const change = L('Or do you change');
  const notSaying = L('honesty is not saying');
  const right = L('I was always right');
  const saying = L('Honesty is saying');
  const thought = L('I thought this');
  const learned = L('I learned that');
  const andNow = L('And now');
  const closer = L('closer to true');
  const weakness = L('That is not weakness');
  const growth = L('That is growth');
  const courage = L('That is courage');
  const goal = L('goal of life');
  const become = L('is not to become someone');
  const never = L('who never changes');
  const goal2 = L('The goal is to become');
  const well = L('who changes well');

  return [
    {
      id: 'every-day',
      from: cutAt('Every day'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2, H / 2, 1.05 + 0.04 * f.p, 0.02, 2);
        fill(g, '#16120e');
        // a desk calendar: a page tears off on every beat
        const n = 12 + Math.max(0, Math.floor(f.lt * 3.45));
        const tear = f.beat % 1;
        for (let i = 0; i < 2; i++) {
          const fl = i === 0 ? 0 : ease.outCubic(tear);
          g.save();
          g.translate(W / 2 + fl * 600, H / 2 + 40 - fl * 300);
          g.rotate(fl * 0.8);
          g.globalAlpha = 1 - fl;
          g.fillStyle = '#e9e1d2'; g.fillRect(-260, -300, 520, 600);
          g.fillStyle = '#b23a2a'; g.fillRect(-260, -300, 520, 110);
          g.fillStyle = '#14100c'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = '700 300px "Cormorant Garamond", serif';
          g.fillText(String(n - i + 1), 0, 70);
          g.restore();
        }
        g.restore();
        slamWord(f, 'EVERY DAY', 150, 110);
        lyric(f, day, { x: W / 2, y: 980, size: 40, shadow: true }, 0);
        vignette(g, 0.8);
      },
    },
    {
      id: 'every-conversation',
      from: cutAt('Every conversation'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2, H / 2, 1.0 + 0.06 * f.p, -0.02, 2);
        fill(g, '#0f1416');
        const glow = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
        glow.addColorStop(0, 'rgba(205, 146, 79, 0.35)'); glow.addColorStop(1, 'rgba(205, 146, 79, 0)');
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        // two heads in profile, and the words between them
        for (const side of [-1, 1]) {
          g.save();
          g.translate(W / 2 + side * 430, H / 2 + 120);
          g.scale(-side, 1);
          g.fillStyle = '#050708';
          g.beginPath();
          g.moveTo(-160, 420); g.lineTo(-170, 120); g.bezierCurveTo(-200, -120, -40, -260, 70, -180);
          g.bezierCurveTo(130, -140, 120, -80, 150, -40); g.lineTo(130, -10); g.bezierCurveTo(140, 20, 120, 40, 100, 50);
          g.lineTo(110, 80); g.bezierCurveTo(90, 120, 40, 120, 20, 150); g.lineTo(40, 420); g.closePath(); g.fill();
          g.restore();
        }
        for (let i = 0; i < 7; i++) {
          const ph = (f.beat * 0.5 + i / 7) % 1;
          g.strokeStyle = `rgba(232, 170, 96, ${0.8 * (1 - ph)})`; g.lineWidth = 6;
          g.beginPath(); g.arc(W / 2 - 260 + ph * 520, H / 2 + 60, 30 + 90 * Math.sin(Math.PI * ph), -0.9, 0.9); g.stroke();
        }
        g.restore();
        slamWord(f, 'EVERY CONVERSATION', 150, 96);
        vignette(g, 0.8);
      },
    },
    {
      id: 'every-mistake',
      from: cutAt('Every mistake'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2, H / 2, 1.1, 0.05 * f.p, 2);
        fill(g, '#3b2c20');
        // a desk seen from above: papers, and a cup that tips and spills
        g.fillStyle = '#e9e1d2';
        g.save(); g.translate(760, 560); g.rotate(-0.08); g.fillRect(-300, -380, 600, 760); g.restore();
        g.strokeStyle = 'rgba(40, 40, 60, 0.25)'; g.lineWidth = 2;
        for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(500, 260 + i * 46); g.lineTo(1000, 220 + i * 46); g.stroke(); }
        const tip = ease.outCubic(f.lt / 0.5);
        const spill = ease.outCubic((f.lt - 0.35) / 1.2);
        if (spill > 0) {
          g.fillStyle = 'rgba(70, 40, 18, 0.85)';
          g.beginPath();
          for (let a = 0; a <= 40; a++) {
            const th = (a / 40) * Math.PI * 2;
            const r = 300 * spill * (0.75 + 0.25 * Math.sin(th * 5 + 1) + 0.1 * Math.sin(th * 11));
            const x = 1060 + Math.cos(th) * r * 1.2 - 160 * spill, y = 600 + Math.sin(th) * r * 0.8;
            if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.fill();
        }
        g.save();
        g.translate(1240, 540); g.rotate(tip * 1.5);
        g.fillStyle = '#e9e1d2'; g.beginPath(); g.ellipse(0, 0, 110, 110 - tip * 40, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#4a2a14'; g.beginPath(); g.ellipse(0, 0, 86, 86 - tip * 30, 0, 0, Math.PI * 2); g.fill();
        g.lineWidth = 22; g.strokeStyle = '#e9e1d2'; g.beginPath(); g.arc(125, 0, 40, -1.2, 1.2); g.stroke();
        g.restore();
        g.restore();
        slamWord(f, 'EVERY MISTAKE', 150, 110);
        vignette(g, 0.8);
      },
    },
    {
      id: 'every-moment',
      from: cutAt('Every moment'),
      draw: (f) => {
        const g = f.g;
        const spin = smooth(word(moment, 'reality').start, moment.end, f.t);
        g.save();
        camera(f, W / 2, H / 2 + 40, lerp(1.0, 1.5, ease.inExpo(f.p)), spin * 0.2, 2);
        fill(g, '#0e1214');
        // a clock: ticks on every beat, then spins as reality speaks
        const c: Pt = [W / 2, H / 2 + 40];
        g.fillStyle = '#e9e1d2'; g.beginPath(); g.arc(c[0], c[1], 360, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#14100c'; g.lineWidth = 10; g.stroke();
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2;
          g.lineWidth = i % 5 ? 3 : 8;
          g.beginPath();
          g.moveTo(c[0] + Math.cos(a) * 330, c[1] + Math.sin(a) * 330);
          g.lineTo(c[0] + Math.cos(a) * (i % 5 ? 310 : 290), c[1] + Math.sin(a) * (i % 5 ? 310 : 290));
          g.stroke();
        }
        const sec = Math.floor(f.beat) / 60 * Math.PI * 2 + spin * spin * 40;
        const min = 1.1 + spin * spin * 6;
        const hand = (a: number, len: number, w: number, col: string) => {
          g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
          g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.sin(a) * len, c[1] - Math.cos(a) * len); g.stroke();
        };
        hand(min, 200, 16, '#14100c');
        hand(min * 0.2 + 2, 140, 20, '#14100c');
        hand(sec, 300, 5, '#b23a2a');
        g.restore();
        slamWord(f, 'EVERY MOMENT', 130, 104);
        captions(f, [moment], 990, 50, { key: ['reality'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'storm-sea',
      from: cutAt('You were wrong'),
      draw: (f) => {
        const g = f.g;
        const strike = word(wrong, 'wrong').start;
        const k = f.t >= strike ? Math.exp(-(f.t - strike) * 3) : 0;
        f.land({ phase: 0.16, rain: 1, ridges: 0.15, sea: 1, flight: 0.4 + f.lt * 0.05, roll: Math.sin(f.lt * 1.3) * 0.04, zoom: 1.08, lift: 0.04, flash: k });
        g.save();
        camera(f, W / 2, H / 2, 1, 0, 2);
        lightning(g, 1220, 7, k * 1.2);
        // a lone figure on a rock in the spray
        g.fillStyle = '#05080a';
        g.beginPath(); g.moveTo(380, H); g.lineTo(440, 820); g.lineTo(560, 780); g.lineTo(690, 830); g.lineTo(760, H); g.fill();
        figure(g, [570, 785], 170, 0, 0, 0, 0);
        g.restore();
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        lyric(f, wrong, { x: W / 2, y: 300, size: 120, key: ['wrong'] }, lineVis(wrong, f.t));
        g.restore();
        vignette(g, 0.75);
      },
    },
    {
      id: 'crossroads',
      from: cutAt('then comes the question'),
      draw: (f) => {
        const g = f.g;
        const lean = smooth(word(defend, 'defend').start, word(defend, 'defend').end + 0.2, f.t);
        const whip = ease.inOutCubic((f.t - word(change, 'change').start + 0.1) / 0.45);
        f.land({ phase: 0.22, rain: 0.8, ridges: 1, flight: 1.0, roll: lerp(-0.03 * lean, 0.05, whip), zoom: 1.05 + 0.05 * f.p, lift: -0.02 });
        g.save();
        camera(f, W / 2 - 120 * lean + 260 * whip, H / 2 + 60, 1.0 + 0.08 * f.p, lerp(-0.03 * lean, 0.05, whip));
        // two roads leaving the fork
        const fork: Pt = [W / 2, 760];
        const road = (dir: number, lit: number) => {
          g.fillStyle = lit > 0 ? `rgba(${lerp(40, 205, lit)}, ${lerp(44, 146, lit)}, ${lerp(46, 79, lit)}, 0.9)` : '#1c2326';
          g.beginPath();
          g.moveTo(fork[0] - 140, H + 40); g.lineTo(fork[0] + 140, H + 40);
          g.quadraticCurveTo(fork[0] + dir * 160, fork[1] - 40, fork[0] + dir * 700, 560);
          g.lineTo(fork[0] + dir * 640, 556);
          g.quadraticCurveTo(fork[0] + dir * 60, fork[1] - 60, fork[0] - 140, H + 40);
          g.fill();
        };
        g.fillStyle = '#0b1012'; g.fillRect(-W, 600, W * 3, H);
        road(-1, 0);
        road(1, whip);
        // the signpost
        g.fillStyle = '#100c08'; g.fillRect(fork[0] - 10, 380, 20, 400);
        const sign = (dir: number, text: string, y: number, rot: number, glow: number) => {
          g.save(); g.translate(fork[0] + dir * 10, y); g.rotate(rot);
          g.fillStyle = glow > 0 ? `rgb(${lerp(60, 232, glow)}, ${lerp(48, 170, glow)}, ${lerp(36, 96, glow)})` : '#3a2e22';
          g.beginPath(); g.moveTo(0, -36); g.lineTo(dir * 300, -36); g.lineTo(dir * 340, 0); g.lineTo(dir * 300, 36); g.lineTo(0, 36); g.fill();
          g.fillStyle = glow > 0.5 ? '#14100c' : '#d9cdb6';
          g.font = '700 44px "Cormorant Garamond", serif'; g.letterSpacing = '10px';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(text, dir * 165, 2);
          g.restore();
        };
        sign(-1, 'DEFEND', 430, -0.05, 0);
        sign(1, 'CHANGE', 520, 0.04, whip);
        figure(g, [fork[0], 1000], 230, 0, 0, 0, 0);
        g.restore();
        captions(f, [question, defend, change], 180, 72, { key: ['defend', 'change'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'mirror',
      from: cutAt('honesty is not saying'),
      draw: (f) => {
        const g = f.g;
        const crack = smooth(word(right, 'right').start, word(right, 'right').start + 0.25, f.t);
        g.save();
        camera(f, W / 2 + 30 * Math.sin(f.lt * 0.7), H / 2, lerp(1.0, 1.12, f.p), 0, 1.5);
        fill(g, '#0d1012');
        const c: Pt = [W / 2, H / 2];
        g.fillStyle = '#5a4630'; g.beginPath(); g.ellipse(c[0], c[1], 420, 500, 0, 0, Math.PI * 2); g.fill();
        const glass = g.createLinearGradient(c[0] - 380, c[1] - 460, c[0] + 380, c[1] + 460);
        glass.addColorStop(0, '#3a474d'); glass.addColorStop(1, '#141a1d');
        g.fillStyle = glass; g.beginPath(); g.ellipse(c[0], c[1], 384, 464, 0, 0, Math.PI * 2); g.fill();
        // the reflection: a head and shoulders, from behind
        g.save(); g.beginPath(); g.ellipse(c[0], c[1], 384, 464, 0, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#07090a';
        g.beginPath(); g.arc(c[0], c[1] + 10, 120, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(c[0], c[1] + 470, 330, 300, 0, 0, Math.PI * 2); g.fill();
        // cracks spreading from one point
        if (crack > 0) {
          const rand = mulberry32(12);
          const o: Pt = [c[0] + 150, c[1] - 160];
          g.strokeStyle = 'rgba(230, 240, 245, 0.75)'; g.lineWidth = 2;
          for (let i = 0; i < 16; i++) {
            let p: Pt = o; const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
            g.beginPath(); g.moveTo(p[0], p[1]);
            const len = (200 + rand() * 500) * crack;
            for (let s = 0; s < 6; s++) {
              p = [p[0] + Math.cos(a + (rand() - 0.5) * 0.6) * len / 6, p[1] + Math.sin(a + (rand() - 0.5) * 0.6) * len / 6];
              g.lineTo(p[0], p[1]);
            }
            g.stroke();
          }
        }
        g.restore();
        g.restore();
        captions(f, [notSaying, right], 960, 66, { key: ['right'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'journal',
      from: cutAt('Honesty is saying'),
      draw: (f) => {
        const g = f.g;
        g.save();
        // the camera glides down the page as it is written
        camera(f, W / 2 + 60, lerp(380, 700, ease.inOutCubic(f.p)), 1.05);
        fill(g, '#241a12');
        const lamp = g.createRadialGradient(W / 2 - 200, 300, 0, W / 2 - 200, 300, 1200);
        lamp.addColorStop(0, 'rgba(255, 200, 130, 0.35)'); lamp.addColorStop(1, 'rgba(255, 200, 130, 0)');
        g.fillStyle = lamp; g.fillRect(-W, -H, W * 3, H * 3);
        g.save(); g.translate(W / 2, 560); g.rotate(-0.03);
        g.fillStyle = '#e9e1d2'; g.fillRect(-520, -420, 1040, 1100);
        g.strokeStyle = 'rgba(90, 110, 130, 0.25)'; g.lineWidth = 2;
        for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(-480, -330 + i * 72); g.lineTo(480, -330 + i * 72); g.stroke(); }
        g.restore();
        g.save();
        // the old line, crossed out
        g.font = '600 64px Caveat, cursive'; g.fillStyle = '#2c2620'; g.textAlign = 'left';
        g.fillText('I was always right.', 520, 230);
        g.strokeStyle = '#a3362a'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(510, 210); g.lineTo(510 + 470 * smooth(saying.start, saying.start + 0.6, f.t), 205); g.stroke();
        const hand = (line: typeof thought, y: number) => lyric(f, line, { x: 530, y, size: 76, font: 'hand', align: 'left', shadow: false, color: '#2c2620' }, smooth(line.start - 0.1, line.start + 0.1, f.t));
        hand(thought, 380);
        hand(learned, 520);
        hand(andNow, 660);
        hand(closer, 800);
        g.restore();
        g.restore();
        captions(f, [saying], 980, 54);
        vignette(g, 0.75);
      },
    },
    {
      id: 'sprout',
      from: cutAt('That is not weakness'),
      draw: (f) => {
        const g = f.g;
        const grow = smooth(growth.start - 0.3, courage.end, f.t);
        f.land({ phase: 0.34, rain: 0, ridges: 1, flight: 2 + f.lt * 0.3, zoom: 1.0, lift: -0.08 });
        g.save();
        camera(f, W / 2, H / 2 + 80, lerp(1.0, 1.25, f.p));
        // cracked dry earth
        g.fillStyle = '#1a1714'; g.fillRect(-W, 820, W * 3, H);
        const rand = mulberry32(19);
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3;
        for (let i = 0; i < 30; i++) {
          let p: Pt = [rand() * W, 830 + rand() * 250];
          g.beginPath(); g.moveTo(p[0], p[1]);
          for (let s = 0; s < 4; s++) { p = [p[0] + (rand() - 0.5) * 160, p[1] + (rand() - 0.3) * 40]; g.lineTo(p[0], p[1]); }
          g.stroke();
        }
        // the sprout: a stem that rises and unfolds leaves
        const base: Pt = [W / 2, 830];
        const hgt = 520 * ease.outCubic(grow);
        g.strokeStyle = '#7a8a4a'; g.lineWidth = 10 + 8 * grow; g.lineCap = 'round';
        g.beginPath(); g.moveTo(base[0], base[1]);
        g.quadraticCurveTo(base[0] - 40, base[1] - hgt * 0.5, base[0] + 10, base[1] - hgt); g.stroke();
        for (let i = 0; i < 5; i++) {
          const k = clamp01(grow * 5 - i * 0.8);
          if (k <= 0) continue;
          const y = base[1] - hgt * (0.25 + i * 0.15), side = i % 2 ? 1 : -1;
          g.save(); g.translate(base[0] - 10 + i * 4, y); g.rotate(side * (0.6 - 0.2 * k)); g.scale(side * k, k);
          g.fillStyle = i % 2 ? '#9aa85a' : '#7f9148';
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(60, -50, 140, 0); g.quadraticCurveTo(60, 40, 0, 0); g.fill();
          g.restore();
        }
        // a bud that opens on "courage"
        const bloom = smooth(courage.words[2].start, courage.end + 0.3, f.t);
        if (bloom > 0) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.save(); g.translate(base[0] + 10, base[1] - hgt); g.rotate(a); g.scale(bloom, bloom);
            g.fillStyle = '#e8aa60'; g.beginPath(); g.ellipse(0, -40, 22, 44, 0, 0, Math.PI * 2); g.fill();
            g.restore();
          }
        }
        g.restore();
        captions(f, [weakness, growth, courage], 180, 72, { key: ['weakness', 'growth', 'courage'] });
        vignette(g, 0.7);
      },
    },
    {
      id: 'water',
      from: cutAt('goal of life'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2, H / 2, lerp(1.0, 1.15, f.p), 0.05 * f.p);
        // still water from above, at blue hour
        const water = g.createLinearGradient(0, 0, W, H);
        water.addColorStop(0, '#1d3340'); water.addColorStop(1, '#0c171d');
        g.fillStyle = water; g.fillRect(-W, -H, W * 3, H * 3);
        const rand = mulberry32(31);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(160, 190, 205, ${0.03 + rand() * 0.05})`;
          g.fillRect(rand() * W, rand() * H, 200 + rand() * 400, 2);
        }
        // a hand reaching in; each touch sends out rings
        const touches = [never, goal2, well].map((l) => word(l, l.words[l.words.length - 1].w).start);
        const reach = smooth(goal.start, become.end, f.t);
        g.save();
        g.translate(lerp(W + 200, W / 2 + 160, ease.outCubic(reach)), lerp(H + 300, H / 2 + 260, ease.outCubic(reach)));
        g.rotate(-0.7);
        g.fillStyle = '#0a0d0e';
        g.beginPath(); g.moveTo(-60, 0); g.lineTo(-70, 520); g.lineTo(70, 520); g.lineTo(60, 0);
        g.quadraticCurveTo(70, -90, 30, -150); g.lineTo(20, -60); g.lineTo(0, -170); g.lineTo(-20, -70); g.lineTo(-40, -150); g.quadraticCurveTo(-70, -90, -60, 0); g.fill();
        g.restore();
        for (const at of touches) {
          if (f.t < at) continue;
          const k = f.t - at;
          for (let r = 0; r < 4; r++) {
            const rr = (k * 260 - r * 60);
            if (rr <= 0) continue;
            g.strokeStyle = `rgba(200, 225, 235, ${0.5 * Math.exp(-k * 0.6) * (1 - r * 0.2)})`; g.lineWidth = 4;
            g.beginPath(); g.ellipse(W / 2 + 20, H / 2 + 60, rr, rr * 0.55, 0, 0, Math.PI * 2); g.stroke();
          }
        }
        g.restore();
        captions(f, [goal, become, never, goal2, well], 200, 70, { key: ['never', 'well'] });
        vignette(g, 0.75);
      },
    },
  ];
}
