// The lyrics as kinetic typography, the hero of every frame. Each line gets one motion that
// matches its meaning; quoted speech is set in italic. A pure function of song time.
import { CSS } from './look';
import { type LineTiming, type WordTiming, lines, nearestBeatPulse, smoothstep, wordProgress } from './lyrics';

/**
 * - plain: still, the key word grows as it is sung
 * - swing: the line swings like a needle and settles
 * - settle: the words tremble, then come to rest
 * - stuck: rigid and cold, nothing moves
 * - step: each word sits a little higher than the last ("you get better")
 * - gather: the words move closer together
 * - echo: the key word pulses on the beat
 */
export type Mode = 'plain' | 'swing' | 'settle' | 'stuck' | 'step' | 'gather' | 'echo';

export interface LineStyle {
  mode: Mode;
  /** the word to emphasise (lowercase), if any */
  key?: string;
}

const LONG_LINE = 24; // characters; longer lines are set on two rows

function rows(words: WordTiming[]): WordTiming[][] {
  const text = words.map((w) => w.w).join(' ');
  if (text.length <= LONG_LINE || words.length < 3) return [words];
  // break at the word boundary closest to the middle of the line
  let best = 1, bestDiff = Infinity, run = 0;
  for (let i = 0; i < words.length - 1; i++) {
    run += words[i].w.length + 1;
    const diff = Math.abs(run - text.length / 2);
    if (diff < bestDiff) { bestDiff = diff; best = i + 1; }
  }
  return [words.slice(0, best), words.slice(best)];
}

const isQuote = (line: LineTiming) => /^["“]/.test(line.text) || /["”]\.?$/.test(line.text);

function wordStyle(line: LineTiming, word: WordTiming, i: number, t: number, style: LineStyle): string {
  const p = wordProgress(word, t);
  const before = t < word.start;
  const active = p > 0 && p < 1;
  const after = t >= word.end;
  const local = smoothstep(line.start, line.end, t);
  const rel = i - (line.words.length - 1) / 2;
  const isKey = !!style.key && word.w.toLowerCase() === style.key;

  let x = 0, y = 0, rot = 0, scale = 1;
  let opacity = before ? 0.5 : 1;
  let color = active ? CSS.brass : after ? CSS.cream : CSS.paper;

  if (isKey) scale = 1.06 + 0.3 * p;

  switch (style.mode) {
    case 'swing': {
      const k = Math.max(0, t - line.start);
      rot = 7 * Math.exp(-2.2 * k) * Math.sin(8 * k + rel * 0.4);
      y = Math.abs(rel) * 6 * Math.exp(-2.2 * k);
      break;
    }
    case 'settle': {
      const j = (1 - local) * 14;
      x = Math.sin(t * 17 + i * 2.3) * j;
      y = Math.cos(t * 13 + i * 1.7) * j * 0.6;
      rot = Math.sin(t * 11 + i) * 2.5 * (1 - local);
      break;
    }
    case 'stuck':
      color = CSS.frost;
      if (isKey) scale = 1.06;
      break;
    case 'step':
      y = -i * 10 * smoothstep(word.start - 0.2, word.end, t);
      break;
    case 'gather':
      x = -rel * 10 * local;
      break;
    case 'echo':
      if (isKey) scale = 1.08 + 0.12 * p + 0.14 * nearestBeatPulse(t, 0.14);
      break;
    case 'plain':
      break;
  }

  if (active) opacity = 1;
  if (after) opacity = 0.97;
  const room = Math.max(0, scale - 1) * 0.5 * word.w.length * 0.55;
  return [
    `margin: 0 ${room.toFixed(3)}em`,
    `transform: translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
    `opacity:${opacity}`,
    `color:${color}`,
  ].join(';');
}

export class KineticLyrics {
  private readonly el: HTMLDivElement;
  private readonly styles: Map<LineTiming, LineStyle>;

  constructor(parent: Element, styles: Map<LineTiming, LineStyle>) {
    this.el = document.createElement('div');
    this.el.id = 'kinetic-lyrics';
    parent.appendChild(this.el);
    this.styles = styles;
  }

  /** The line on screen at `t`, if any. */
  private lineAt(t: number): LineTiming | null {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1]?.start ?? line.end + 2;
      if (t >= line.start - 0.15 && t < Math.min(next - 0.08, line.end + 0.9)) return line;
    }
    return null;
  }

  render(t: number, visible = 1): void {
    const line = visible > 0 ? this.lineAt(t) : null;
    if (!line) {
      this.el.innerHTML = '';
      this.el.style.opacity = '0';
      return;
    }
    const style = this.styles.get(line) ?? { mode: 'plain' };
    const short = line.text.length <= 12;
    this.el.className = `kinetic mode-${style.mode}${isQuote(line) ? ' quote' : ''}`;
    this.el.style.setProperty('--kinetic-font-vw', short ? '8.6vw' : '6.6vw');
    this.el.style.setProperty('--kinetic-gap-em', '0.34em');
    this.el.style.opacity = String(
      visible * smoothstep(line.start - 0.15, line.start + 0.05, t) * (1 - smoothstep(line.end + 0.5, line.end + 0.9, t))
    );

    const quote = isQuote(line);
    const last = line.words.length - 1;
    const html = rows(line.words).map((row) => {
      const words = row.map((word) => {
        const i = line.words.indexOf(word);
        const text = (quote && i === 0 ? '“' : '') + word.w + (quote && i === last ? '”' : '');
        return `<span class="kinetic-word" style="${wordStyle(line, word, i, t, style)}">${text}</span>`;
      }).join('');
      return `<div class="kinetic-row">${words}</div>`;
    }).join('');
    this.el.innerHTML = `<div class="kinetic-content">${html}</div>`;
    this.fit();
  }

  /** Scale the block down if it would leave the title-safe area. */
  private fit(): void {
    const content = this.el.querySelector<HTMLElement>('.kinetic-content');
    if (!content) return;
    const r = content.getBoundingClientRect();
    const safeW = window.innerWidth * 0.82, safeH = window.innerHeight * 0.62;
    const k = Math.min(1, safeW / Math.max(1, r.width), safeH / Math.max(1, r.height));
    content.style.transform = `translateY(${(-window.innerHeight * 0.06).toFixed(1)}px) scale(${k.toFixed(3)})`;
  }
}
