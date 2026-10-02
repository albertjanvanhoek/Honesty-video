// Honesty Is a Compass: a deterministic, code-rendered music video. Every frame is a function
// of song time: painted backdrop (WebGL) → compass layer (Canvas2D) → kinetic lyrics (DOM)
// → title card and sleeve → print grain.
import * as THREE from 'three';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/700.css';
import { Backdrop, Grain, PALETTE } from './look';
import { CompassLayer } from './compass';
import { KineticLyrics, type LineStyle } from './kinetic';
import { type LineTiming, findLine, lines, nearestBeatPulse, smoothstep } from './lyrics';

const LOGICAL_W = 1920;
const LOGICAL_H = 1080;
const DURATION = 184.92;

const app = document.querySelector('#app')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(PALETTE.deep, 1);
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const backdrop = new Backdrop();
scene.add(backdrop.mesh);

const compass = new CompassLayer(app);

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

const centerTitle = document.createElement('div');
centerTitle.id = 'center-title';
centerTitle.className = 'cover';
centerTitle.innerHTML =
  '<div class="cover-title"><span class="cover-big">Honesty</span> <span class="cover-small">is a</span> <span class="cover-big cover-alt">Compass</span></div>' +
  '<div class="cover-sub">Produced by Emergence</div>';
app.appendChild(centerTitle);

// The paper edge of the record sleeve, shown around the title card at the start and the end.
const sleeve = document.createElement('div');
sleeve.id = 'sleeve';
app.appendChild(sleeve);

const grain = new Grain(app);

const firstLine = lines[0];
const lastLine = lines[lines.length - 1];
const coverReturn = lastLine.end + 3.2;

function renderAt(t: number): void {
  backdrop.update(t, nearestBeatPulse(t, 0.16));
  grain.update(t);
  compass.render(t);

  // the title card opens the film and closes it
  const opening = smoothstep(0.6, 2.2, t) * (1 - smoothstep(firstLine.start - 2.2, firstLine.start - 0.4, t));
  const closing = smoothstep(coverReturn, coverReturn + 1.6, t);
  const cover = Math.max(opening, closing);
  const breathe = 1 + Math.sin(t * 1.35) * 0.010 + nearestBeatPulse(t, 0.18) * 0.018;
  centerTitle.style.opacity = String(cover);
  centerTitle.style.transform = `scale(${breathe}) translateY(${Math.sin(t * 0.55) * 4}px)`;
  sleeve.style.opacity = String(Math.max(1 - smoothstep(firstLine.start - 2.2, firstLine.start - 0.4, t), closing));

  lyrics.render(t, 1 - cover);
  renderer.render(scene, camera);
}

function resize(): void {
  const scale = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  const w = Math.floor(LOGICAL_W * scale), h = Math.floor(LOGICAL_H * scale);
  renderer.setSize(w, h, false);
  compass.setDisplaySize(w, h);
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

// Renders wait for this flag, so it is only raised once the fonts (also used on the compass dial) are usable.
Promise.all([
  document.fonts.load('900 100px "Fraunces Variable"'),
  document.fonts.load('italic 900 100px "Fraunces Variable"'),
  document.fonts.load('700 40px "Jost"'),
  document.fonts.load('500 40px "Jost"'),
]).then(() => document.fonts.ready).then(() => {
  compass.prepare();
  ready = true;
  if (renderMode) renderAt(requestedTime || 0);
  window.__videoReady = true;
});

if (!renderMode) frame();
