# Shark Dominion: Milestone 1 (playable vertical slice)

A multiplayer 3D shark survival game for Roblox, built with Luau and Rojo.
You swim a shark through a stylized tropical reef with a free third-person camera,
hunt five kinds of fish, gain mass, level up, grow and evolve. Combat and
progression are server-authoritative.

> **Status:** Every system in this milestone is implemented as working source.
> It was written outside Roblox Studio and has **not yet been run in Studio**.
> Follow [docs/TESTING.md](docs/TESTING.md) for the exact test pass. A Studio-only
> self-test (`src/server/Dev/SelfTest.luau`) runs automatically on Play.

## What's in this milestone

| Priority | System | Where |
|---|---|---|
| 1 | Shark movement: camera-relative 3D swimming, acceleration and drag, turn-rate-limited steering, pitch, banking, ascend/descend, boost with stamina, smooth sphere-collider collisions | `client/Controllers/SharkController.luau` |
| 1 | Free orbit camera behind and slightly above the shark: mouse/stick/swipe orbit, zoom, terrain collision, surface clamp, boost FOV, shake | `client/Controllers/CameraController.luau` |
| 1 | PC, gamepad and mobile input (floating joystick, swipe camera, pinch zoom, Bite/Boost/Dash/▲/▼ buttons) | `client/Controllers/InputController.luau`, `client/UI/MobileControls.luau` |
| 2 | Tropical reef: smooth terrain (plateau, lagoon, pillars, arches, drop-off trench, basin rim), ~150 procedural coral/vegetation props, light shafts, marine snow, depth grading, swaying plants | `server/World/*`, `client/Controllers/EnvironmentFX.luau` |
| 3 | Procedural animation kept separate from movement: idle and fast swim, tail frequency that follows speed, turning body curve, banking, fin pitch, bite, damage flinch, belly-up death | `client/Controllers/SharkAnimator.luau` |
| 4 | Fish AI: 5 species, schooling boids, home-anchored, bottom dwellers, cruisers; flee and respawn; distance LOD; pooled client visuals | `server/Services/FishService.luau`, `client/Controllers/FishRenderer.luau` |
| 5 | Server-validated bites, size gating, mass/XP/coin rewards, hunger, growth with safe limits, evolution | `server/Services/FeedingService.luau`, `shared/Progression.luau` |
| 6 | Multiplayer: server authority, validated and rate-limited remotes, movement anti-cheat, 16-player config, PvP bite path (behind a flag) | `server/Services/*` |
| 7 | Responsive HUD: health, hunger, boost, mass/size, XP and level, coins, species, ability cooldown, bite target ring, popups, banners, death and loading screens | `client/UI/HUD.luau`, `client/UI/FeedbackFX.luau` |

## Project structure (Rojo)

```
shark-dominion/
├─ default.project.json        Rojo tree + StarterPlayer/Players/Lighting/Workspace properties
├─ rokit.toml                  pinned toolchain (rojo, selene, stylua)
├─ docs/
│  ├─ TESTING.md               exact Studio test plan per system
│  └─ ASSETS.md                art assets needed to replace temporary procedural visuals
└─ src/
   ├─ shared/   → ReplicatedStorage.Shared
   │  ├─ Config/GameConfig      world, networking, persistence constants
   │  ├─ Config/SharkConfig     movement feel, vitals, bite, ability, growth, species
   │  ├─ Config/FishConfig      5 fish species (stats, behavior, rewards, visuals)
   │  ├─ Net/Remotes            every network endpoint, created by the server
   │  ├─ Net/FishCodec          8-byte-per-fish buffer snapshots
   │  ├─ Util/Signal, MathUtil
   │  ├─ Progression            levels, growth curve, species by level, max health
   │  └─ SharkRig               temporary procedural Motor6D shark rig + safe scaling
   ├─ server/   → ServerScriptService.Server
   │  ├─ init.server            bootstrap (order: remotes → lighting → world → data → sharks → fish → feeding)
   │  ├─ World/ReefBuilder      terrain generation (chunked, liquid-channel voxels)
   │  ├─ World/PropFactory      corals, anemones, sponges, kelp, seagrass, decor
   │  ├─ World/LightingSetup    underwater lighting grade
   │  ├─ Services/PlayerDataService   mass/XP/coins persistence + replicated attributes
   │  ├─ Services/SharkService        spawning, vitals, stamina, ability, anti-cheat, death, growth
   │  ├─ Services/FishService         fish simulation, LOD, respawn, replication
   │  ├─ Services/FeedingService      bite validation, rewards, PvP hook
   │  ├─ Services/RemoteGuard         rate limiting + argument validation
   │  └─ Dev/SelfTest                Studio-only automated checks
   └─ client/   → StarterPlayerScripts.Client
      ├─ init.client                 bootstrap
      ├─ Controllers/InputController, SharkController, CameraController,
      │              SharkAnimator, FishRenderer, EnvironmentFX
      └─ UI/UIKit, HUD, MobileControls, FeedbackFX
```

