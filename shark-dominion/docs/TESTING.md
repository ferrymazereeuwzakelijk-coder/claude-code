# Studio test plan: Milestone 1

None of this has been run in Roblox Studio yet: the code was written in an
environment without Studio. Work through the sections in order, because each one
builds on the last. If anything errors, the Output window shows the module and
line.

## 0. Setup

1. Run `rojo serve` (or `rojo build -o SharkDominion.rbxlx`), open a Baseplate place,
   **delete the Baseplate part**, and connect the Rojo plugin.
2. In **Explorer**, confirm these exist: `ReplicatedStorage.Shared`,
   `ServerScriptService.Server` (a Script with `World`, `Services` and `Dev`),
   and `StarterPlayer.StarterPlayerScripts.Client` (a LocalScript with
   `Controllers` and `UI`).
3. Confirm the properties Rojo set: `Players.CharacterAutoLoads = false`,
   `StarterPlayer.EnableMouseLockOption = false`, `Lighting.Technology = Future`.
   If the Rojo version in use didn't apply `Technology`, set it by hand.

## 1. Boot and self-test

Press **Play** (solo). Expected Output, in order:

- `[ReefBuilder] Terrain ready: 169 chunks, … voxels, … rock blobs, liquid channels in N s`
  - If it says `legacy voxels`, `WriteVoxelChannels` failed and the fallback was
    used. The game still works, but there may be small air pockets at the seabed.
    Report the warning text.
- `[PropFactory] N props (M parts), K anemones, P reef patches`. Expect roughly
  150 to 200 props, 1,500 to 2,500 parts, and 10 or more anemones.
- `[FishService] ~190 fish in ~17 schools: Sardine=…, Clownfish=…, BlueTang=…, Grouper=10, Tuna=…`
- `[SharkDominion] Server ready`
- `[SelfTest] PASS (N checks)`. Any `FAIL` line names the check.

**Pass:** no red errors, and the loading overlay disappears when the shark spawns.

## 2. Shark controller and camera (Priority 1)

| # | Do | Expect |
|---|---|---|
| 2.1 | Spawn, don't touch anything | Shark hovers with a gentle bob, slow tail sweeps, fins flutter, jaw "breathes". Camera sits behind and slightly above. |
| 2.2 | Move the mouse | Camera orbits freely around the shark (cursor hidden). Hold **Alt** and the cursor appears and the camera stops. |
| 2.3 | Mouse wheel | Camera zooms between near and far smoothly. |
| 2.4 | Hold **W** | Shark accelerates (no instant snap) toward where the camera faces, and the tail beats faster as speed rises. |
| 2.5 | Release **W** | Shark glides and slows gradually (momentum), with no sudden stop. |
| 2.6 | Hold **W** and sweep the mouse left and right | Shark turns in smooth arcs, **banks** into the turn, and its body curves (head leads, tail trails). |
| 2.7 | Hold **W**, look up or down | Shark pitches smoothly and climbs or dives. Pitch is capped at about 70°. |
| 2.8 | **Space** / **Ctrl** while idle | Shark rises or sinks in place with its nose tilted. While swimming, they add climb or dive. |
| 2.9 | Hold **S** | Shark turns around in an arc (no moonwalking). |
| 2.10 | Hold **Shift** + **W** | Speed jumps, the FOV widens, gill bubbles appear, and the Boost bar drains. At 0 the boost stops. The bar refills after about 1 s. You need 12% to restart. |
| 2.11 | Swim into a rock pillar or the seabed | Shark slides along it without sticking or jittering, and loses speed on impact. |
| 2.12 | Swim straight up | Shark levels out just under the surface and the camera never goes above the water. |
| 2.13 | Swim toward the map edge (±360) | A soft boundary pushes the shark back. |
| 2.14 | Back the camera into a rock | Camera pulls in in front of the rock instead of clipping through. |
| 2.15 | **E** | Frenzy Dash: speed burst with a camera kick. The ability slot shows an 8 s cooldown. |

**Mobile:** use **Test → Device Emulator** with a phone, then Play.
- The left half spawns a joystick where you touch, and the shark swims.
- Dragging on the right half orbits the camera, and pinch zooms.
- The BITE, BOOST (hold), DASH, ▲ and ▼ (hold) buttons work. Sliding a finger off
  a held button releases it.
- The HUD scales down and the PC hints and ability slot are hidden.

**Gamepad:** left stick swims, right stick orbits, R2 bites, L2 boosts, A/B go
up and down, X dashes.

## 3. Environment (Priority 2)

Swim the whole area and check:

- The **plateau** (spawn) has dense mixed coral gardens: branching staghorn,
  brain, table coral, sea fans, tube sponges and anemones.
- To the **NW** there's a kelp forest (tall swaying stalks with leaves). To the
  **SW** there's a seagrass meadow on darker sand.
