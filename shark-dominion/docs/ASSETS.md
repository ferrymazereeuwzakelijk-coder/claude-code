# Asset requirements

No external rigged shark models or meshes were available for this milestone, so
every visual is generated in code. The shark is a working temporary rig, and the
reef props are a stylized procedural art pass. This document lists exactly what
final art should replace them, and where each piece plugs in.

## 1. Player shark (highest priority)

**Replace:** `src/shared/SharkRig.luau`, the procedural ellipsoid and wedge rig.

**Deliverable:** one rigged **skinned MeshPart** per species (Reef, Blacktip,
Tiger, Great White), exported as FBX and imported with the Studio 3D Importer.

| Requirement | Spec |
|---|---|
| Orientation | Facing **-Z**, up **+Y**, root at the centre of mass |
| Size at scale 1 | About 12.5 studs nose to tail fork, to match the hitboxes and camera |
| Triangles | ≤ 6k (LOD0). Roblox auto-LODs the rest. |
| Bones (minimum) | `Root` → `Spine1` → `Spine2` → `Spine3` → `Tail1` → `Tail2` → `TailFin`; `Spine1` → `Head` → `Jaw`; `Spine2` → `PectoralL`, `PectoralR`; `Spine2` → `Dorsal` |
| Skinning | Smooth weights along the spine (≥ 3 influences across segments) so the body wave reads as one flexible body |
| Textures | 1024² PBR SurfaceAppearance: ColorMap with countershading and species markings, NormalMap with skin and gill slits, RoughnessMap. Teeth and inner mouth on the same atlas. |
| Separate pieces | Teeth may be part of the mesh. Eyes may be separate MeshParts welded to `Head`. |

**Animations** (Animation assets, played by `SharkAnimator` through an `Animator`):

| Name | Loop | Notes |
|---|---|---|
| `Swim_Idle` | yes | Slow, wide tail sweep (≈0.8 Hz) |
| `Swim_Fast` | yes | Tight, fast sweep (≈3.4 Hz). Blend weight is driven by speed. |
| `Turn_L` / `Turn_R` | additive | Body curve, weighted by yaw rate |
| `Bite` | no, about 0.32 s | Jaw snap and head lunge (Action priority) |
| `Hit` | no, about 0.45 s | Flinch (Action priority) |
| `Death` | no | Roll belly-up |

**Integration:** keep the invisible `Root`, the two colliders, and the
`SharkVelocity`/`SharkAlign` constraints exactly as they are. Weld the skinned
mesh to `Root`. In `SharkAnimator`, swap the `Motor6D.Transform` writes for
`AnimationTrack:AdjustWeight` / `AdjustSpeed` driven by the same inputs (speed01
→ swim blend and playback speed, yawRate → turn weights). Movement code doesn't
change.

## 2. Fish

**Replace:** the `Visual.Parts` lists in `src/shared/Config/FishConfig.luau`.

One MeshPart per species, facing -Z, at 1 stud = 1 unit of `Length`, ≤ 400
triangles. Use a 256² texture atlas shared by all fish. Tail wag can remain
procedural: split the tail into its own MeshPart pivoted at its front edge.
Sardines may use a single mesh with the tail baked in plus a vertex-wobble-free
idle.

| Species | Length (studs) | Look |
|---|---|---|
| Sardine | 1.2 | Silver with a blue back |
| Clownfish | 1.0 | Orange with 3 white bands outlined in black |
| Blue Tang | 1.6 | Royal blue, black palette mark, yellow tail |
| Grouper | 4.2 | Mottled brown, big lips |
| Yellowfin Tuna | 3.4 | Navy back, silver belly, yellow finlets and stripe |

## 3. Reef props

**Replace:** the builders in `src/server/World/PropFactory.luau`. The placement
logic stays; swap each `Builders.X` for a clone of a prefab Model from
`ServerStorage.ReefProps`.

| Prop | Variants | Budget per variant | Notes |
|---|---|---|---|
| Staghorn coral | 3 | ≤ 800 tris | Vertex colour tips |
| Brain coral | 2 | ≤ 500 | Normal-mapped grooves |
| Table coral | 2 | ≤ 400 | |
| Sea fan | 3 | ≤ 300 | Alpha-cut lattice texture, double-sided. Keep the `Sway` tag. |
| Tube sponge cluster | 2 | ≤ 400 | |
| Anemone | 2 | ≤ 600 | Tentacles as separate parts or a skinned mesh for sway. Keep the `Sway` tag and the home-point attachment. |
| Kelp stalk | 3 | ≤ 500 | Skinned 6-bone chain preferred. Keep the `Sway` tag. |
| Seagrass tuft | 3 | ≤ 120 | Alpha-cut card mesh. Keep the `Sway` tag. |
| Starfish, shells, pebbles | 4 | ≤ 150 | |
| Rock boulders (accent) | 4 | ≤ 600 | Used to break up terrain silhouettes |

## 4. Textures and effects

| Asset | Use | Replaces |
|---|---|---|
| Animated caustics texture (8-frame flipbook, 512²) | Projected on the seabed via SurfaceAppearance or Decal on large invisible planes | Currently missing |
| Bubble sprite (soft ring, 128²) | Gill bubbles, eat bursts | `sparkles_main.dds` |
| Soft blood/ink cloud sprite (256², 4-frame flipbook) | Eat bursts | `smoke_main.dds` |
| Marine snow speck (32²) | Particulates | `sparkles_main.dds` |
| Light shaft gradient (64×256) | Beam texture | Untextured beams |
| UI icon set (heart, meat, lightning, coin, dash) | HUD | Emoji glyphs and the drawn coin |

## 5. Audio (next milestone)

These don't block Milestone 1:

- Underwater ambience loop
- Swim whoosh (pitch scaled by speed)
- Boost burst
- Bite crunch (3 variants)
- Fish eaten pop
- Level-up sting
- Evolution sting
- Damage thud
- Low hunger heartbeat
