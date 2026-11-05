"""
Score for the launch film: an original cue synthesised from scratch, so it is
ours outright (no licence, no Content ID claim on Reels, Shorts or YouTube).

    pip install numpy scipy soundfile
    python launch/music.py

Writes launch/music.wav, then mixes it under launch/voiceover.wav (from
voice.py) into launch/soundtrack.m4a: the music ducks under every spoken line
and the whole mix is mastered to -14 LUFS. render.mjs muxes soundtrack.m4a
into both cuts.

Scored to the picture, not just laid under it. 120 BPM with the grid offset
by 0.2 s so bars land on the film's beats:

     0.0  pad alone; a tick as each cell of the mark lands
     3.2  headline: kick and sub bass come in
     7.0  whoosh as the browser flies up; hats and the pluck arpeggio enter
    11.2  full groove (clap on 2 and 4) through the product scenes
    18.1  click on "Build my stack"
    25.0  whoosh on the light-to-dark wipe
    30.8  riser, a beat of silence, then the hit at 32.2 as the end card lands
    35.4  ring out and fade with the picture

Fmaj9, Am7, Dm9, Bbmaj7: warm and forward-leaning, never louder than the
voice.
"""
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

HERE = Path(__file__).parent
SR = 48000
DUR = 36.0
N = int(DUR * SR)
BEAT = 0.5
GRID = 0.2  # first downbeat
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def place(bus, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(bus):
        return
    j = min(len(bus), i + len(sig))
    bus[i:j] += sig[: j - i] * gain


def env(n, a, r, sustain=True):
    """Attack/release envelope over n samples (seconds for a and r)."""
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1.0) - 1


# Two-channel buses: pad, keys, drums, fx; reverb is sent from each.
L = {k: np.zeros(N) for k in ("pad", "arp", "bass", "drums", "fx")}
R = {k: np.zeros(N) for k in L}
verb_send_L, verb_send_R = np.zeros(N), np.zeros(N)

CHORDS = {
    "F": ([53, 57, 60, 64, 67], 41),
    "Am": ([52, 57, 60, 64, 67], 45),
    "Dm": ([50, 57, 60, 64, 65], 38),
    "Bb": ([50, 58, 62, 65, 69], 46),
}
# (start, end, chord)
PROG = [(0.0, 3.2, "F"), (3.2, 7.2, "F"), (7.2, 11.2, "Am"), (11.2, 15.2, "Dm"),
        (15.2, 19.2, "Bb"), (19.2, 23.2, "F"), (23.2, 27.2, "Am"), (27.2, 31.2, "Dm"),
        (31.2, 32.05, "Bb"), (32.2, 36.0, "F")]

# ---------- pad: detuned saws through a slowly opening low-pass ----------
for start, end, name in PROG:
    notes, _ = CHORDS[name]
    n = int((end - start + 0.9) * SR)  # overlap into the next chord
    sl, sr_ = np.zeros(n), np.zeros(n)
    for k, m in enumerate(notes + ([notes[0] + 12] if name == "F" and start >= 32 else [])):
        for d, pan in ((-7, 0.25), (0, 0.5), (7, 0.75)):
            v = saw(hz(m) * 2 ** (d / 1200), n, rng.random()) * 0.06
            sl += v * (1 - pan)
            sr_ += v * pan
    cutoff = 900 if start < 3.2 else (1500 if start < 32 else 2400)
    e = env(n, 0.5 if start else 1.2, 0.9)
    place(L["pad"], lp(sl, cutoff) * e, start)
    place(R["pad"], lp(sr_, cutoff) * e, start)

# ---------- sub bass: root on each beat, octave on the off-beat ----------
def pluck_bass(m, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t)
    return s * np.exp(-t * 5) * env(n, 0.005, 0.03)

for start, end, name in PROG:
    if start < 3.2 or start >= 32:
        continue
    root = CHORDS[name][1]
    b = start
    while b < end - 1e-6:
        place(L["bass"], pluck_bass(root, 0.45), b, 0.32)
        place(L["bass"], pluck_bass(root + 12, 0.22), b + BEAT / 2, 0.14)
        b += BEAT
# Final hit: a long sub under the end card.
n = int(3.8 * SR)
t = np.arange(n) / SR
place(L["bass"], np.sin(2 * np.pi * hz(29) * t) * np.exp(-t * 0.9) * env(n, 0.005, 0.6), 32.2, 0.45)
R["bass"] = L["bass"].copy()

# ---------- pluck arpeggio, 8ths, ping-ponged ----------
PATTERN = [0, 2, 4, 3, 1, 2, 4, 3]
def pluck(m):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return s * np.exp(-t * 9) * env(n, 0.003, 0.05)

step = 0
for start, end, name in PROG:
    if start < 7.2 or start >= 32:
        continue
    notes = CHORDS[name][0]
    b = start
    while b < end - 1e-6:
        m = notes[PATTERN[step % 8]] + 12
        pan = 0.3 if step % 2 == 0 else 0.7
        g = 0.09 if b > 11.2 else 0.06
        sig = pluck(m)
        place(L["arp"], sig, b, g * (1 - pan) * 2)
        place(R["arp"], sig, b, g * pan * 2)
        step += 1
        b += BEAT / 2
# Lead-in arp on the browser fly-in (7.0), rising.
for i, m in enumerate([65, 69, 72, 76]):
    place(L["arp"], pluck(m), 6.7 + i * 0.075, 0.06)
    place(R["arp"], pluck(m), 6.7 + i * 0.075, 0.06)
# Stereo delay (3/16), fed back twice.
for src, dst, d in ((L, R, 0.375), (R, L, 0.375)):
    echo = np.zeros(N)
    for k, g in ((1, 0.35), (2, 0.15)):
        place(echo, src["arp"], d * k, g)
    dst["arp"] += lp(echo, 3500)

