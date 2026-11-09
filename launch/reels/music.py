"""
Score for the reels: an original cue synthesised per reel, so every second of
audio is ours outright (no licence, no Content ID or Instagram audio claim).

    pip install numpy scipy soundfile
    python launch/reels/music.py [reel-id ...]

Reads launch/reels/out/<id>/timing.json (from voice.py) and scores to it:

    0.0    pad and a soft pulse under the hook: no intro to scroll past
    hook   kick and sub come in as the hook lands
    beat   a tick and a short whoosh on every card change
    cta    riser, a beat of air, then the hit as the end card lands

Same chords as the launch film (Fmaj9, Am7, Dm9, Bbmaj7), so the account has
one sound. The music ducks under every spoken line and the mix is mastered to
-14 LUFS, the level Reels normalises to. Writes music.wav and soundtrack.m4a
next to the timing.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

HERE = Path(__file__).parent
SR = 48000
BEAT = 0.5  # 120 BPM

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, f): return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)

def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na) ** 2
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e

def saw(f, n, phase):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1.0) - 1

CHORDS = [([53, 57, 60, 64, 67], 41), ([52, 57, 60, 64, 67], 45), ([50, 57, 60, 64, 65], 38), ([50, 58, 62, 65, 69], 46)]


def score(timing, rng):
    dur = timing["duration"]
    N = int(dur * SR)
    beats = timing["beats"]
    hook_end = beats[0]["end"]
    cta = next((b for b in beats if b["type"] == "cta"), beats[-1])
    bus = {k: np.zeros(N) for k in ("pad", "arp", "bass", "drums", "fx")}

    def place(name, sig, at, g=1.0):
        i = int(at * SR)
        if i >= N or i < 0: return
        j = min(N, i + len(sig))
        bus[name][i:j] += sig[: j - i] * g

    # Pad: one chord per two bars, overlapping.
    bar2 = 4 * BEAT * 2
    k, t0 = 0, 0.0
    while t0 < dur:
        notes, _ = CHORDS[k % 4]
        n = int((bar2 + 0.8) * SR)
        s = np.zeros(n)
        for m in notes:
            for d in (-7, 0, 7):
                s += saw(hz(m) * 2 ** (d / 1200), n, rng.random()) * 0.05
        place("pad", lp(s, 1000 if t0 < hook_end else 1700) * env(n, 0.4 if t0 else 0.05, 0.8), t0)
        k += 1; t0 += bar2

    # Sub bass and arp after the hook; both drop out for the end card's air.
    def pluck(m, length, decay, harm):
        n = int(length * SR); t = np.arange(n) / SR
        s = sum(a * np.sin(2 * np.pi * hz(m) * (i + 1) * t) for i, a in enumerate(harm))
        return s * np.exp(-t * decay) * env(n, 0.003, 0.04)
    PATTERN = [0, 2, 4, 3, 1, 2, 4, 3]
    b, step = hook_end, 0
    while b < cta["start"] - 0.6:
        chord = CHORDS[int(b // bar2) % 4]
        if step % 2 == 0:
            place("bass", pluck(chord[1], 0.45, 5, [1, 0.3]), b, 0.3)
        place("arp", pluck(chord[0][PATTERN[step % 8]] + 12, 0.5, 9, [1, 0.35, 0.12]), b, 0.07)
        step += 1; b += BEAT / 2

    # Drums: a soft pulse under the hook, the groove from the first card.
    def kick():
        n = int(0.4 * SR); t = np.arange(n) / SR
        f = 45 + 75 * np.exp(-t * 28)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * env(n, 0.001, 0.05)
    def hat():
        n = int(0.05 * SR); t = np.arange(n) / SR
        return hp(rng.standard_normal(n), 7000) * np.exp(-t * 80)
    def clap():
        n = int(0.22 * SR); t = np.arange(n) / SR
        return bp(rng.standard_normal(n), 900, 3200) * np.exp(-t * 18)
    K, H, C = kick(), hat(), clap()
    b, i = 0.0, 0
    while b < cta["start"] - 0.6:
        if b < hook_end:
            if i % 2 == 0: place("drums", K, b, 0.3)
        else:
            place("drums", K, b, 0.55)
            if i % 2 == 1: place("drums", C, b, 0.1)
            place("drums", H, b + BEAT / 2, 0.06)
        i += 1; b += BEAT

    # Sound design on the cuts.
    def tick(f, d=0.03):
        n = int(d * SR); t = np.arange(n) / SR
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)
    def whoosh(length):
        n = int(length * SR); seg = n // 16; win = 2 * seg
        x = rng.standard_normal(n + win); out = np.zeros(n + win)
        for j in range(16):
            lo = 300 + j / 15 * 2600
            out[j * seg:j * seg + win] += bp(x[j * seg:j * seg + win], lo, lo * 2.2) * np.hanning(win)
        return out[:n] * np.linspace(0.2, 1, n) ** 2 * 0.45
    for bt in beats[1:]:
        if bt is cta: continue
        place("fx", whoosh(0.35), bt["start"] - 0.3, 0.4)
        place("fx", tick(2400 if bt["type"] == "item" else 1800), bt["start"], 0.2)
    for j in range(5):  # the mark's cells landing on the end card
        place("fx", tick(1600 + j * 180), cta["start"] + 0.2 + j * 0.09, 0.16)
    n = int(1.2 * SR); t = np.arange(n) / SR
    riser = whoosh(1.2) * 1.2 + np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / t[-1]) ** 2) / SR) * 0.04 * (t / t[-1]) ** 2
    place("fx", riser, cta["start"] - 1.25, 0.5)
    place("fx", K, cta["start"], 0.75)
    place("bass", np.sin(2 * np.pi * hz(29) * np.arange(int(2.5 * SR)) / SR) * np.exp(-np.arange(int(2.5 * SR)) / SR * 1.2), cta["start"], 0.4)
    crash = hp(rng.standard_normal(int(2 * SR)), 5000) * np.exp(-np.arange(int(2 * SR)) / SR * 2.4)
    place("fx", crash, cta["start"], 0.05)

    # Reverb from the pad, arp and fx.
    ir_n = int(2.4 * SR)
    ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * (6.9 / 2.4))
    ir = lp(ir, 6000) / np.sqrt(np.sum(ir ** 2))
    send = bus["pad"] * 0.35 + bus["arp"] * 0.45 + bus["fx"] * 0.3
    wet = fftconvolve(send, ir)[:N]
    mono = sum(bus.values()) + wet * 0.9
    # A little width: the arp and fx offset between channels.
    right = mono - bus["arp"] * 0.3 + np.roll(bus["arp"], int(0.012 * SR)) * 0.3
    music = hp(np.stack([mono, right]), 30).T
    fade = np.ones(N)
    fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    fade[int((dur - 0.6) * SR):] = np.linspace(1, 0, N - int((dur - 0.6) * SR)) ** 1.5
    gap = (np.arange(N) / SR >= cta["start"] - 0.12) & (np.arange(N) / SR < cta["start"])
    fade[gap] *= 0.08  # a beat of air before the hit
    music *= fade[:, None]
    return music / (np.max(np.abs(music)) * 1.12)


only = set(sys.argv[1:])
for d in sorted((HERE / "out").iterdir()):
    if not (d / "timing.json").exists() or (only and d.name not in only):
        continue
    timing = json.loads((d / "timing.json").read_text())
    music = score(timing, np.random.default_rng(7))
    sf.write(d / "music.wav", music.astype(np.float32), SR)
    filters = (
        "[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=80,"
        "acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit[v][key];"
        "[0:a]volume=-12dB[m];"
        "[m][key]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=400[duck];"
        "[duck][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]"
    )
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y", "-i", str(d / "music.wav"), "-i", str(d / "voice.wav"),
        "-filter_complex", filters, "-map", "[out]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
        "-t", str(timing["duration"]), str(d / "soundtrack.m4a"),
    ], check=True)
    print("scored", d.name, f"{timing['duration']}s")
