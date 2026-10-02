# Honesty Is a Compass: music video

A code-rendered music video for **Honesty Is a Compass** (Produced by Emergence). It is a companion to [Kindness-Is-Not-Magic-Video](https://github.com/albertjanvanhoek/Kindness-Is-Not-Magic-Video) and is built on the same engine. Every frame is a deterministic function of song time.

## The idea

People talk about honesty as something you own, like the colour of your eyes, your height or a trophy on a shelf. The song argues that it is something you *play* and practise: a compass needle that keeps faith with north **by moving**.

The film follows the mood board (`docs/moodboard.webp`): a journey from a rainy night in the city, through a storm, to a golden sunrise over wide landscapes. The frenchcore (~207 BPM) is its heartbeat: in the drops the frame punches on every kick and each word slams in on its beat. See `docs/STYLE_BIBLE.md`.

## Layout

```
audio/      the song
lyrics/     the lyrics, one sung line per row
data/       lyrics.json (word timings), audio.json (beats)
analysis/   alignment (Whisper) and beat analysis tools
app/        the renderer (TypeScript, three.js, Vite)
  src/look.ts      palette, the landscape shader (sky, ridges, lake, rain), film grain
  src/music.ts     beats, kick strength, energy, sections, camera flight
  src/kinetic.ts   kinetic lyric typography
  src/compass.ts   possessions shelf, the compass and its needle
  src/story.ts     torn-paper notes and the silhouetted figure
  src/main.ts      the journey keyframes, title card, frenchcore punch, render hooks
docs/       style bible
```

## Render a preview

GitHub → **Actions** → **render preview** → **Run workflow**. Pick a section (`intro-build`, `drop-a`, `breakdown-drop-b`, `finale` or `full`) and a resolution, then download the `honesty-<section>` artifact.

## Lyric timing

Pushing a change to `analysis/align_whisper.py` (or running **align lyrics** by hand) re-aligns `lyrics/lyrics.txt` to the vocals and commits `data/lyrics.json`.

## License

The code is MIT-licensed (see `LICENSE`). The song and lyrics are not covered by it.