## Getting it running

1. Install [Rokit](https://github.com/rojo-rbx/rokit), then run `rokit install` inside `shark-dominion/`.
   You can also install Rojo 7.4+ yourself.
2. **Live sync:** run `rojo serve` and, in Studio, open a new **Baseplate** place,
   delete the `Baseplate` part, open the Rojo plugin and click **Connect**.
   **Or build a place file:** run `rojo build -o SharkDominion.rbxlx` and open it in Studio.
3. Press **Play**. The server generates the reef (a few seconds; the client shows
   "Growing the reef…"), then spawns your shark on the reef plateau.
4. Check the Output window for `[SelfTest] PASS`, `[ReefBuilder] Terrain ready`,
   `[PropFactory] … props` and `[FishService] … fish`.

To test multiplayer, use **Test → Clients and Servers** with 2 to 4 players. For
DataStore persistence, publish the place and enable **Studio Access to API Services**.
Without that it runs in memory and logs a warning.

## Controls

| Action | PC | Gamepad | Mobile |
|---|---|---|---|
| Swim / steer | WASD or arrows (camera-relative) | Left stick | Floating joystick (left half) |
| Camera | Mouse (locked; hold **Alt** to free the cursor), wheel to zoom | Right stick | Swipe right half, pinch to zoom |
| Ascend / descend | Space / Ctrl (also C or Q) | A / B | ▲ / ▼ |
| Boost | Shift (hold) | L2 | BOOST (hold) |
| Bite | Left mouse (also F) | R2 / R1 | BITE |
| Special: Frenzy Dash | E | X | DASH |

## Architecture notes

**Movement authority.** Each shark is one physics assembly: an invisible root,
two invisible sphere colliders and massless non-colliding visual parts joined by
Motor6Ds. The owning client holds network ownership and steers only a
`LinearVelocity` and an `AlignOrientation`, so input has zero latency. The server
checks every position delta against `SharkConfig.maxLegitSpeed` (which accounts
for size, species, boost, dash and bite lunge), keeps sharks inside the water
volume, and snaps offenders back to their last valid position.

**Everything else is server-owned:** health, hunger, stamina (the client predicts
it with the same shared integrator and gets corrected), ability cooldowns, bites,
rewards, growth, evolution and death.

**Fish** are plain data on the server, with no Instances and no physics. Bite
validation therefore uses exact server positions. Clients get a static roster
once, then relevance-filtered 8-byte-per-fish snapshots at 10 Hz over an
`UnreliableRemoteEvent`. They interpolate these with a 180 ms delay and draw
pooled visuals with a single `BulkMoveTo` per frame. The server LODs fish far from
every shark (0.6 s update interval, no boids separation).

**Bites.** The client sends only a fish-id *hint*. The server rebuilds the mouth
position from its own copy of the shark, accepts the hint only if the fish is in
range and in front (with a latency allowance), and otherwise searches for a valid
target itself. It also enforces cooldown, alive state and the size gate
(`MinScale`).

**Animation is decoupled from movement.** `SharkAnimator` animates every shark on
every client. For the local shark it reads `SharkController.motion`; for remote
sharks it reads replicated physics velocities and model attributes (`Boosting`,
`BiteCount`, `HitCount`, `Dead`, `Scale`). It writes only `Motor6D.Transform`,
which does not replicate. Swapping in a skinned mesh rig and AnimationTracks later
only touches this module.

**Scaling** goes through `SharkRig.applyScale`, which writes absolute sizes and
joint offsets from stored base values, so repeated growth never drifts. It is
clamped to `Growth.MaxScale = 2.6`, and the server rescales only after a change of
at least 0.015.

**16-player readiness.** Bandwidth scales with the number of fish near each
player, not with the total. Remotes are rate-limited per player. Sharks don't
body-block each other (a collision group). PvP is fully wired through
`FeedingService.tryPvP` → `SharkService.applyDamage`; set `GameConfig.PVP_ENABLED = true`
to try it.

## Known limitations and next steps

- Visuals are a stylized procedural pass. Final art (a skinned shark, fish meshes,
  coral MeshParts, caustics and particle textures) is specified in [docs/ASSETS.md](docs/ASSETS.md).
- DataStore saving has retries and never overwrites good data after a failed
  load, but it has no session locking yet. Add ProfileStore before monetisation.
- No predators or NPC sharks yet. `SharkService.applyDamage` is the hook for them.
- The terrain is generated at runtime, which takes a few seconds on server start.
  For production, generate once, save the place, and skip `ReefBuilder` when terrain already exists.
