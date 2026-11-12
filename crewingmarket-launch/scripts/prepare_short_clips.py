"""Cut the two phone recordings down to only the essential moments for the 35s edit.

app-short.mp4      : tap 'Plaats opdracht' -> 'Matroos' chosen -> tap 'Opdracht plaatsen' -> online
contact-short.mp4  : WhatsApp alert + tap link -> reactions page -> tap 'Contact opnemen' -> Bel/WhatsApp
Run after prepare_app_recording.py and prepare_footage.py.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
F = ROOT / "public" / "footage"


def cut(src, segs, dst):
    parts = ["[0:v]split=%d%s" % (len(segs), "".join(f"[s{i}]" for i in range(len(segs))))]
    for i, (a, b) in enumerate(segs):
        parts.append(f"[s{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,fps=30[v{i}]")
    parts.append("".join(f"[v{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=1:a=0[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(F / src), "-filter_complex", ";".join(parts),
                    "-map", "[out]", "-c:v", "libx264", "-crf", "18", "-g", "10", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", str(F / dst)], check=True)
    t = 0.0
    for a, b in segs:
        print(f"  {dst}: src {a}-{b} -> at {t:.2f}s")
        t += b - a
    print(f"{dst}: {t:.2f}s")


# times are in the already-edited clips (app-route.mp4 / rec-reactions.mp4)
cut("app-route.mp4", [(0.2, 1.25), (3.3, 3.95), (7.2, 7.62), (8.13, 10.4)], "app-short.mp4")
cut("rec-reactions.mp4", [(0.5, 2.1), (2.6, 3.9), (6.6, 7.1), (7.15, 9.2)], "contact-short.mp4")
