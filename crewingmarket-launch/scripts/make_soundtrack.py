"""Original, fully synthesized soundtrack + sound design for the commercial.

No samples, no third-party audio: every sound is generated here from sine,
saw and noise sources, so the result is 100% original and free to use.

All timing comes from src/timeline.json (same file the video uses).

Run:  python3 scripts/make_soundtrack.py   ->  public/audio/soundtrack.wav
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
import sys
TL_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "src" / "timeline.json"
TL = json.loads(TL_PATH.read_text())
OUT_REL = TL.get("audioOut", "audio/soundtrack.wav")
SR = 48000
FPS = TL["fps"]
DUR = TL["durationInFrames"] / FPS + 0.5
N = int(DUR * SR)
BEAT = 60 / TL["bpm"]
rng = np.random.default_rng(13112026)

L = np.zeros(N)
R = np.zeros(N)
# separate bus that gets the long reverb
VL = np.zeros(N)
VR = np.zeros(N)


def fr(f):  # frame -> seconds
    return f / FPS


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def add(sig, at, gain=1.0, pan=0.0, verb=0.0):
    """Mix mono or stereo sig at time `at` seconds."""
    i = int(at * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        lg = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        rg = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        sl, sr_ = sig * lg, sig * rg
    else:
        sl, sr_ = sig[0] * gain, sig[1] * gain
    n = min(len(sl), N - i)
    L[i:i + n] += sl[:n]
    R[i:i + n] += sr_[:n]
    if verb:
        VL[i:i + n] += sl[:n] * verb
        VR[i:i + n] += sr_[:n] * verb


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def adsr(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = min(int(a * SR), n // 2), min(int(r * SR), n // 2)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(freq, t, detune=0.0):
    out = np.zeros_like(t)
    for d in (-detune, 0, detune) if detune else (0,):
        f = freq * (1 + d)
        out += 2 * ((t * f + rng.random()) % 1) - 1
    return out / (3 if detune else 1)


def note_hz(n):
    """MIDI note -> Hz"""
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- instruments
def sub_boom(dur=3.0, f0=70, f1=28):
    t = t_arr(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env_exp(len(t), 0.9)
    s = np.tanh(s * 2.2) * 0.8
    crack = hp(rng.standard_normal(len(t)), 900) * env_exp(len(t), 0.05) * 0.5
    body = lp(rng.standard_normal(len(t)), 300) * env_exp(len(t), 0.25) * 0.9
    return s + crack + body


def taiko(dur=1.2, f0=95):
    t = t_arr(dur)
    f = f0 * (1 + 0.6 * np.exp(-t * 30))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 0.28)
    skin = bp(rng.standard_normal(len(t)), 120, 900) * env_exp(len(t), 0.06) * 0.6
    return np.tanh((s + skin) * 1.6)


def kick(dur=0.45):
    t = t_arr(dur)
    f = 48 + 110 * np.exp(-t * 35)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 0.16)
    click = hp(rng.standard_normal(len(t)), 2500) * env_exp(len(t), 0.004) * 0.25
    return np.tanh((s + click) * 1.4)


def hat(dur=0.09, open_=False):
    t = t_arr(0.35 if open_ else dur)
    return hp(rng.standard_normal(len(t)), 7000, 4) * env_exp(len(t), 0.12 if open_ else 0.022)


def snare_hit(dur=0.25):
    t = t_arr(dur)
    tone = np.sin(2 * np.pi * 190 * t) * env_exp(len(t), 0.05)
    nz = bp(rng.standard_normal(len(t)), 1500, 9000) * env_exp(len(t), 0.07)
    return tone * 0.5 + nz


def crash(dur=4.0):
    t = t_arr(dur)
    nz = hp(rng.standard_normal(len(t)), 4500, 2) * env_exp(len(t), 1.1)
    ring = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) for f in (3120, 4470, 5890, 7210)) * 0.05
    return (nz + ring * env_exp(len(t), 1.4)) * 0.6


def pad(notes, dur, bright=1200, detune=0.006, attack=0.35, release=0.6):
    t = t_arr(dur)
    l = np.zeros_like(t)
    r = np.zeros_like(t)
    for n in notes:
        f = note_hz(n)
        l += saw(f, t, detune)
        r += saw(f * 1.0015, t, detune)
    e = adsr(len(t), attack, release)
    return np.stack([lp(l, bright) * e, lp(r, bright) * e]) / max(1, len(notes))


def pluck(n, dur=0.32, bright=3800):
    t = t_arr(dur)
    f = note_hz(n)
    s = saw(f, t) * 0.6 + np.sign(np.sin(2 * np.pi * f * t)) * 0.25
    return lp(s, bright) * env_exp(len(t), 0.11) * adsr(len(t), 0.002, 0.05)


def bass(n, dur):
    t = t_arr(dur)
    f = note_hz(n)
    s = np.sin(2 * np.pi * f * t) + 0.35 * lp(saw(f, t), 600)
    return np.tanh(s * 1.3) * adsr(len(t), 0.004, 0.05) * env_exp(len(t), 0.6)


def brass_lead(n, dur):
    t = t_arr(dur)
    f = note_hz(n) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 2, 0, 1))
    ph = np.cumsum(f) / SR
    s = 2 * (ph % 1) - 1
    cutoff_env = 900 + 2600 * (1 - np.exp(-t * 6))
    # cheap time-varying filter: crossfade two static filters
    a = lp(s, 900)
    b = lp(s, 3500)
    k = (cutoff_env - 900) / 2600
    return (a * (1 - k) + b * k) * adsr(len(t), 0.06, 0.25)


def ship_horn(dur=2.6, f=82):
    """Low, slightly detuned horn: synthesized, not sampled."""
    t = t_arr(dur)
    s = saw(f, t, 0.004) + 0.6 * saw(f * 1.5, t, 0.003)
    s = lp(s, 700, 4)
    s = np.tanh(s * 1.5)
    return s * adsr(len(t), 0.25, 0.9)


def ocean(dur):
    t = t_arr(dur)
    nz = rng.standard_normal(len(t))
    brown = lp(nz, 500, 2)
    surf = bp(nz, 400, 3000) * 0.25
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5 + 1) * np.sin(2 * np.pi * t / 2.7)
    l = (brown * 0.9 + surf) * swell
    nz2 = rng.standard_normal(len(t))
    r = (lp(nz2, 500, 2) * 0.9 + bp(nz2, 400, 3000) * 0.25) * swell
    return np.stack([l, r]) * 0.6


def drone(dur, notes=(26, 38, 45), bright_from=180, bright_to=900):
    t = t_arr(dur)
    s = sum(saw(note_hz(n), t, 0.004) for n in notes) / len(notes)
    lo = lp(s, bright_from)
    hi = lp(s, bright_to)
    k = np.clip(t / dur, 0, 1) ** 1.5
    out = (lo * (1 - k) + hi * k) * adsr(len(t), 0.8, 0.5)
    return np.stack([out, np.roll(out, 300)])


def riser(dur):
    t = t_arr(dur)
    nz = rng.standard_normal(len(t))
    bands = [bp(nz, lo, lo * 1.6) for lo in (300, 500, 800, 1300, 2100, 3400, 5500, 8000)]
    out = np.zeros_like(t)
    pos = (t / dur) ** 1.6 * (len(bands) - 1)
    for i, b in enumerate(bands):
        out += b * np.clip(1 - abs(pos - i), 0, 1)
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / dur) ** 2) / SR) * 0.15
    return (out + tone) * (t / dur) ** 2


def reverse_cymbal(dur):
    c = crash(dur)
    return c[::-1] * np.linspace(0, 1, len(c)) ** 2


def whoosh(dur=0.55):
    t = t_arr(dur)
    nz = rng.standard_normal(len(t))
    bands = [bp(nz, lo, lo * 1.7) for lo in (250, 450, 800, 1400, 2400, 4000)]
    pos = np.sin(np.pi * t / dur) * (len(bands) - 1)
    out = sum(b * np.clip(1 - abs(pos - i), 0, 1) for i, b in enumerate(bands))
    return out * np.sin(np.pi * t / dur) ** 2


def tap_click():
    t = t_arr(0.05)
    s = np.sin(2 * np.pi * 1900 * t) * env_exp(len(t), 0.006) * 0.6
    s += hp(rng.standard_normal(len(t)), 3000) * env_exp(len(t), 0.002) * 0.6
    s += np.sin(2 * np.pi * 180 * t) * env_exp(len(t), 0.012) * 0.5
    return s


def key_click():
    t = t_arr(0.035)
    f = 2400 + rng.random() * 900
    return (np.sin(2 * np.pi * f * t) * 0.35 + hp(rng.standard_normal(len(t)), 4000) * 0.5) * env_exp(len(t), 0.004)


def send_swoosh():
    t = t_arr(0.18)
    f = 380 + 900 * (t / 0.18) ** 1.3
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18)
    return s * 0.6 + whoosh(0.18) * 0.25


def receive_ding():
    out = np.zeros(int(0.6 * SR))
    for k, (f, at) in enumerate(((1046.5, 0.0), (1568.0, 0.075))):
        t = t_arr(0.5)
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * env_exp(len(t), 0.04))
        s *= env_exp(len(t), 0.16)
        i = int(at * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return out * 0.5


def confirm_chime():
    out = np.zeros(int(1.2 * SR))
    for k, n in enumerate((74, 78, 81, 86)):
        t = t_arr(0.9)
        f = note_hz(n)
        s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3.01 * t) * env_exp(len(t), 0.05)
        s *= env_exp(len(t), 0.3)
        i = int(k * 0.06 * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return out * 0.35


def bell_chord(notes, dur=4.0):
    t = t_arr(dur)
    out = np.zeros_like(t)
    for n in notes:
        f = note_hz(n)
        mod = np.sin(2 * np.pi * f * 1.4 * t) * 2.2 * env_exp(len(t), 0.5)
        out += np.sin(2 * np.pi * f * t + mod) * env_exp(len(t), 1.6)
    return out / len(notes)


# ---------------------------------------------------------------- arrangement
sc = TL["scenes"]

if "music" not in TL:
    # --- 1. OPENING: deep atmosphere ---------------------------------------------
    add(ocean(fr(sc["whatsapp"]["from"]) + 1.5), 0, 0.30)
    add(ocean(fr(sc["reveal"]["from"] - sc["underway"]["from"]) + 0.6), fr(sc["underway"]["from"]), 0.22)
    add(drone(fr(sc["opening"]["to"]) + 0.4), 0, 0.42, verb=0.3)
    add(ship_horn(2.4), 1.55, 0.30, pan=-0.2, verb=0.9)
    for f in TL["hookWords"]:
        add(taiko(1.4, 88 if f != TL["hookWords"][2] else 70), fr(f), 0.55, verb=0.25)
    add(riser(fr(sc["opening"]["to"] - 96)), fr(96), 0.22, verb=0.2)

# chord progression: Dm - Bb - F - C   (root MIDI notes for pads)
PROG = [(50, 53, 57, 62), (46, 50, 53, 58), (45, 48, 53, 57), (43, 48, 52, 55)]
BASS = [38, 34, 41, 36]
ARP = [[62, 65, 69, 74], [58, 62, 65, 70], [57, 60, 65, 69], [55, 60, 64, 67]]

bar = 4 * BEAT


def groove(start_f, end_f, intensity=1.0, arp=True, hats=True, bright=1400):
    start, end = fr(start_f), fr(end_f)
    t = start
    bar_i = 0
    while t < end - 0.01:
        ch = bar_i % 4
        seg = min(bar, end - t)
        add(pad(PROG[ch], seg + 0.4, bright=bright, attack=0.2, release=0.4), t, 0.26 * intensity, verb=0.35)
        for b in range(4):
            bt = t + b * BEAT
            if bt >= end - 0.01:
                break
            add(kick(), bt, 0.62 * intensity)
            if hats:
                add(hat(), bt + BEAT / 2, 0.10 * intensity, pan=0.3)
                add(hat(), bt + BEAT * 0.75, 0.05 * intensity, pan=-0.3)
            for e in range(2):
                n = BASS[ch] + (12 if (b * 2 + e) % 4 == 3 else 0)
                add(bass(n, BEAT / 2 * 0.95), bt + e * BEAT / 2, 0.30 * intensity)
            if arp:
                for s in range(4):
                    at = bt + s * BEAT / 4
                    if at < end - 0.01:
                        add(pluck(ARP[ch][(b * 4 + s) % 4] + (12 if s == 3 else 0)), at,
                            0.09 * intensity, pan=0.5 if s % 2 else -0.5, verb=0.3)
        t += bar
        bar_i += 1


if "music" not in TL:
    # --- 2. WHATSAPP: driving tech groove -----------------------------------------
    groove(sc["intro"]["from"], sc["whatsapp"]["to"], 0.8, arp=True, hats=True, bright=1100)

    # --- 3. FREELANCER: lift, then build ------------------------------------------
    groove(sc["appRoute"]["from"], TL["match"]["impact"] - 6, 0.95, arp=True, hats=True, bright=1900)
    # accelerating snare roll into the match
    roll_start, roll_end = fr(TL["sfx"]["riser"][0][0]), fr(TL["match"]["impact"] - 4)
    t = roll_start
    step = BEAT / 2
    while t < roll_end:
        prog = (t - roll_start) / (roll_end - roll_start)
        add(snare_hit(), t, 0.10 + 0.25 * prog, pan=(rng.random() - 0.5) * 0.4, verb=0.2)
        step = max(BEAT / 8, step * 0.86)
        t += step

    # --- 4. MATCH: big anthem section ----------------------------------------------
    m0 = fr(TL["match"]["impact"])
    add(sub_boom(3.5), m0, 0.95, verb=0.3)
    add(crash(4.0), m0, 0.45, verb=0.5)
    groove(TL["match"]["impact"], sc["match"]["to"] - 8, 1.15, arp=True, hats=True, bright=2600)
    # heroic lead: original melody over Dm - Bb - F - C
    MEL = [(0, 74, 1.0), (1, 72, 0.5), (1.5, 74, 0.5), (2, 77, 1.5), (4, 74, 1.0), (5, 72, 1.0), (6, 70, 2.0),
           (8, 69, 1.0), (9, 72, 1.0), (10, 77, 2.0), (12, 76, 1.0), (13, 74, 0.5), (13.5, 72, 2.0)]
    for beat_off, n, ln in MEL:
        at = m0 + beat_off * BEAT
        if at < fr(sc["match"]["to"]) - 0.1:
            add(brass_lead(n, ln * BEAT * 0.98), at, 0.15, verb=0.5)
            add(brass_lead(n - 12, ln * BEAT * 0.98), at, 0.07, verb=0.5)

    # --- 5. UNDERWAY: swell into the reveal ----------------------------------------
    u0 = fr(sc["underway"]["from"])
    add(pad((38, 50, 57, 62, 65), fr(sc["reveal"]["from"] - sc["underway"]["from"]) + 0.6, bright=2200,
            attack=0.4, release=0.5), u0, 0.42, verb=0.6)
    add(drone(fr(sc["reveal"]["from"] - sc["underway"]["from"]) + 0.2, (26, 38), 300, 1600), u0, 0.35)
    for a, b in TL["sfx"]["riser"][1:]:
        add(riser(fr(b - a)), fr(a), 0.30, verb=0.3)
    add(reverse_cymbal(fr(sc["reveal"]["from"] - sc["underway"]["from"])), u0, 0.30)

    # --- 6. REVEAL: logo hit with a D-major resolution ------------------------------
    r0 = fr(TL["reveal"]["logoHit"])
    add(sub_boom(4.0, 80, 26), r0, 1.0, verb=0.4)
    add(crash(4.5), r0, 0.40, verb=0.6)
    add(bell_chord((62, 66, 69, 74, 78), 4.5), r0, 0.35, verb=0.9)
    add(pad((38, 50, 54, 57, 62, 66), fr(TL["durationInFrames"] - TL["reveal"]["logoHit"]) + 0.3,
            bright=2400, attack=0.05, release=1.2), r0, 0.40, verb=0.8)
    live = fr(TL["reveal"]["live"])
    add(taiko(1.6, 60), live, 0.75, verb=0.4)
    add(bell_chord((74, 78, 81, 86), 3.0), live, 0.22, verb=0.9)

else:
    # ---- 35-second cut ------------------------------------------------------------
    M = TL["music"]
    hook_end = sc["hook"]["to"]
    add(ocean(fr(hook_end) + 1.2), 0, 0.30)
    add(drone(fr(hook_end) + 0.4), 0, 0.42, verb=0.3)
    add(ship_horn(1.8), 0.35, 0.26, pan=-0.2, verb=0.9)
    for f in TL["hookWords"]:
        add(taiko(1.2, 88 if f != TL["hookWords"][2] else 70), fr(f), 0.55, verb=0.25)
    add(riser(fr(hook_end - 45)), fr(45), 0.22, verb=0.2)
    groove(M["grooveFrom"], M["lift"], 0.85, bright=1300)
    groove(M["lift"], M["buildFrom"], 1.0, bright=2000)
    groove(M["buildFrom"], M["impact"] - 4, 1.05, bright=2400)
    roll_start, roll_end = fr(M["buildFrom"]), fr(M["impact"] - 3)
    t = roll_start
    step = BEAT / 2
    while t < roll_end:
        prog = (t - roll_start) / (roll_end - roll_start)
        add(snare_hit(), t, 0.08 + 0.24 * prog, pan=(rng.random() - 0.5) * 0.4, verb=0.2)
        step = max(BEAT / 8, step * 0.86)
        t += step
    add(riser(fr(M["impact"] - M["buildFrom"])), fr(M["buildFrom"]), 0.26, verb=0.3)
    i0 = fr(M["impact"])
    tail = fr(TL["durationInFrames"] - M["impact"]) + 0.3
    add(sub_boom(4.0, 80, 26), i0, 1.0, verb=0.4)
    add(crash(4.5), i0, 0.40, verb=0.6)
    add(bell_chord((62, 66, 69, 74, 78), 4.5), i0, 0.32, verb=0.9)
    add(pad((38, 50, 54, 57, 62, 66), tail, bright=2400, attack=0.05, release=1.2), i0, 0.40, verb=0.8)
    add(ocean(tail), i0, 0.12)
    # light pulse under the CTA so the end keeps moving
    t = i0
    while t < i0 + tail - 1.2:
        add(kick(), t, 0.35)
        add(hat(), t + BEAT / 2, 0.06, pan=0.3)
        t += BEAT
    MEL = [(0, 74, 1.0), (1, 78, 1.0), (2, 81, 2.0), (4, 79, 1.0), (5, 78, 1.0), (6, 74, 2.5)]
    for beat_off, n, ln in MEL:
        add(brass_lead(n, ln * BEAT * 0.98), i0 + beat_off * BEAT, 0.12, verb=0.6)
        add(brass_lead(n - 12, ln * BEAT * 0.98), i0 + beat_off * BEAT, 0.06, verb=0.6)
    c = fr(M["ctaHit"])
    add(taiko(1.6, 60), c, 0.7, verb=0.4)
    add(bell_chord((74, 78, 81, 86), 3.0), c, 0.2, verb=0.9)

# --- generic SFX from the timeline ------------------------------------------------
for f in TL["sfx"]["impact"]:
    if f == 0:  # (other impacts are part of the arrangements)
        add(sub_boom(3.2, 75, 27), 0.0, 1.0, verb=0.5)
        add(crash(3.0), 0.0, 0.25, verb=0.6)
for f in TL["sfx"]["whoosh"]:
    add(whoosh(0.6), fr(f) - 0.3, 0.28, pan=0.2, verb=0.2)
for tap in TL["taps"]:
    add(tap_click(), fr(tap["frame"]), 0.35)
for f in TL["sfx"]["send"]:
    add(send_swoosh(), fr(f) + 0.02, 0.30)
for f in TL["sfx"]["receive"]:
    add(receive_ding(), fr(f), 0.30, verb=0.15)
for f in TL["sfx"]["confirm"]:
    add(confirm_chime(), fr(f), 0.42, verb=0.3)
# soft two-note tick when a new step caption appears
def step_tick():
    out = np.zeros(int(0.5 * SR))
    for k, f in enumerate((1318.5, 1975.5)):
        t = t_arr(0.4)
        s_ = np.sin(2 * np.pi * f * t) * env_exp(len(t), 0.09)
        i = int(k * 0.045 * SR)
        out[i:i + len(s_)] += s_[: len(out) - i]
    return out * 0.4
for f in TL["sfx"].get("step", []):
    add(step_tick(), fr(f), 0.28, verb=0.3)
# keyboard clicks while typing
w = TL["whatsapp"]
msg = TL["copy"]["typedMessage"]
for i in range(len(msg)):
    f = w["typeStart"] + (w["typeEnd"] - w["typeStart"]) * i / len(msg)
    add(key_click(), fr(f) + rng.random() * 0.01, 0.16, pan=(rng.random() - 0.5) * 0.3)

# ---------------------------------------------------------------- mix & master
ir_len = int(2.8 * SR)
tt = np.arange(ir_len) / SR
irL = rng.standard_normal(ir_len) * np.exp(-tt / 0.75)
irR = rng.standard_normal(ir_len) * np.exp(-tt / 0.75)
irL, irR = lp(irL, 5000), lp(irR, 5000)
irL /= np.sqrt((irL ** 2).sum())
irR /= np.sqrt((irR ** 2).sum())
wetL = fftconvolve(VL, irL)[:N]
wetR = fftconvolve(VR, irR)[:N]
mixL = L + wetL * 0.9
mixR = R + wetR * 0.9

# gentle low cut + bus glue
mixL = hp(mixL, 22)
mixR = hp(mixR, 22)
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
mixL, mixR = mixL / peak * 1.6, mixR / peak * 1.6
mixL, mixR = np.tanh(mixL), np.tanh(mixR)  # soft-clip master
# fade tail
fade_n = int(0.6 * SR)
end_i = int(TL["durationInFrames"] / FPS * SR)
for ch in (mixL, mixR):
    ch[end_i - fade_n:end_i] *= np.linspace(1, 0, fade_n) ** 1.5
    ch[end_i:] = 0
mixL, mixR = mixL[:end_i], mixR[:end_i]
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
out = np.stack([mixL, mixR], 1) / peak * 0.89
(ROOT / "public" / "audio").mkdir(parents=True, exist_ok=True)
wavfile.write(ROOT / "public" / OUT_REL, SR, (out * 32767).astype(np.int16))
print("wrote public/" + OUT_REL, f"{end_i / SR:.2f}s")
