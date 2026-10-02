// Scenes 1:43–3:05: the frozen compass in macro, the ice shattering on "by moving" and the world
// turning on "Turn", a sunrise flight with birds, the eye again, zooming into the light on each
// "again", the road home at golden hour, and the finale: the figure on the cliff, then the title.
import {
  type Frame, type Pt, type Scene, H, L, W, camera, clamp01, cutAt, ease, lerp, lineVis, lyric, mulberry32, smooth, snapToBeat, word,
} from './engine';
import { captions, fill, titleStrip, vignette } from './scenes-a';
import { type NeedleScript, drawNeedle, makeDial, makeFrost, needleAngle } from './compass';
import { cliff, figure } from './story';
import { flight } from './music';

let dial: HTMLCanvasElement | null = null;
let frost: HTMLCanvasElement | null = null;

function birds(g: CanvasRenderingContext2D, t: number, x0: number, y0: number, n = 9, scale = 1): void {
  g.strokeStyle = 'rgba(10, 12, 14, 0.85)'; g.lineWidth = 3 * scale; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const x = x0 - row * 46 * scale, y = y0 + side * row * 28 * scale;
    const flap = Math.sin(t * 9 + i) * 10 * scale;
    g.beginPath(); g.moveTo(x - 16 * scale, y - flap); g.quadraticCurveTo(x - 6 * scale, y - 4 * scale, x, y);
    g.quadraticCurveTo(x + 6 * scale, y - 4 * scale, x + 16 * scale, y - flap); g.stroke();
  }
}

