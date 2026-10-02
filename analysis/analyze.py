"""Minimal first-pass music analysis.

Input:
    ../audio/kindness-is-not-magic.wav

Output:
    ../data/audio.json

This script is deliberately small. It provides duration, tempo, beat times,
RMS, and broad-band energy envelopes. More detailed stem/onset analysis can be
added once the visual prototype warrants it.
"""
from pathlib import Path
import json

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio" / "kindness-is-not-magic.wav"
OUT = ROOT / "data" / "audio.json"


def norm(x: np.ndarray) -> list[float]:
    if len(x) == 0:
        return []
    q = float(np.percentile(x, 99))
    if q <= 0:
        q = 1.0
    return np.clip(x / q, 0, 1).round(4).tolist()


def main() -> None:
    y, sr = librosa.load(AUDIO, sr=None, mono=True)
    duration = float(len(y) / sr)

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr).round(4).tolist()

    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    stft = np.abs(librosa.stft(y, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr)

    def band(lo: float, hi: float | None) -> np.ndarray:
        mask = freqs >= lo
        if hi is not None:
            mask &= freqs < hi
        return stft[mask].mean(axis=0) if np.any(mask) else np.zeros(stft.shape[1])

    frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

    payload = {
        "duration": round(duration, 4),
        "sampleRate": int(sr),
        "tempo": round(tempo, 4),
        "beats": beats,
        "envelopes": {
            "fpsApprox": round(float(sr / hop), 4),
            "times": frame_times.round(4).tolist(),
            "rms": norm(rms),
            "low": norm(band(0, 180)),
            "mid": norm(band(180, 2500)),
            "high": norm(band(2500, None)),
        },
    }

    OUT.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
