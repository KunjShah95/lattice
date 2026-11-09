"""
Voiceover and timeline for the reels: Kokoro (open-weights TTS, runs offline).

    pip install kokoro-onnx soundfile numpy
    # model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
    python launch/reels/voice.py /path/to/kokoro-v1.0.onnx /path/to/voices-v1.0.bin [reel-id ...]

The voice sets the clock, not the other way round. Each beat's `vo` line is
synthesised first and measured, and the beat is given exactly that long plus a
short breath. So the picture can never run ahead of the voice, and a reel is
as short as its script allows: retention on Reels is decided in seconds.

Writes, per reel, to launch/reels/out/<id>/:
  timing.json   the beats with start/end/voice timings, read by reel.html,
                music.py and render.mjs
  voice.wav     the voice on that timeline
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
VOICE, SPEED = "af_heart", 1.08   # a touch quicker than the launch film: Reels pace
LEAD = 0.12                      # the hook speaks almost at once: no intro to scroll past
BREATH = 0.32                    # gap after each line
HOLD = {"cta": 1.6, "verdict": 0.35, "stack": 0.6}  # extra time on screen after the line ends

scripts = json.loads((HERE / "scripts.json").read_text())["reels"]
only = set(sys.argv[3:])
kokoro = Kokoro(sys.argv[1], sys.argv[2])

for reel in scripts:
    if only and reel["id"] not in only:
        continue
    out = HERE / "out" / reel["id"]
    out.mkdir(parents=True, exist_ok=True)
    clips, sr, t = [], 24000, LEAD
    beats = []
    for beat in reel["beats"]:
        samples, sr = kokoro.create(beat["vo"], voice=VOICE, speed=SPEED, lang="en-us")
        # Trim the model's leading and trailing silence, so the measured length
        # is the spoken length and the beat cuts land on the words.
        voiced = np.flatnonzero(np.abs(samples) > 0.01)
        if len(voiced):
            samples = samples[max(0, voiced[0] - 240): voiced[-1] + 480]
        dur = len(samples) / sr
        start = 0.0 if not beats else t
        vo_at = LEAD if not beats else t + 0.08
        end = vo_at + dur + BREATH + HOLD.get(beat["type"], 0)
        clips.append((vo_at, samples))
        beats.append({**beat, "start": round(start, 3), "end": round(end, 3),
                      "voStart": round(vo_at, 3), "voEnd": round(vo_at + dur, 3)})
        print(f"{reel['id']}  {start:5.2f}-{end:5.2f}  {beat['type']:7}  {beat['vo']}")
        t = end
    total = round(t + 0.25, 2)
    track = np.zeros(int(total * sr) + sr, dtype=np.float32)
    for at, s in clips:
        i = int(at * sr)
        track[i:i + len(s)] += s
    sf.write(out / "voice.wav", track[: int(total * sr)], sr)
    (out / "timing.json").write_text(json.dumps(
        {"id": reel["id"], "path": reel["path"], "duration": total, "beats": beats}, indent=2))
    print(f"{reel['id']}: {total:.1f}s")
