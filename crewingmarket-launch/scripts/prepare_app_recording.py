"""Clean and edit the company's screen recording of posting a job in the app.

Per frame:
  * hide the "Admin preview" bar (it becomes part of Safari's dark toolbar) and the
    yellow "TESTMODUS" banner (detected by colour per frame, so it also works while
    the page scrolls; blanked with the page background so the layout never jumps);
  * hide the linked WhatsApp phone number on the dashboard;
  * paint out the red screen-recording dot.
Then the useful parts are cut together with speed-ups into public/footage/app-route.mp4.

Run:  python3 scripts/prepare_app_recording.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source" / "rec-company-app.mp4"
CLEAN = ROOT / "assets" / "source" / "rec-company-app-clean.mp4"
OUT = ROOT / "public" / "footage" / "app-route.mp4"
W, H = 512, 1112

# banner colours (RGB) sampled from the recording
BANNERS = [np.array([250, 246, 227]), np.array([248, 237, 199]), np.array([246, 239, 196])]


def banner_rows(f: np.ndarray) -> np.ndarray:
    edge = f[:, [2, 4, W - 5, W - 3]].astype(int)  # (H, 4, 3)
    hit = np.zeros(H, bool)
    for c in BANNERS:
        hit |= (np.abs(edge - c).sum(2) < 14).all(1)
    hit[:120] = False  # never touch the status/address bar
    hit[760:] = False
    # grow by 2px to swallow anti-aliased borders
    grown = hit.copy()
    for d in (1, 2):
        grown[d:] |= hit[:-d]
        grown[:-d] |= hit[d:]
    return grown


def process(f: np.ndarray, t: float) -> np.ndarray:
    f = f.copy()
    # red recording dot inside the Dynamic Island
    f[24:52, 158:192] = 0
    # phone number next to "WhatsApp Gekoppeld" (dashboard only)
    row = f[690:716, 226:324]
    if ((row[..., 1].astype(int) - row[..., 0] > 40)).sum() > 30:
        f[690:716, 226:324] = 252
    rows = banner_rows(f)
    for y in np.nonzero(rows)[0]:
        color = np.array([17, 15, 16] if y < 260 else [244, 245, 248], np.uint8)
        line = f[y].astype(int)
        white = np.nonzero(line.min(1) >= 249)[0]
        if len(white) > 0.6 * W:
            # an open dropdown / toast covers this row: only paint the banner edges
            x0, x1 = white.min() - 2, white.max() + 3
            f[y, :max(0, x0)] = color
            f[y, x1:] = color
        else:
            f[y] = color
    return f


def clean():
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(SRC), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", "30", "-i", "-", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", str(CLEAN)],
                           stdin=subprocess.PIPE)
    n = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        f = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        enc.stdin.write(process(f, n / 30).tobytes())
        n += 1
    enc.stdin.close()
    enc.wait()
    print("cleaned", n, "frames")


# (source start s, source end s, speed)
SEGMENTS = [
    (0.0, 1.25, 1.0),    # dashboard -> tap "Plaats opdracht"
    (1.25, 6.6, 2.0),    # open the form, choose "Matroos"
    (6.6, 36.3, 9.0),    # dates, location, type of work, hours (fast-forward)
    (36.3, 37.2, 1.0),   # tap "Opdracht plaatsen"
    (38.2, 42.2, 1.0),   # "Je opdracht staat online" + short link to the reactions
]


def edit():
    parts = []
    for i, (a, b, sp) in enumerate(SEGMENTS):
        parts.append(f"[0:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)/{sp},fps=30[v{i}]")
    concat = "".join(f"[v{i}]" for i in range(len(SEGMENTS))) + f"concat=n={len(SEGMENTS)}:v=1:a=0[out]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(CLEAN), "-filter_complex", ";".join(parts) + ";" + concat,
                    "-map", "[out]", "-c:v", "libx264", "-crf", "16", "-g", "10", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", str(OUT)], check=True)
    # where each segment lands in the edited clip (seconds), for taps and captions
    t, marks = 0.0, []
    for a, b, sp in SEGMENTS:
        marks.append({"src": [a, b], "speed": sp, "at": round(t, 3)})
        t += (b - a) / sp
    print(json.dumps(marks), "total", round(t, 2), "s")


if __name__ == "__main__":
    clean()
    edit()
