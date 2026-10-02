// Honesty Is a Compass: a deterministic, code-rendered music video. Every frame is a function
// of song time: landscape (WebGL) → compass and story layers (Canvas2D) → kinetic lyrics (DOM)
// → title card, light bursts and film grain. The stage punches on every frenchcore kick.
import * as THREE from 'three';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700-italic.css';
import '@fontsource/caveat/600.css';
import { Grain, Landscape, PALETTE } from './look';
import { DURATION as SONG_DURATION, beatPos, dropAmount, flight, kickPulse } from './music';
import { CompassLayer } from './compass';
import { StoryLayer } from './story';
import { KineticLyrics, type LineStyle } from './kinetic';
import { type LineTiming, findLine, lines, smoothstep } from './lyrics';

const LOGICAL_W = 1920;
const LOGICAL_H = 1080;
const DURATION = SONG_DURATION;

const root = document.querySelector('#app')!;
const app = document.createElement('div');
app.id = 'stage';
root.appendChild(app);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(PALETTE.charcoal, 1);
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const landscape = new Landscape();
scene.add(landscape.mesh);

const compass = new CompassLayer(app);
const story = new StoryLayer(app);

// How each line moves. Lines not listed are set still, with no emphasis.
const style = new Map<LineTiming, LineStyle>();
const set = (fragment: string, s: LineStyle, n = 0) => style.set(findLine(fragment, n), s);
set('I am honest', { mode: 'stuck', key: 'honest' });
set('something you own', { mode: 'plain', key: 'own' });
set('trophy you once won', { mode: 'plain', key: 'trophy' });
set('keep forever', { mode: 'stuck', key: 'forever' });
set('not how honesty works', { mode: 'plain', key: 'not' });
set('I am the sport I play', { mode: 'stuck', key: 'sport' });
set('You play sport', { mode: 'plain', key: 'play' });
set('You practice', { mode: 'step', key: 'practice' });
set('You lose', { mode: 'settle', key: 'lose' });
set('You learn', { mode: 'step', key: 'learn' });
set('You get better', { mode: 'step', key: 'better' });
set('You play honesty', { mode: 'swing', key: 'play' });
set('Every day', { mode: 'swing', key: 'day' });
set('Every conversation', { mode: 'swing', key: 'conversation' });
set('Every mistake', { mode: 'swing', key: 'mistake' });
set('You were wrong', { mode: 'settle', key: 'wrong' });
set('defend yourself', { mode: 'stuck', key: 'defend' });
set('Or do you change', { mode: 'swing', key: 'change' });
set('I was always right', { mode: 'stuck', key: 'right' });
set('I thought this', { mode: 'step', key: 'thought' });
set('I learned that', { mode: 'step', key: 'learned' });
set('closer to true', { mode: 'gather', key: 'true' });
set('That is not weakness', { mode: 'plain', key: 'weakness' });
set('That is growth', { mode: 'step', key: 'growth' });
set('That is courage', { mode: 'plain', key: 'courage' });
set('who never changes', { mode: 'stuck', key: 'never' });
set('who changes well', { mode: 'swing', key: 'well' });
set('because it never moves', { mode: 'stuck', key: 'never' });
set('frozen needle', { mode: 'stuck', key: 'frozen' });
set('it is only stuck', { mode: 'stuck', key: 'stuck' });
set('by moving', { mode: 'swing', key: 'moving' });
set('Turn, and the needle', { mode: 'swing', key: 'turn' });
set('Every time', { mode: 'swing', key: 'time' });
set('I never change', { mode: 'stuck', key: 'never' });
set('keep turning toward', { mode: 'gather', key: 'real' });
set('look reality in the eye', { mode: 'plain', key: 'reality' });
set('Teach me', { mode: 'echo', key: 'teach' });
set('Again', { mode: 'echo', key: 'again' });
set('And again', { mode: 'echo', key: 'again' }, 0);
set('And again', { mode: 'echo', key: 'again' }, 1);
set('not what you are', { mode: 'plain', key: 'not' });
set('how you become', { mode: 'gather', key: 'become' });
set('How you come home', { mode: 'gather', key: 'home' });
const lyrics = new KineticLyrics(app, style);

const titleCard = document.createElement('div');
titleCard.id = 'title-card';
titleCard.innerHTML =
  '<div class="title">Honesty is a Compass</div>' +
  '<div class="themes">Truth / Turning / Growth / Courage / Coming home</div>' +
  '<div class="by">produced by Emergence</div>';
root.appendChild(titleCard);

const flashEl = document.createElement('div');
flashEl.id = 'flash';
root.appendChild(flashEl);

const grain = new Grain(root);

const firstLine = lines[0];
const lastLine = lines[lines.length - 1];
// the outro is instrumental: fly over the golden landscape, then close on the title
const titleReturn = Math.max(lastLine.end + 3, DURATION - 8);

/** Keyframed values along the song: [time, value], eased between keys. */
function keys(t: number, k: Array<[number, number]>): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i], [t1, v1] = k[i + 1];
    if (t < t1) { const u = (t - t0) / (t1 - t0); return v0 + (v1 - v0) * u * u * (3 - 2 * u); }
  }
  return k[k.length - 1][1];
}

