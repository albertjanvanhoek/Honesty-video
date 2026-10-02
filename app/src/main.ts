// Honesty Is a Compass: a deterministic, code-rendered music video. The film is a list of scenes
// (scenes-a/b/c.ts) that cut on the beat; each draws the whole frame on a Canvas2D layer, over the
// WebGL landscape when it asks for it. The stage punches on every frenchcore kick in the drops.
import * as THREE from 'three';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700-italic.css';
import '@fontsource/caveat/600.css';
import { Grain, Landscape, type LandscapeState, PALETTE } from './look';
import { DURATION, beatPos } from './music';
import { H, W, type Scene, frameFor } from './engine';
import { scenesA } from './scenes-a';
import { scenesB } from './scenes-b';
import { scenesC } from './scenes-c';

const root = document.querySelector('#app')!;
const stage = document.createElement('div');
stage.id = 'stage';
root.appendChild(stage);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(PALETTE.charcoal, 1);
stage.appendChild(renderer.domElement);
const scene3 = new THREE.Scene();
const camera3 = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const landscape = new Landscape();
scene3.add(landscape.mesh);

const canvas = document.createElement('canvas');
canvas.id = 'scene';
canvas.width = W;
canvas.height = H;
stage.appendChild(canvas);
const g = canvas.getContext('2d')!;

const grain = new Grain(root);

let scenes: Scene[] = [];

const LAND_DEFAULTS: Omit<LandscapeState, 't' | 'kick' | 'drop'> = {
  phase: 0.5, rain: 0, city: 0, flight: 0, flash: 0, roll: 0, zoom: 1, lift: 0, sea: 0, ridges: 1,
};

function renderAt(t: number): void {
  let land: Partial<LandscapeState> | null = null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.clearRect(0, 0, W, H);
  const { scene, f } = frameFor(scenes, t, g, (s) => { land = s; });
  scene.draw(f);

  if (land) {
    landscape.update({ ...LAND_DEFAULTS, ...(land as Partial<LandscapeState>), t, kick: f.kick, drop: f.drop });
    renderer.domElement.style.visibility = 'visible';
    renderer.render(scene3, camera3);
  } else {
    renderer.domElement.style.visibility = 'hidden';
  }
  grain.update(t);

  // the frenchcore heartbeat: the whole stage punches on each kick in the drops, and the
  // hardest kicks give it a short, small shake
  const punch = f.kick * f.drop;
  const bi = Math.floor(beatPos(t));
  const shake = punch > 0.7 ? (punch - 0.7) * 14 : 0;
  const sx = Math.sin(bi * 12.9898) * shake, sy = Math.cos(bi * 78.233) * shake;
  stage.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) scale(${(1 + 0.018 * punch).toFixed(4)})`;
}

function resize(): void {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const w = Math.floor(W * scale), h = Math.floor(H * scale);
  renderer.setSize(w, h, false);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
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
    __scenes?: () => Array<{ id: string; from: number }>;
  }
}

window.__renderAt = renderAt;
window.__scenes = () => scenes.map((s) => ({ id: s.id, from: s.from }));
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

// Renders wait for this flag, so it is only raised once the fonts (used by every scene) are usable.
Promise.all([
  document.fonts.load('700 100px "Cormorant Garamond"'),
  document.fonts.load('600 100px "Cormorant Garamond"'),
  document.fonts.load('italic 600 100px "Cormorant Garamond"'),
  document.fonts.load('italic 700 100px "Cormorant Garamond"'),
  document.fonts.load('600 40px "Caveat"'),
]).then(() => document.fonts.ready).then(() => {
  scenes = [...scenesA(), ...scenesB(), ...scenesC()].sort((a, b) => a.from - b.from);
  ready = true;
  if (renderMode) renderAt(requestedTime || 0);
  window.__videoReady = true;
});

if (!renderMode) frame();