# ---------- drums ----------
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * env(n, 0.001, 0.05)

def hat():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * 70)

def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 900, 3200) * np.exp(-t * 18)
    for k in (0.011, 0.022):  # the three-flam clap
        s[int(k * SR):] += bp(rng.standard_normal(n - int(k * SR)), 900, 3200) * 0.6 * np.exp(-t[: n - int(k * SR)] * 40)
    return s

K, H, C = kick(), hat(), clap()
b = 3.2
while b < 32.05:
    beat_no = round((b - GRID) / BEAT)
    if b < 11.2:
        if beat_no % 2 == 0:
            place(L["drums"], K, b, 0.55)  # half-time under the headline
    else:
        place(L["drums"], K, b, 0.6)
        if beat_no % 2 == 1:
            place(L["drums"], C, b, 0.12)
            verb_send_L[int(b * SR):int(b * SR) + len(C)] += C[: max(0, min(len(C), N - int(b * SR)))] * 0.05
    if b >= 7.0:
        place(L["drums"], H, b + BEAT / 2, 0.06)
        if b >= 11.2:
            place(L["drums"], H, b + BEAT / 4 * 3, 0.025)
    b += BEAT
R["drums"] = L["drums"].copy()

# ---------- sound design ----------
def tick(f=2200, d=0.03):
    n = int(d * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)

def whoosh(length):
    """Noise through a band-pass sweeping upward, swelling in."""
    n = int(length * SR)
    seg = n // 24
    win = 2 * seg
    x = rng.standard_normal(n + win)
    out = np.zeros(n + win)
    for i in range(24):
        lo = 200 + i / 23 * 3000
        s0 = i * seg
        out[s0:s0 + win] += bp(x[s0:s0 + win], lo, lo * 2.2) * np.hanning(win)
    return out[:n] * np.linspace(0.2, 1, n) ** 2 * 0.5


# Mark cells landing (intro and end card): soft ticks rising in pitch.
for base in (0.15, 32.15):
    for i in range(5):
        place(L["fx"], tick(1600 + i * 180), base + i * 0.09 + 0.2, 0.18)
        place(R["fx"], tick(1600 + i * 180), base + i * 0.09 + 0.2, 0.18)
# Browser flies up; light-to-dark wipe.
for at, length in ((6.3, 0.8), (24.6, 0.9)):
    w = whoosh(length)
    place(L["fx"], w, at, 0.5)
    place(R["fx"], w, at + 0.012, 0.45)
# "Build my stack" click.
place(L["fx"], tick(3200, 0.02), 18.1, 0.5)
place(R["fx"], tick(3200, 0.02), 18.1, 0.5)
place(L["fx"], kick()[: int(0.15 * SR)], 18.1, 0.25)
place(R["fx"], kick()[: int(0.15 * SR)], 18.1, 0.25)
# Riser into the end card, then the hit.
n = int(1.35 * SR)
t = np.arange(n) / SR
riser = whoosh(1.35) * 1.2 + np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / t[-1]) ** 2) / SR) * 0.05 * (t / t[-1]) ** 2
place(L["fx"], riser, 30.8, 0.6)
place(R["fx"], riser, 30.8, 0.6)
hit = kick() * 1.0
place(L["fx"], hit, 32.2, 0.7)
place(R["fx"], hit, 32.2, 0.7)
crash = hp(rng.standard_normal(int(2.5 * SR)), 5000) * np.exp(-np.arange(int(2.5 * SR)) / SR * 2.2)
place(L["fx"], crash, 32.2, 0.05)
place(R["fx"], np.roll(crash, 300), 32.2, 0.05)

# ---------- reverb (exponential noise tail) ----------
def ir(seconds, seed):
    n = int(seconds * SR)
    r = np.random.default_rng(seed).standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    return lp(r, 6000) / np.sqrt(np.sum(r ** 2))

for k, amt in (("pad", 0.35), ("arp", 0.45), ("fx", 0.3)):
    verb_send_L += L[k] * amt
    verb_send_R += R[k] * amt
wet_L = fftconvolve(verb_send_L, ir(2.8, 1))[:N]
wet_R = fftconvolve(verb_send_R, ir(2.8, 2))[:N]

mixL = sum(L.values()) + wet_L * 0.9
mixR = sum(R.values()) + wet_R * 0.9
music = np.stack([mixL, mixR], axis=1)
music = hp(music.T, 30).T
# Fades with the picture: in over the first 0.35 s, out from 35.4 s.
fade = np.ones(N)
fade[: int(0.35 * SR)] = np.linspace(0, 1, int(0.35 * SR))
fade[int(35.0 * SR):] = np.linspace(1, 0, N - int(35.0 * SR)) ** 1.5
# The beat of silence before the hit.
gap = (np.arange(N) / SR >= 32.05) & (np.arange(N) / SR < 32.2)
fade[gap] *= 0.08
music *= fade[:, None]
music /= np.max(np.abs(music)) * 1.12
sf.write(HERE / "music.wav", music.astype(np.float32), SR)
print("wrote music.wav")

# ---------- mix under the voice ----------
voice = HERE / "voiceover.wav"
filters = (
    "[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=80,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit[v][key];"
    # Music sits around -14 dB under the voice and ducks a further ~6 dB while it speaks.
    "[0:a]volume=-13dB[m];"
    "[m][key]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=450[duck];"
    "[duck][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]"
)
subprocess.run([
    "ffmpeg", "-loglevel", "error", "-y", "-i", str(HERE / "music.wav"), "-i", str(voice),
    "-filter_complex", filters, "-map", "[out]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
    "-t", str(DUR), str(HERE / "soundtrack.m4a"),
], check=True)
print("wrote soundtrack.m4a")
