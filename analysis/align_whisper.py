from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from difflib import SequenceMatcher

from faster_whisper import WhisperModel

WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")

def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9']", "", s.lower())

@dataclass
class Tok:
    raw: str
    key: str
    line_i: int
    word_i: int

@dataclass
class Heard:
    raw: str
    key: str
    start: float
    end: float


def similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def align(expected: list[Tok], heard: list[Heard]) -> list[int | None]:
    n, m = len(expected), len(heard)
    inf = 10**9
    dp = [[inf] * (m + 1) for _ in range(n + 1)]
    bt: list[list[tuple[int, int, str] | None]] = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0.0

    for i in range(n + 1):
        for j in range(m + 1):
            here = dp[i][j]
            if here >= inf:
                continue
            if i < n and j < m:
                sim = similarity(expected[i].key, heard[j].key)
                sub = 0.0 if sim == 1 else (0.35 if sim >= 0.75 else (0.7 if sim >= 0.55 else 1.25))
                cand = here + sub
                if cand < dp[i + 1][j + 1]:
                    dp[i + 1][j + 1] = cand
                    bt[i + 1][j + 1] = (i, j, "match")
            if i < n:
                cand = here + 0.9
                if cand < dp[i + 1][j]:
                    dp[i + 1][j] = cand
                    bt[i + 1][j] = (i, j, "skip_expected")
            if j < m:
                cand = here + 0.65
                if cand < dp[i][j + 1]:
                    dp[i][j + 1] = cand
                    bt[i][j + 1] = (i, j, "skip_heard")

    mapping: list[int | None] = [None] * n
    i, j = n, m
    while i or j:
        prev = bt[i][j]
        if prev is None:
            break
        pi, pj, op = prev
        if op == "match":
            sim = similarity(expected[pi].key, heard[pj].key)
            if sim >= 0.5:
                mapping[pi] = pj
        i, j = pi, pj
    return mapping


def interpolate(words: list[dict], duration: float) -> None:
    matched = [i for i, w in enumerate(words) if w.get("start") is not None]
    if not matched:
        step = duration / max(1, len(words))
        for i, w in enumerate(words):
            w["start"] = i * step
            w["end"] = (i + 1) * step
        return

    for i in range(len(words)):
        if words[i].get("start") is not None:
            continue
        left = max((k for k in matched if k < i), default=None)
        right = min((k for k in matched if k > i), default=None)
        if left is not None and right is not None:
            span = right - left
            q0 = (i - left) / span
            q1 = (i - left + 1) / span
            a = float(words[left]["end"])
            b = float(words[right]["start"])
            words[i]["start"] = a + (b - a) * q0
            words[i]["end"] = a + (b - a) * q1
        elif left is not None:
            base = float(words[left]["end"])
            k = i - left
            words[i]["start"] = base + 0.18 * (k - 1)
            words[i]["end"] = base + 0.18 * k
        else:
            assert right is not None
            base = float(words[right]["start"])
            k = right - i
            words[i]["end"] = max(0.0, base - 0.18 * (k - 1))
            words[i]["start"] = max(0.0, base - 0.18 * k)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--lyrics", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()

    lyric_lines = [x.strip() for x in Path(args.lyrics).read_text().splitlines() if x.strip()]

    expected: list[Tok] = []
    original_words: list[list[str]] = []
    for li, line in enumerate(lyric_lines):
        words = WORD_RE.findall(line)
        original_words.append(words)
        for wi, w in enumerate(words):
            expected.append(Tok(w, norm(w), li, wi))

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        args.audio,
        language="en",
        word_timestamps=True,
        vad_filter=False,
        beam_size=5,
        condition_on_previous_text=True,
    )

    heard: list[Heard] = []
    segments_out = []
    for seg in segments:
        seg_words = []
        for w in (seg.words or []):
            key = norm(w.word)
            if not key:
                continue
            h = Heard(w.word.strip(), key, float(w.start), float(w.end))
            heard.append(h)
            seg_words.append({"w": h.raw, "start": round(h.start, 3), "end": round(h.end, 3)})
        segments_out.append({"start": round(float(seg.start), 3), "end": round(float(seg.end), 3), "text": seg.text.strip(), "words": seg_words})

    mapping = align(expected, heard)

    flat: list[dict] = []
    matched = 0
    for i, tok in enumerate(expected):
        j = mapping[i]
        if j is None:
            flat.append({"w": tok.raw, "start": None, "end": None, "matched": False})
        else:
            h = heard[j]
            flat.append({"w": tok.raw, "start": round(h.start, 3), "end": round(h.end, 3), "matched": True, "heard": h.raw})
            matched += 1

    duration = float(info.duration)
    interpolate(flat, duration)

    out_lines = []
    cursor = 0
    for li, (line, words) in enumerate(zip(lyric_lines, original_words)):
        row = []
        for wi, word in enumerate(words):
            item = flat[cursor]
            row.append({
                "w": word,
                "start": round(float(item["start"]), 3),
                "end": round(float(item["end"]), 3),
                "matched": bool(item["matched"]),
                **({"heard": item["heard"]} if "heard" in item else {}),
            })
            cursor += 1
        out_lines.append({
            "text": line,
            "start": row[0]["start"],
            "end": row[-1]["end"],
            "words": row,
        })

    payload = {
        "source": args.lyrics,
        "audio": args.audio,
        "alignment": {
            "status": "machine-aligned-needs-QA",
            "method": f"faster-whisper {args.model} word timestamps + monotonic dynamic-programming match to known lyrics",
            "language": "en",
            "matchedWords": matched,
            "totalWords": len(expected),
            "matchFraction": round(matched / max(1, len(expected)), 4),
            "duration": round(duration, 3),
            "note": "Review stretched sung words and repeated phrases before final export."
        },
        "lines": out_lines,
        "transcriptSegments": segments_out,
    }

    Path(args.out).write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload["alignment"], indent=2))


if __name__ == "__main__":
    main()