- **Rock pillars** and **two natural arches** stand in the lagoon. You can swim
  through the arches.
- To the **east** is a drop-off: a ledge rim with fans and sponges, overhangs, and
  a deep blue trench where the tuna patrol.
- Light shafts slant down from the surface. Marine snow drifts past the camera.
  The image gets darker and bluer as you dive.
- Plants sway gently in a coherent current.

## 4. Animation (Priority 3)

- Compare idle with cruise and boost: tail frequency clearly scales with speed.
- Turning curves the body and banking rolls it.
- Climbing and diving change the pectoral fin angle.
- **Bite** (LMB): jaw snaps open, head lunges and the shark surges forward a bit.
  This plays instantly for you and after a short delay for other players.
- **Damage:** let hunger reach 0 (or lower `Vitals.HungerDrainPerSecond` for
  testing). Every few seconds the shark flashes red and shakes, and the screen
  edges pulse red.
- **Death:** the shark rolls belly-up and sinks, the overlay shows "YOU STARVED"
  with a countdown, and you respawn with reduced mass.

## 5. Fish AI (Priority 4)

| Fish | Where | Look for |
|---|---|---|
| Sardine | Mid-water above the plateau and lagoon | Tight schools of 10 to 14 that move together and scatter as a group |
| Clownfish | At anemones | Hover near "home". When you approach, they dart **into** the anemone. |
| Blue Tang | Over coral patches | Loose schools of 5 to 7 |
| Grouper | Near pillars and arches, close to the floor | Slow, solitary, pausing at rest stops |
| Yellowfin Tuna | Drop-off / trench | Fast pairs or trios on a wide loop |

- Approach any fish: it flees. Boosting scares fish from farther away.
- Fish never go through rocks, the floor or the surface.
- Eat a fish: it reappears after its respawn time, but never right in front of you.
- **Perf:** check the **MicroProfiler** (Ctrl+F6) and the **Network** stats
  (Shift+F3). Fish receive data stays small: about 8 bytes per nearby fish at 10 Hz.

## 6. Feeding and growth (Priority 5)

- A target ring appears on the fish your bite would hit. Green means edible and
  in range, white means edible but too far, red means too big.
- Bite a sardine. You should see a red cloud, bits and bubbles, and a popup
  `+1 MASS +2 XP +1 COINS`. The coin counter pulses, hunger refills, and mass and
  XP rise.
- Bite a grouper at size ×1.00. You get the toast "Grouper is too big — grow to size ×1.30".
- Keep eating. The shark visibly grows (SIZE ×N.NN rises), the camera pulls back
  with size, and you see a "LEVEL N" banner.
- At level 5 you see an "EVOLVED! You are now a Blacktip Shark" banner and the
  dorsal tip and lower tail lobe turn black.
- **Exploit check:** in the client command bar, spam
  `game.ReplicatedStorage.Remotes.RequestBite:FireServer(1)` while far from fish.
  Nothing should be eaten, and the remote is rate-limited after a burst.

## 7. Multiplayer (Priority 6)

Use **Test → Clients and Servers** with 3 players:

- Every client sees every shark animate: tail, turns, bites and boost bubbles.
- Two sharks pass through each other with no body-blocking.
- One player eats a fish and it disappears for **everyone**, with the particle
  burst visible to nearby players.
- **Anti-cheat:** in one client's command bar, run
  `game.Players.LocalPlayer.Character:PivotTo(CFrame.new(0,-30,300))`. The server
  output warns `Correcting …` and the shark snaps back.
- **PvP:** set `GameConfig.PVP_ENABLED = true`, restart, and bite another shark
  (with no fish in range). The victim flashes red, takes damage and can die.

## 8. HUD (Priority 7)

Check the HUD at 1920×1080, 1366×768, and on a phone in the device emulator:

- Top-left shows species, level badge and XP bar, then Health, Hunger and Boost.
- Top-centre shows mass in kg and size.
- Top-right shows coins and the PC control hints.
- Bottom-centre shows the ability slot with its cooldown on PC and gamepad.
- Nothing overlaps the Roblox top bar or the mobile buttons.

## Tuning knobs

| Feel | Config |
|---|---|
| Speed and acceleration | `SharkConfig.Movement.CruiseSpeed / BoostSpeed / Acceleration / Drag` |
| Turning and banking | `TurnRate`, `TurnResponsiveness`, `BankPerTurnRate`, `BankMax` |
| How much W follows camera pitch | `CameraPitchInfluence` (0 to 1) |
| Camera | `CameraController.DEFAULT_DISTANCE / DEFAULT_PITCH / MOUSE_SENSITIVITY` |
| Growth speed | `SharkConfig.Growth.ScaleCurve`, fish `Mass` and `XP` |
| Fish counts and behavior | `FishConfig.Types[*]` |
