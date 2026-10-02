# Honesty Is a Compass: music video

A code-rendered music video for **Honesty Is a Compass** (Produced by Emergence). It is a companion to [Kindness-Is-Not-Magic-Video](https://github.com/albertjanvanhoek/Kindness-Is-Not-Magic-Video) and is built on the same engine. Every frame is a deterministic function of song time.

## The idea

People talk about honesty as something you own, like the colour of your eyes, your height or a trophy on a shelf. The song argues that it is something you *play* and practise: a compass needle that keeps faith with north **by moving**.

- **The lyrics are the hero** (about 70 % of each frame): big kinetic typography, synced per word. Quoted speech is set in italic.
- **The compass is the background** (about 30 %). Lyric cues knock its needle off course ("You were wrong"), pin it ("Do you defend yourself?"), freeze it ("it is only stuck"), turn the housing ("Turn, and the needle swings back") and let it swing home. A small physics model (spring and damping) does the swinging.

## Layout

```
audio/      the song
lyrics/     the lyrics, one sung line per row
data/       lyrics.json (word timings), audio.json (beats)
analysis/   alignment (Whisper) and beat analysis tools
app/        the renderer (TypeScript, three.js, Vite)
  src/look.ts      palette, painted backdrop shader, print grain
  src/kinetic.ts   kinetic lyric typography
  src/compass.ts   possessions shelf, chalk tallies, the compass and its needle
  src/main.ts      wiring, title card, render hooks
docs/       style bible
```

## Render a preview

GitHub → **Actions** → **render preview** → **Run workflow**. Pick a section (`opening`, `first-half`, `second-half` or `full`) and a resolution, then download the `honesty-<section>` artifact.

## Lyric timing

Pushing a change to `analysis/align_whisper.py` (or running **align lyrics** by hand) re-aligns `lyrics/lyrics.txt` to the vocals and commits `data/lyrics.json`.

## License

The code is MIT-licensed (see `LICENSE`). The song and lyrics are not covered by it.
