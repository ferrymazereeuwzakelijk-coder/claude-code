"""Clean, full-width app screens for the App Store screenshots and preview.

Every output in public/store/ is 1320px wide and starts at the app's own header:
the iOS status bar and Safari's toolbar are cropped off, the admin/test banners
are cut out, phone numbers and the screen-recording dot are removed.

Run:  python3 scripts/prepare_store_assets.py
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from prepare_app_recording import banner_rows  # noqa: E402

SRC = ROOT / "assets" / "source"
SCREENS = ROOT / "public" / "screens"
OUT = ROOT / "public" / "store"
OUT.mkdir(parents=True, exist_ok=True)
W = 1320


def frame(video: Path, t: float) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(video), "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    w, h = map(int, subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                                    "stream=width,height", "-of", "csv=p=0", str(video)],
                                   capture_output=True, text=True, check=True).stdout.strip().split(","))
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).copy()


def save(a: np.ndarray, name: str, top: int):
    im = Image.fromarray(a[top:])
    if im.width != W:
        im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    im.save(OUT / name, optimize=True)
    print("wrote", name, im.size)


# --- company app recording (512 px wide): cut the banners out, hide the phone number
app = SRC / "rec-company-app.mp4"
for name, t in [("company-dashboard.png", 0.3), ("company-form.png", 6.45), ("company-online.png", 40.0)]:
    f = frame(app, t)
    f[690:716, 229:324] = 252 if ((f[690:716, 229:324, 1].astype(int) - f[690:716, 229:324, 0]) > 40).sum() > 30 else f[690:716, 229:324]
    f = f[~banner_rows(f)]
    save(f, name, top=137)  # rows above 137: status bar + Safari toolbar

# --- company reactions recording (full resolution)
rec = SRC / "rec-company-reactions-v2.mp4"
f = frame(rec, 5.0)
save(f, "company-reactions.png", top=180)
f = frame(rec, 9.5)
f[1386:1436, 86:386] = 254   # phone number in the contact card
f[2756:2806, 86:386] = [242, 241, 243]
save(f, "company-contact.png", top=180)

# --- existing clean screenshots (already full resolution, recording dot removed)
for src, name, top in [("wa-online.png", "whatsapp-online.png", 180), ("wa-form-complete.png", "whatsapp-form.png", 300),
                       ("app-assignments.png", "freelancer-assignments.png", 180),
                       ("app-reacted.png", "freelancer-reacted.png", 180)]:
    save(np.array(Image.open(SCREENS / src).convert("RGB")), name, top=top)