function house(g: CanvasRenderingContext2D, x: number, y: number, s: number, glow: number): void {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#0b0e10';
  g.beginPath(); g.moveTo(-90, 0); g.lineTo(-90, -90); g.lineTo(0, -160); g.lineTo(90, -90); g.lineTo(90, 0); g.fill();
  g.fillRect(40, -170, 22, 50);
  const lit = `rgba(255, 196, 120, ${0.6 + 0.4 * glow})`;
  g.fillStyle = lit; g.fillRect(-60, -70, 36, 34);
  g.fillStyle = `rgba(255, 210, 140, ${glow})`; g.fillRect(14, -76, 40, 76);
  if (glow > 0.01) {
    const gl = g.createRadialGradient(34, -40, 0, 34, -40, 260);
    gl.addColorStop(0, `rgba(255, 200, 130, ${0.5 * glow})`); gl.addColorStop(1, 'rgba(255, 200, 130, 0)');
    g.fillStyle = gl; g.beginPath(); g.arc(34, -40, 260, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** The eye from the first act, now warm, with the sunrise in its pupil. */
function sunriseEye(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const rand = mulberry32(5);
  g.save();
  g.fillStyle = '#e6ddd0';
  g.beginPath(); g.ellipse(x, y, r * 2.6, r * 1.25, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x, y, r * 2.6, r * 1.25, 0, 0, Math.PI * 2); g.clip();
  const base = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  base.addColorStop(0, '#f0b45e'); base.addColorStop(0.6, '#b97a3a'); base.addColorStop(1, '#1a1612');
  g.fillStyle = base; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    g.strokeStyle = rand() < 0.5 ? `rgba(255, 225, 160, ${0.15 + rand() * 0.2})` : `rgba(30, 18, 8, ${0.12 + rand() * 0.2})`;
    g.lineWidth = 1 + rand() * 2;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32); g.lineTo(x + Math.cos(a) * r * (0.75 + rand() * 0.22), y + Math.sin(a) * r * (0.75 + rand() * 0.22)); g.stroke();
  }
  // the pupil holds a tiny sunrise
  g.save();
  g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.clip();
  const sky = g.createLinearGradient(0, y - r * 0.3, 0, y + r * 0.3);
  sky.addColorStop(0, '#3d4a5c'); sky.addColorStop(0.6, '#e39c74'); sky.addColorStop(1, '#2a1c14');
  g.fillStyle = sky; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.fillStyle = '#fff1d0'; g.beginPath(); g.arc(x + r * 0.05, y + r * 0.06, r * 0.07, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#120d0a'; g.fillRect(x - r, y + r * 0.1, r * 2, r);
  g.restore();
  g.restore();
}

export function scenesC(): Scene[] {
  const compassLine = L('A compass is not faithful');
  const neverMoves = L('because it never moves');
  const frozen = L('frozen needle');
  const stuck = L('it is only stuck');
  const keeps = L('needle keeps faith');
  const moving = L('by moving');
  const turn = L('Turn, and the needle');
  const everyTime = L('Every time');
  const maybe = L('And maybe honesty');
  const not = L('Not:');
  const iNever = L('I never change');
  const but = L('But:');
  const turning = L('keep turning toward');
  const someone = L('look reality in the eye');
  const andSay = L('and say');
  const teach = L('Teach me');
  const agains = [L('Again'), L('And again', 0), L('And again', 1)];
  const notWhat = L('not what you are');
  const become = L('how you become');
  const home = L('How you come home');

  const movingAt = word(moving, 'moving').start;
  const turnAt = turn.words[0].start, backAt = everyTime.words[0].start;
  const script: NeedleScript = {
    kicks: [[movingAt + 0.02, -2.5]],
    target: () => 0,
    // jammed off north, frozen, until "by moving" frees it
    hold: (t) => (t < movingAt ? 0.7 : null),
    housing: (t) => ease.inOutCubic((t - turnAt) / 0.9) * 1.25 - ease.inOutCubic((t - backAt) / 0.9) * 1.25,
  };
  const SIM_START = snapToBeat(compassLine.start) - 0.5;
  const frostK = (t: number) => smooth(frozen.start, word(stuck, 'stuck').end, t) * (1 - smooth(movingAt, movingAt + 0.1, t));
  const finale = snapToBeat(home.end + 0.4);
  const outroFlight = snapToBeat(finale + 8);
  const titleAt = snapToBeat(Math.max(home.end + 12, 184.92 - 8));

  const compassAt = (f: Frame, c: Pt, scale: number, housing: number) => {
    const g = f.g;
    dial ??= makeDial();
    frost ??= makeFrost();
    const needle = needleAngle(script, f.t, SIM_START);
    g.save();
    g.translate(c[0], c[1]); g.scale(scale, scale);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(18, 26, 480, 0, Math.PI * 2); g.fill();
    g.save(); g.rotate(housing); g.drawImage(dial, -dial.width / 2, -dial.height / 2); g.restore();
    drawNeedle(g, [0, 0], needle, 0);
    const fk = frostK(f.t);
    if (fk > 0.01) { g.globalAlpha = fk; g.drawImage(frost, -frost.width / 2, -frost.height / 2); g.globalAlpha = 1; }
    g.restore();
  };

  return [
    {
      id: 'compass-macro',
      from: cutAt('A compass is not faithful'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2 + 120 * Math.sin(f.lt * 0.35), H / 2 + 260, lerp(1.25, 1.6, ease.inOutCubic(f.p)), 0.12 * Math.sin(f.lt * 0.25));
        fill(g, '#cbbfa6');
        compassAt(f, [W / 2, H / 2 + 260], 1.0, 0);
        g.restore();
        captions(f, [compassLine, neverMoves, frozen, stuck], 140, 70, { key: ['never', 'frozen', 'stuck'] });
        vignette(g, 0.8);
      },
    },
    {
      id: 'world-turns',
      from: cutAt('needle keeps faith'),
      draw: (f) => {
        const g = f.g;
        const housing = script.housing(f.t);
        f.land({ phase: lerp(0.55, 0.66, f.p), ridges: 1, flight: flight(f.t) * 1.5, roll: housing, zoom: 1.15, lift: -0.04 });
        g.save();
        camera(f, W / 2, H / 2, 1, 0, 1.5);
        compassAt(f, [W / 2, H + 120], 0.95, housing);
        // the ice bursts off the glass
        if (f.t >= movingAt) {
          const k = f.t - movingAt;
          const rand = mulberry32(61);
          for (let i = 0; i < 70; i++) {
            const a = -Math.PI * (0.1 + rand() * 0.8), sp = 500 + rand() * 1200;
            const x = W / 2 + Math.cos(a) * sp * k, y = H + 120 - 200 + Math.sin(a) * sp * k + 900 * k * k;
            g.fillStyle = `rgba(225, 238, 245, ${0.7 * (1 - clamp01(k / 1.4))})`;
            g.save(); g.translate(x, y); g.rotate(rand() * 6 + k * 4);
            g.fillRect(-8, -3, 16 + rand() * 20, 6); g.restore();
          }
          g.fillStyle = `rgba(255, 240, 215, ${0.55 * Math.exp(-k * 5)})`; g.fillRect(-W, -H, W * 3, H * 3);
        }
        g.restore();
        captions(f, [keeps, moving, turn, everyTime], 170, 74, { key: ['moving', 'turn', 'time'] });
        vignette(g, 0.65);
      },
    },
    {
      id: 'sunrise-flight',
      from: cutAt('And maybe honesty'),
      draw: (f) => {
        const g = f.g;
        const bank = Math.sin(f.lt * 0.45) * 0.09;
        f.land({ phase: lerp(0.66, 0.82, f.p), ridges: 1, flight: flight(f.t) * 3.2, roll: bank, zoom: 1.12, lift: -0.03 + 0.02 * Math.sin(f.lt * 0.3) });
        g.save();
        camera(f, W / 2, H / 2, 1, bank * 0.5);
        birds(g, f.t, lerp(-200, W + 400, f.p), 300 + 40 * Math.sin(f.lt * 0.5), 9, 1.1);
        g.restore();
        captions(f, [maybe, not, iNever, but, turning], 900, 72, { key: ['never', 'real'] });
        vignette(g, 0.55);
      },
    },
    {
      id: 'eye-sunrise',
      from: cutAt('look reality in the eye'),
      draw: (f) => {
        const g = f.g;
        g.save();
        camera(f, W / 2, H / 2, lerp(1.0, 1.6, ease.inOutCubic(f.p)), -0.03 * f.p);
        fill(g, '#3a2418');
        sunriseEye(g, W / 2, H / 2, 230);
        g.restore();
        captions(f, [someone, andSay], 920, 66, { key: ['reality', 'eye'] });
        vignette(g, 0.7);
      },
    },
    {
      id: 'again',
      from: cutAt('Teach me'),
      draw: (f) => {
        const g = f.g;
        // each "again" dives into the pupil, toward the light
        const marks = [teach.words[0].start, ...agains.map((l) => l.words[l.words.length - 1].start)];
        let last = marks[0];
        for (const m of marks) if (f.t >= m) last = m;
        const k = f.t - last;
        g.save();
        camera(f, W / 2 + 12, H / 2 + 14, lerp(1.3, 6, ease.inExpo(clamp01(k / 1.2))), 0.1 * k, 2);
        fill(g, '#3a2418');
        sunriseEye(g, W / 2, H / 2, 230);
        g.restore();
        g.fillStyle = `rgba(255, 236, 205, ${0.7 * Math.exp(-k * 7)})`; g.fillRect(0, 0, W, H);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        for (const line of [teach, ...agains]) {
          const v = lineVis(line, f.t, 0.15, 0.4);
          if (v > 0) lyric(f, line, { x: W / 2, y: H / 2, size: 150, key: ['teach', 'again'] }, v);
        }
        g.restore();
        vignette(g, 0.6);
      },
    },
    {
      id: 'road-home',
      from: cutAt('not what you are'),
      draw: (f) => {
        const g = f.g;
        const glow = smooth(word(home, 'home').start, home.end + 0.6, f.t);
        f.land({ phase: lerp(0.86, 0.95, f.p), ridges: 1, flight: 6 + f.lt * 0.04, zoom: 1.05, lift: -0.06 });
        g.save();
        camera(f, W / 2, lerp(H / 2 + 60, H / 2 - 10, f.p), lerp(1.0, 1.3, ease.inOutCubic(f.p)));
        // a winding road over the golden fields to a house with a lit window
        g.fillStyle = '#1a1510'; g.fillRect(-W, 760, W * 3, H);
        const fields = g.createLinearGradient(0, 760, 0, H);
        fields.addColorStop(0, 'rgba(205, 146, 79, 0.35)'); fields.addColorStop(1, 'rgba(20, 16, 12, 0)');
        g.fillStyle = fields; g.fillRect(-W, 760, W * 3, H);
        g.fillStyle = '#c99a62';
        g.beginPath();
        g.moveTo(W / 2 - 260, H + 20); g.bezierCurveTo(W / 2 - 40, 960, W / 2 + 320, 900, W / 2 + 120, 830);
        g.bezierCurveTo(W / 2 - 40, 790, W / 2 + 130, 772, W / 2 + 200, 764);
        g.lineTo(W / 2 + 214, 764);
        g.bezierCurveTo(W / 2 + 160, 780, W / 2 + 30, 795, W / 2 + 160, 832);
        g.bezierCurveTo(W / 2 + 420, 900, W / 2 + 120, 980, W / 2 + 260, H + 20);
        g.fill();
        house(g, W / 2 + 210, 764, 0.5, glow);
        // the walker, smaller as they go
        const w = ease.inOutCubic(f.p);
        const feet: Pt = [lerp(W / 2 + 10, W / 2 + 150, w), lerp(H + 40, 835, w)];
        figure(g, feet, lerp(420, 70, w), f.lt * 4.8, 1, 0, 1);
        g.restore();
        captions(f, [notWhat, become, home], 170, 72, { key: ['become', 'home'] });
        vignette(g, 0.55);
      },
    },
    {
      id: 'finale-cliff',
      from: finale,
      draw: (f) => {
        const g = f.g;
        f.land({ phase: 0.95, ridges: 1, flight: flight(f.t) * 2.2, zoom: lerp(1.0, 1.08, f.p), lift: 0 });
        g.save();
        camera(f, W / 2 + 80 * f.p, H / 2, lerp(1.0, 1.12, f.p), 0, 1.6);
        cliff(g, 1460, 860, 1);
        const lift = f.kick * f.drop;
        figure(g, [1460, 862 - lift * 3], 230, 0, 0, smooth(0.5, 3, f.lt) * (0.85 + 0.15 * lift), 1);
        birds(g, f.t, lerp(300, 1300, f.p), 260, 7, 0.9);
        g.restore();
        vignette(g, 0.55);
      },
    },
    {
      id: 'outro-flight',
      from: outroFlight,
      draw: (f) => {
        const g = f.g;
        const bank = Math.sin(f.lt * 0.8) * 0.12;
        f.land({ phase: 1, ridges: 1, flight: flight(f.t) * 4.5, roll: bank, zoom: 1.15, lift: -0.02 });
        g.save();
        camera(f, W / 2, H / 2, 1, bank * 0.4, 1.8);
        birds(g, f.t, lerp(W + 100, -300, f.p), 340, 11, 1.2);
        g.restore();
        vignette(g, 0.5);
      },
    },
    {
      id: 'end-title',
      from: titleAt,
      draw: (f) => {
        const g = f.g;
        f.land({ phase: 1, ridges: 1, flight: flight(f.t) * 1.2, zoom: 1.0, lift: 0 });
        titleStrip(g, W / 2, H * 0.47, lerp(1.04, 0.96, ease.outExpo(f.lt / 0.5)), -0.012, ease.outExpo(f.lt / 0.3));
        vignette(g, 0.5);
      },
    },
  ];
}
