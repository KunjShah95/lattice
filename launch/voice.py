"""
Voiceover for the launch film: Kokoro (open-weights TTS, runs offline).

    pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
    python launch/voice.py /path/to/kokoro-v1.0.onnx /path/to/voices-v1.0.bin

Reads launch/voiceover.json ([start seconds, line] pairs, timed to the scenes
in index.html), places every line at its cue on a 36 s timeline, and masters
it to launch/voiceover.m4a (-14 LUFS, the level Reels and Shorts normalise
to). render.mjs muxes that into both cuts.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
DURATION, VOICE = 36.0, "af_heart"

kokoro = Kokoro(sys.argv[1], sys.argv[2])
track, sr = None, 24000
for start, text in json.loads((HERE / "voiceover.json").read_text()):
    samples, sr = kokoro.create(text, voice=VOICE, speed=1.0, lang="en-us")
    if track is None:
        track = np.zeros(int(DURATION * sr), dtype=np.float32)
    at = int(start * sr)
    end = min(len(track), at + len(samples))
    track[at:end] += samples[: end - at]
    print(f"{start:5.1f}s  {len(samples) / sr:4.2f}s  {text}")
sf.write(HERE / "voiceover.wav", track, sr)
subprocess.run([
    "ffmpeg", "-loglevel", "error", "-y", "-i", str(HERE / "voiceover.wav"),
    "-af", "highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=7",
    "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", str(HERE / "voiceover.m4a"),
], check=True)
