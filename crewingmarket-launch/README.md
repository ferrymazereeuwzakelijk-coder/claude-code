# CrewingMarket — launch commercial

A 30-second vertical (1080×1920, 30 fps, H.264 + AAC) launch spot made with Remotion, React and TypeScript.

**Rendered video:** `out/crewingmarket-launch.mp4`

## Story (built only from the supplied recordings)

| Time | Scene | What is shown |
|---|---|---|
| 0:00–0:04.5 | Probleem | Tug at night, searchlight flash, "MORGEN EEN MATROOS NODIG?" |
| 0:04.5–0:14.5 | WhatsApp (company) | Message typed → MaritimeMarket menu → *Bemanning* → *Opdracht plaatsen* → "Bemanning aanvragen" form (Matroos, 1, 13–17 nov 2026, Delfzijl, Binnenvaart, Dagdienst) → *Verstuur* → "Je opdracht staat online!" |
| 0:14.5–0:20 | Zzp'er | crewingmarket.com home → *Naar opdrachten* → "Matroos in Delfzijl" → *Ik heb interesse* → "Reactie verstuurd! Het bedrijf ziet je reactie bij deze opdracht." |
| 0:20–0:24.5 | Match | Both phones connected: the company's "Alle reacties zie je hier" link plus the freelancer's confirmation. "DE JUISTE MENSEN. OP HET JUISTE MOMENT." |
| 0:24.5–0:26.5 | Underway | Vessel underway at dusk |
| 0:26.5–0:30 | Reveal | Logo, "13 NOVEMBER 2026", "WE GAAN LIVE", www.crewingmarket.com |

All phone content is the real screenshots (`assets/source/`). Only these things were added on top of them:
* The typed message "Ik zoek een matroos voor morgen." This text comes from the brief. The recording itself starts with "Hoi". It is drawn as a bubble matching WhatsApp's own color and size, and you can change it in `src/timeline.json` → `copy.typedMessage`.
* Tap ripples, highlights and the sliding animations for the form sheet and the toast.
* `scripts/prepare_assets.py` removes the red screen-recording dot. It also builds the "before" states (empty chat, the form invitation before it was sent) by patching wallpaper pixels from the same screenshots.

## Editing

* **Timing:** every scene cut, tap, keystroke and sound hit is in `src/timeline.json` (120 BPM, so 1 beat = 15 frames). After editing it, run `npm run audio` so the soundtrack follows.
* **Camera moves:** the `*_CAM` keyframe lists in `src/scenes/*.tsx`.
* **Copy:** `copy` in `src/timeline.json`.

```bash
npm install
npm run assets   # regenerate public/screens + logo mark from assets/source
npm run audio    # regenerate public/audio/soundtrack.wav (python3 + numpy + scipy)
npm run studio   # live preview with a scrubbable timeline
npm run render   # -> out/crewingmarket-launch.mp4
```

## Audio
`scripts/make_soundtrack.py` synthesizes every sound: drone, ocean, ship's horn, taiko hits, the D-minor score at 120 BPM, UI taps and keystrokes, whooshes, risers, and the D-major logo resolution. It uses no samples and no third-party music, so it is original and free to use. The mix is mastered to about −15 LUFS.

## Footage
The opening, the vessel shot and the backgrounds behind the phones use **real footage** from Wikimedia Commons. It is free to use under CC BY / CC BY-SA / public domain; see `CREDITS.md` for the attribution that must go in the caption. `scripts/prepare_footage.py` cuts the segments, and `src/footage.ts` sets each shot's in-point, speed and 9:16 crop. The drawn `SeaScene` is now only a fallback for when a slot is `null`.

Opening montage, cut on the words: a hand on the tug's throttle → tug bow-on (Vanino) → inland tanker under storm clouds (Rhine, Emmerich) → tug towing a barge → tug manoeuvring.

## Still worth improving
1. **Your own footage**, ideally of Dutch tugs and inland shipping, filmed in 4K. Free stock is good, but footage of your own customers and vessels is more convincing. Swap it in through `src/footage.ts`.
2. **A vector logo (SVG).**
3. **A screenshot of the company's reactions page** (`crewRequestPage?c=…`).
