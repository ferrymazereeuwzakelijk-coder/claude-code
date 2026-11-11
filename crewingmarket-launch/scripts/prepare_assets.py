"""Prepare the real CrewingMarket screenshots for the commercial.

Everything here is derived from the supplied screen captures in assets/source.
Nothing is redrawn from scratch: we only
  * remove the red screen-recording indicator from the Dynamic Island,
  * build "before" states of a chat by patching in wallpaper from the same
    screenshots (so a bubble can animate in on top of it),
  * extract the CrewingMarket logo mark from the app header.

Run:  python3 scripts/prepare_assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
OUT = ROOT / "public" / "screens"
BRAND = ROOT / "public" / "brand"
OUT.mkdir(parents=True, exist_ok=True)
BRAND.mkdir(parents=True, exist_ok=True)

# Dynamic Island bounding box (full-res 1320x2868 screenshots)
ISLAND = (380, 30, 920, 160)


def load(name: str) -> np.ndarray:
    return np.array(Image.open(SRC / name).convert("RGB")).astype(np.int16)


def clean_island(a: np.ndarray) -> np.ndarray:
    """Paint the red recording dot / red island outline black."""
    x0, y0, x1, y1 = ISLAND
    reg = a[y0:y1, x0:x1]
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    red = (r > g + 25) & (r > b + 25)
    # grow the mask a little so anti-aliased edges disappear too
    m = Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    red = np.array(m) > 0
    # only inside the dark pill (avoid the status bar on light screens)
    reg[red] = 0
    a[y0:y1, x0:x1] = reg
    return a


def patch(dst: np.ndarray, src: np.ndarray, box, src_y: int, feather: int = 10):
    """Copy wallpaper rows from src (starting at src_y) into dst box with a soft edge."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    piece = src[src_y:src_y + h, x0:x1].astype(np.float32)
    mask = np.ones((h, w), np.float32)
    for i in range(feather):
        f = (i + 1) / (feather + 1)
        mask[i, :] = np.minimum(mask[i, :], f)
        mask[h - 1 - i, :] = np.minimum(mask[h - 1 - i, :], f)
        mask[:, i] = np.minimum(mask[:, i], f)
        mask[:, w - 1 - i] = np.minimum(mask[:, w - 1 - i], f)
    region = dst[y0:y1, x0:x1].astype(np.float32)
    dst[y0:y1, x0:x1] = (piece * mask[..., None] + region * (1 - mask[..., None])).astype(np.int16)


def save(a: np.ndarray, name: str):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(OUT / name, optimize=True)
    print("wrote", name)


# --- straight copies (island cleaned) ---------------------------------------
for src, dst in [
    ("wa-02-welcome-menu.png", "wa-welcome.png"),
    ("wa-03-bemanning-tapped.png", "wa-bemanning.png"),
    ("wa-05-form-empty.png", "wa-form-empty.png"),
    ("wa-06-form-datepicker.png", "wa-form-picker.png"),
    ("wa-07-form-complete.png", "wa-form-complete.png"),
    ("wa-08-form-sent.png", "wa-form-sent.png"),
    ("wa-09-assignment-online.png", "wa-online.png"),
    ("app-01-home.png", "app-home.png"),
    ("app-02-assignments.png", "app-assignments.png"),
    ("app-03-reacted.png", "app-reacted.png"),
]:
    save(clean_island(load(src)), dst)

# --- empty chat: remove the first sent bubble so typing can happen live -----
hoi = clean_island(load("wa-01-hoi-sent.png"))
src_wall = hoi.copy()
patch(hoi, src_wall, (900, 728, 1300, 862), src_y=1010)
save(hoi, "wa-empty.png")

# --- form invitation before the form was sent -------------------------------
# wa-form-sent shows the bot's "Vul dit formulier in" message and, below it,
# the user's "Opdracht plaatsen - Antwoord verzonden" reply. Remove the reply
# and restore the bot's button to its active (green) state, as seen in the
# recording frame wa-04.
inv = clean_island(load("wa-08-form-sent.png"))
wall = clean_island(load("wa-01-hoi-sent.png"))
patch(inv, wall, (420, 2232, 1300, 2582), src_y=930, feather=14)
x0, y0, x1, y1 = 260, 2100, 900, 2180
reg = inv[y0:y1, x0:x1].astype(np.float32)
bg = np.array([31, 33, 33], np.float32)
green = np.array([33, 192, 99], np.float32)
lum = reg.mean(axis=2, keepdims=True)
t = np.clip((lum - 33) / (140 - 33), 0, 1)
inv[y0:y1, x0:x1] = (bg * (1 - t) + green * t).astype(np.int16)
save(inv, "wa-invite.png")

# --- logo mark from the app header ------------------------------------------
home = np.array(Image.open(SRC / "app-01-home.png").convert("RGB")).astype(np.float32)
crop = home[228:312, 196:280]
bgc = np.array([253, 253, 253], np.float32)
dark = np.array([12, 24, 41], np.float32)
# alpha = how far each pixel moved from the white background toward navy
alpha = np.clip(((bgc - crop).mean(axis=2)) / ((bgc - dark).mean()), 0, 1)
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).resize((84 * 6, 84 * 6), Image.LANCZOS)
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(1.2))
# re-sharpen edges after upscaling
a = np.array(alpha_img).astype(np.float32) / 255
a = np.clip((a - 0.5) * 1.8 + 0.5, 0, 1)
for name, col in [("logo-mark-white.png", (255, 255, 255)), ("logo-mark-navy.png", (12, 24, 41))]:
    rgba = np.zeros(a.shape + (4,), np.uint8)
    rgba[..., :3] = col
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba).save(BRAND / name)
    print("wrote", name)