const dropStarts = [105, 155];

/**
 * The journey: from a rainy night in the city, through the storm of being wrong, into blue hour,
 * dawn on "by moving", sunrise in the drops and golden hour at "coming home".
 */
function journey(t: number) {
  const drop = dropAmount(t);
  const kick = kickPulse(t);
  const burst = Math.max(0, ...dropStarts.map((s) => (t >= s ? Math.exp(-(t - s) * 2.2) : 0)));
  return {
    t,
    phase: keys(t, [[0, 0], [45, 0.05], [66, 0.2], [80, 0.3], [104, 0.42], [116, 0.62], [135, 0.78], [160, 0.9], [184, 1]]),
    rain: keys(t, [[0, 0.9], [40, 0.9], [66, 1], [80, 0.4], [96, 0]]),
    city: keys(t, [[0, 1], [22, 1], [40, 0]]),
    flight: flight(t),
    kick,
    drop,
    // lightning on the hardest kicks of the storm; a warm burst as each drop lands
    flash: Math.max(t > 52 && t < 80 && kick > 0.85 ? 0.6 * kick : 0, burst),
    burst,
  };
}

function renderAt(t: number): void {
  const j = journey(t);
  landscape.update({ t, phase: j.phase, rain: j.rain, city: j.city, flight: j.flight, kick: j.kick, drop: j.drop, flash: j.flash });
  grain.update(t);
  compass.render(t);
  story.render(t, j.phase);

  // the frenchcore heartbeat: the whole stage punches on each kick in the drops, and the
  // hardest kicks give it a short, small shake
  const punch = j.kick * j.drop;
  const bi = Math.floor(beatPos(t));
  const shake = punch > 0.7 ? (punch - 0.7) * 10 : 0;
  const sx = Math.sin(bi * 12.9898) * shake, sy = Math.cos(bi * 78.233) * shake;
  app.setAttribute('style', `transform: translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) scale(${(1 + 0.022 * punch).toFixed(4)})`);
  flashEl.style.opacity = String(Math.min(1, j.burst * 0.9 + 0.12 * punch * smoothstep(0.5, 0.8, j.phase)));

  // the title card opens the film and closes it
  const opening = 1 - smoothstep(firstLine.start - 1.4, firstLine.start - 0.2, t);
  const closing = smoothstep(titleReturn, titleReturn + 1.4, t);
  const title = Math.max(opening * smoothstep(0, 0.6, t), closing);
  titleCard.style.opacity = String(title);
  titleCard.style.transform = `translate(-50%, -50%) rotate(-0.6deg) scale(${(1 + 0.01 * Math.sin(t * 1.2)).toFixed(4)})`;

  lyrics.render(t, 1 - title);
  renderer.render(scene, camera);
}

function resize(): void {
  const scale = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  const w = Math.floor(LOGICAL_W * scale), h = Math.floor(LOGICAL_H * scale);
  renderer.setSize(w, h, false);
  compass.setDisplaySize(w, h);
  story.setDisplaySize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- playback and render hooks

const audio = new Audio('/Honesty Is a Compass.mp3');
audio.preload = 'auto';
const query = new URLSearchParams(location.search);
const requestedTime = Number(query.get('t') ?? '0');
const renderMode = query.get('render') === '1';

audio.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(requestedTime) && requestedTime > 0) audio.currentTime = Math.min(requestedTime, audio.duration);
});

window.addEventListener('keydown', async (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (audio.paused) await audio.play();
    else audio.pause();
  }
  if (event.code === 'ArrowRight') audio.currentTime = Math.min(audio.duration || DURATION, audio.currentTime + (event.shiftKey ? 5 : 1));
  if (event.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - (event.shiftKey ? 5 : 1));
});

let previewClockRunning = false;
let previewClockBase = 0;
let previewClockEpoch = 0;

declare global {
  interface Window {
    __renderAt?: (t: number) => void;
    __videoReady?: boolean;
    __startPreview?: (t: number) => Promise<void>;
    __pausePreview?: () => void;
  }
}

window.__renderAt = renderAt;
window.__startPreview = async (t: number) => {
  audio.pause();
  previewClockBase = t;
  previewClockEpoch = performance.now();
  previewClockRunning = true;
  renderAt(t);
};
window.__pausePreview = () => {
  previewClockRunning = false;
  audio.pause();
};

let ready = false;

function frame(): void {
  const t = previewClockRunning
    ? previewClockBase + (performance.now() - previewClockEpoch) / 1000
    : (audio.currentTime || requestedTime || 0);
  if (ready) renderAt(t);
  requestAnimationFrame(frame);
}

// Renders wait for this flag, so it is only raised once the fonts (also used on the dial and the notes) are usable.
Promise.all([
  document.fonts.load('700 100px "Cormorant Garamond"'),
  document.fonts.load('600 100px "Cormorant Garamond"'),
  document.fonts.load('italic 600 100px "Cormorant Garamond"'),
  document.fonts.load('600 40px "Caveat"'),
]).then(() => document.fonts.ready).then(() => {
  compass.prepare();
  ready = true;
  if (renderMode) renderAt(requestedTime || 0);
  window.__videoReady = true;
});

if (!renderMode) frame();
