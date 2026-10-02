import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const start = Number(arg('start', '0'));
const end = Number(arg('end', '15'));
const name = arg('name', 'preview');
const baseUrl = arg('url', 'http://127.0.0.1:4173');
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));
const duration = Math.max(0.1, end - start);

const outDir = path.resolve('rendered', name);
const captureDir = path.join(outDir, 'capture');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(captureDir, { recursive: true });

const chromePath = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  ]
});

const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: {
    dir: captureDir,
    size: { width, height }
  }
});

const page = await context.newPage();
const recordEpoch = Date.now();
await page.goto(`${baseUrl}/?t=${start}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__videoReady === true);

// Start actual browser playback so the recording proceeds in real time.
await page.evaluate(async (time) => {
  await window.__startPreview?.(time);
}, start);
const leadInSeconds = Math.max(0, (Date.now() - recordEpoch) / 1000);

// A tiny lead-in gives the recorder time to settle before the requested span.
await page.waitForTimeout(Math.ceil(duration * 1000) + 250);
await page.evaluate(() => window.__pausePreview?.());

const video = page.video();
await page.close();
await context.close();
await browser.close();

if (!video) throw new Error('Playwright did not produce a video capture.');
const webmPath = await video.path();

const trimmed = path.join(outDir, `${name}-silent.mp4`);
let res = spawnSync('ffmpeg', [
  '-y',
  '-ss', String(leadInSeconds),
  '-i', webmPath,
  '-t', String(duration),
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  trimmed
], { stdio: 'inherit' });
if (res.status !== 0) process.exit(res.status ?? 1);

const audio = path.resolve('../audio/Honesty Is a Compass.mp3');
try {
  await fs.access(audio);
  const final = path.join(outDir, `${name}.mp4`);
  res = spawnSync('ffmpeg', [
    '-y',
    '-i', trimmed,
    '-ss', String(start),
    '-t', String(duration),
    '-i', audio,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-shortest',
    '-movflags', '+faststart',
    final
  ], { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
  console.log(`Rendered ${final}`);
} catch {
  console.log(`MP3 not found; rendered silent preview: ${trimmed}`);
}
