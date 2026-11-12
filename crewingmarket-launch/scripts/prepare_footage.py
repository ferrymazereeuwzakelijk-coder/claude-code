"""Cut the selected segments of the real (Wikimedia Commons) footage into short,
seek-friendly H.264 clips in public/footage/, and write CREDITS.md.

Source files are downloaded into assets/footage-source/ (not committed, they are
large); see CREDITS.md for each file's page, author and license.

Run:  python3 scripts/prepare_footage.py
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "footage-source"
OUT = ROOT / "public" / "footage"
OUT.mkdir(parents=True, exist_ok=True)

# name, source file, in (s), length (s), commons title, author, license
CLIPS = [
    ("deck-crew", "deck-crew.webm", 0.0, 12.0,
     "Global Southern Ocean Mooring Recovery close up.webm", "Ocean Observatories Initiative", "Public domain"),
    ("helm-throttle", "navy-tug-ops.webm", 6.6, 3.0,
     "260323-YKS- PACUP- TUG BOAT OPS-HULEN (1001273).webm", "U.S. Navy, AFN Yokosuka (Seaman Apprentice Paul Hulen)", "Public domain"),
    ("tug-vanino", "Vanino_2021_02_23_truzhenik_tug_boat_webm.webm", 18.0, 14.0,
     "Vanino-2021-02-23-truzhenik-tug-boat.webm", "I13Robin", "CC BY 4.0"),
    ("tanker-storm", "Storm_on_Rhine_bridge__Emmerich_112405_webm.webm", 27.0, 14.0,
     "Storm on Rhine bridge, Emmerich 112405.webm", "Quahadi Añtó", "CC BY 4.0"),
    ("tug-towing", "Arakawa_tugboat___2019_3_25_webm.webm", 0.0, 8.0,
     "Arakawa tugboat - 2019 3 25.webm", "Nesnad", "CC BY 4.0"),
    ("tugs-harbour", "Ships_Harry__Svitzer_Embla_and_Carl_Wilhemson_in_L.webm", 0.0, 4.0,
     "Ships Harry, Svitzer Embla and Carl Wilhemson in Lysekil.webm", "W.carter", "CC BY-SA 4.0"),
    ("rotterdam-night", "Rotterdam_bij_nacht_webm.webm", 17.0, 10.0,
     "Rotterdam bij nacht.webm", "Denk-wijzer, dé Filosofische Praktijk", "CC BY 3.0"),
    ("rhine-barges", "Storm_on_Rhine_bridge__Emmerich_111707_webm.webm", 0.0, 8.0,
     "Storm on Rhine bridge, Emmerich 111707.webm", "Quahadi Añtó", "CC BY 4.0"),
]

credits = [
    "# Footage credits\n",
    "All footage is real (not AI-generated) and comes from Wikimedia Commons under the licenses below.",
    "CC BY / CC BY-SA require attribution: put these lines in the post caption or on the website.\n",
    "| Clip | Source (Wikimedia Commons) | Author | License |",
    "|---|---|---|---|",
]
for name, src, start, length, title, author, lic in CLIPS:
    f = SRC / src
    if not f.exists():
        print("missing", src)
        continue
    dst = OUT / f"{name}.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(length), "-i", str(f), "-an",
         "-vf", "scale=-2:1080,fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "22",
         "-g", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dst)],
        check=True,
    )
    print("wrote", dst.name)
    url = "https://commons.wikimedia.org/wiki/File:" + title.replace(" ", "_")
    credits.append(f"| `{name}.mp4` | [{title}]({url}) | {author} | {lic} |")

# --- the company's own screen recording: tapping the link and seeing the reaction ---
rec = ROOT / "assets" / "source" / "rec-company-reactions.mp4"
if rec.exists():
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "7.6", "-t", "5.0", "-i", str(rec), "-an",
                    "-vf", "fps=30", "-c:v", "libx264", "-crf", "18", "-g", "10", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", str(OUT / "rec-reactions.mp4")], check=True)
    still = ROOT / "public" / "screens" / "company-reactions.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "12", "-i", str(rec), "-frames:v", "1",
                    "-vf", "scale=1320:2868:flags=lanczos", str(still)], check=True)
    from PIL import Image, ImageDraw
    im = Image.open(still).convert("RGB")
    d = ImageDraw.Draw(im)
    d.ellipse((443 - 26, 95 - 26, 443 + 26, 95 + 26), fill=(0, 0, 0))  # recording dot
    d.rectangle((30, 810, 690, 935), fill=(243, 244, 247))  # stale "0 interesse" counter
    im.save(still)
    print("wrote rec-reactions.mp4 + company-reactions.png")

credits.append("\nThe U.S. Navy clip is public domain; it is cropped so no insignia show and implies no endorsement.")
credits.append("\nThe opening, the vessel shot and the backgrounds use only the clips above; all phone content "
               "is CrewingMarket's own screenshots. The soundtrack is synthesized (scripts/make_soundtrack.py).")
(ROOT / "CREDITS.md").write_text("\n".join(credits) + "\n")
print("wrote CREDITS.md")
