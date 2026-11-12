# CrewingMarket — launch commercial

A 70-second vertical (1080×1920, 30 fps, H.264 + AAC) explainer/launch spot made with Remotion, React and TypeScript.

**Rendered video:** `out/crewingmarket-launch.mp4`

## 35-second launch cut (recommended for social)
**File:** `out/crewingmarket-launch-35s.mp4` (composition `CrewingMarketLaunch35`, source in `src/short/`, timing in `src/short/timeline.json`). Every cut lands on a beat (120 BPM).

| Time | Section | On screen |
|---|---|---|
| 0–3 s | Hook | Throttle hand → deckhand at work → tanker. "MORGEN EEN MATROOS NODIG?" |
| 3–6.5 s | Solution | Logo + "Vind maritieme professionals" · Matrozen · Schippers · Stuurlieden |
| 6.5–11.5 s | Way 1 | WhatsApp: message → completed form → Verstuur → "Je opdracht staat online!" |
| 11.5–16 s | Way 2 | Platform (company's own recording): Plaats opdracht → Matroos → Opdracht plaatsen → online + reactions link |
| 16–17.5 s | Crew | Real footage: "Beschikbare zzp'ers zien je opdracht" |
| 17.5–23 s | Freelancer | Tap "Ik heb interesse" → "Reactie verstuurd!" |
| 23–28.5 s | Result | WhatsApp alert → reactions page → Contact opnemen → Bel / WhatsApp |
| 28.5–35 s | CTA | Logo, "Personeel nodig? Of beschikbaar voor werk?", crewingmarket.com, live vanaf 20 november 2026 |

```bash
python3 scripts/prepare_short_clips.py                      # essential moments of the two recordings
python3 scripts/make_soundtrack.py src/short/timeline.json  # -> public/audio/soundtrack-short.wav
npx remotion render src/index.ts CrewingMarketLaunch35 out/crewingmarket-launch-35s.mp4
```

The long explainer below (70 s, composition `CrewingMarketLaunch`) is kept for the website or a demo.

## Structure: understandable at a glance
Every step has a large caption at the top: route, step number, title, subtitle and progress. Each part has its own colour and its own counter: **Manier 1 · WhatsApp** (green, 1–4), **Manier 2 · App** (blue, 1–3), **Daarna** (orange for the freelancer, green for the company, 1–5). Copy and timing are in `src/timeline.json` → `steps`.

| Time | Scene | On screen |
|---|---|---|
| 0:00–0:04.5 | Hook | Real footage: skipper's hand on the throttle, tug, a deckhand (back to camera) on "MATROOS", tanker. "MORGEN EEN MATROOS NODIG?" |
| 0:04.5–0:07.5 | Zo werkt het | "Personeel aanvragen kan op 2 manieren": ① Via WhatsApp ② Via de app |
| 0:07.5–0:24 | Way 1: WhatsApp | Stuur een appje → Kies 'Bemanning' → Vul het formulier in → Verstuur |
| 0:24–0:39 | Way 2: app | **The company's own app recording**: Tik op 'Plaats opdracht' → Vul de opdracht in (fast-forward) → "Je opdracht staat online" + short link to the reactions |
| 0:39–0:40.5 | The deckhand | "Ondertussen bij de matroos…" |
| 0:40.5–0:49 | Freelancer | Zzp'ers zien je opdracht → Ze reageren met één tik |
| 0:49–1:00 | Company | **The company's own recording**: Je krijgt direct een appje (WhatsApp alert) → Bekijk wie er reageert (reactions page) → Neem direct contact op (Bel / WhatsApp Ferry) |
| 1:00–1:04 | Match | "DE JUISTE MENSEN. OP HET JUISTE MOMENT." |
| 1:04–1:10 | Reveal | Vessel underway, logo, **20 NOVEMBER 2026**, WE GAAN LIVE, www.crewingmarket.com |

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
python3 scripts/prepare_app_recording.py  # clean + edit the app recording (removes admin/test banners, phone number)
python3 scripts/prepare_footage.py        # real footage clips + the company's reactions recording (hides phone number), CREDITS.md
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
4. **Screenshots of a company posting a job in the app.** Way 2 is now a text card because these screens were missing.
