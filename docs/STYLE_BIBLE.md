# Style Bible

The same record-sleeve series as *Kindness Is Not Magic*: a painted backdrop, cream paper, outlined vintage type and print grain. This film is in **ink blue and brass**, the colours of an old compass and a nautical chart.

## Balance

- **70 % lyrics**: big, readable, synced per word.
- **30 % background**: the compass, kept in the lower part of the frame below the words.

## Palette

Source of truth: `PALETTE` in `app/src/look.ts`.

| name | hex | role |
|---|---|---|
| deep | `#141e2a` | darkest shadows, letterbox |
| dark / mid / light / haze | `#1d3045` / `#2a445f` / `#3d5b78` / `#5d7894` | painted backdrop |
| cream / paper | `#f3e6c8` / `#eadbb8` | sung words, compass card, sleeve |
| brass | `#d4a84f` | the word being sung; the compass bezel |
| honey / ground / brown | `#b8914f` / `#6b5236` / `#5a3d22` | wood, warm details |
| ink | `#1a120b` | type outline and shadow, dial markings |
| needle | `#c4513a` | the north half of the needle, the N |
| frost | `#d8e4ec` | frozen, stuck, rigid ("I never change") |

## Typography

- **Fraunces** (soft, wonky, heavy) for lyrics and title, with an ink outline and printed drop shadow.
- Quoted speech ("I am honest.", "You were wrong.") is set in **italic**, like a voice.
- **Jost** for small labels (EYES, HEIGHT, HONEST, dial numbers).
- Karaoke: unsung paper (dimmed), sung word brass, sung cream. Rigid lines ("never changes", "only stuck") are set in frost.

## Motion

- The needle never snaps: it swings, overshoots and settles (spring plus damping).
- Line motions follow meaning: *swing* (play, change, moving), *settle* (lose, wrong), *stuck* (never, frozen), *step* (practice, learn, better), *gather* (closer to true, home), *echo* on the beat (teach me, again).
