# CrewingMarket — launch commercial

A 50-second vertical (1080×1920, 30 fps, H.264 + AAC) explainer/launch spot made with Remotion, React and TypeScript.

**Rendered video:** `out/crewingmarket-launch.mp4`

## Structure: understandable at a glance
Every step has a large caption at the top (route, step number, title, subtitle, progress 1/7). Copy and timing are in `src/timeline.json` → `steps`.

| Time | Scene | On screen |
|---|---|---|
| 0:00–0:04.5 | Hook | Real footage: tug, tanker. "MORGEN EEN MATROOS NODIG?" |
| 0:04.5–0:07.5 | Zo werkt het | "Personeel aanvragen kan op 2 manieren": ① Via WhatsApp ② Via de app |
| 0:07.5–0:24 | Way 1: WhatsApp | ① Stuur een appje → ② Kies 'Bemanning' → ③ Vul het formulier in → ④ Verstuur: opdracht staat online |
| 0:24–0:26.5 | Way 2: app | "Liever via de app? Plaats je opdracht direct op crewingmarket.com" |
| 0:26.5–0:28 | The deckhand | Real footage: a deckhand, back to camera, hauling a line. "Ondertussen bij de matroos…" |
| 0:28–0:36.5 | Freelancer | ⑤ Zzp'ers zien je opdracht → ⑥ Ze reageren met één tik ("Reactie verstuurd!") |
| 0:36.5–0:40.5 | Company | ⑦ Jij ziet wie er reageert: **the company's own screen recording**, tapping the link and seeing the reaction from Ferry Professional |
| 0:40.5–0:44.5 | Match | Both phones. "DE JUISTE MENSEN. OP HET JUISTE MOMENT." |
| 0:44.5–0:50.5 | Reveal | Vessel underway, logo, 13 NOVEMBER 2026, WE GAAN LIVE |

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
3. **Bug on the reactions page:** it shows "0 interesse · 0 met een vraag" while a reaction is listed. The video hides that line (`src/rec-counter.json` tracks its position per frame). Fix it and re-record to remove the mask.
4. **Screenshots of a company posting a job in the app.** Way 2 is now a text card because these screens were missing.
