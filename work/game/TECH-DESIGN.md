# Technical design

How the prologue in `PROLOGUE-DESIGN.md` gets built. Draft for approval. Nothing here is built yet.

## 1. Folder layout
```
work/game/
├─ GAME-PLAN.md, PROLOGUE-DESIGN.md, TECH-DESIGN.md
├─ character-sheet.md
├─ prompts/                  image prompts for ChatGPT
├─ refs/                     approved character images (front and back)
├─ tripo/
│  ├─ tripo_client.py        API calls: upload, model, rig, animate, download
│  ├─ spend-log.md           balance before and after every task
│  └─ raw/                   untouched Tripo downloads (.glb)
├─ blender/
│  ├─ lib/                   shared helpers (materials, bake, export, render preview)
│  ├─ env_chamber.py         stair, passage, chamber, threshold, slab
│  ├─ env_surface.py         yard and terrace (later)
│  ├─ env_veyr_echo.py       skyline for the echo
│  ├─ props.py               jars, lamp, rod, spears, jug, lever...
│  ├─ char_cleanup.py        scale, origin, decimate, hollow chest, weights
│  ├─ anim_*.py              one script per story action
│  ├─ cameras.py             fixed cameras and cutscene paths
│  └─ previews/              rendered stills and GIFs for review
├─ web/                      the game (Vite project)
│  ├─ public/assets/         exported .glb, textures, audio
│  ├─ src/
│  │  ├─ main.ts
│  │  ├─ core/               Game loop, AssetLoader, Input, Save
│  │  ├─ systems/            CameraZones, Movement, Animation, Interaction,
│  │  │                      Story, Dialogue, Ledger, Rewind, Audio
│  │  ├─ actors/             Player, Npc, Iwang
│  │  ├─ fx/                 Water, Threshold, IwangMaterial, LampFlicker, PostFX
│  │  ├─ ui/                 Prompts, Subtitles, Ledger, HandIcon, Menu
│  │  └─ data/prologue.json  beats, dialogue, interactions, checkpoints
│  └─ tests/                 Playwright screenshot runs per beat
└─ build/                    final web build
```

## 2. Tools and versions
| Tool | Use |
|---|---|
| Python 3.11 + `bpy` (Blender as a pip module) | All Blender work, run headless |
| Blender Eevee (headless) | Preview renders |
| Blender Cycles on CPU | Light and AO baking |
| Node 22 + Vite | Web dev server and build |
| TypeScript | Game code |
| `three` | Rendering |
| `postprocessing` (pmndrs) | Bloom, vignette, grain, custom painterly pass |
| `three-pathfinding` | Walkable navmesh |
| Playwright + preinstalled Chromium | Automated screenshots and beat tests |
| `gltf-transform` | Draco and texture compression |

No other paid services beyond Tripo.

## 3. Asset pipeline
```
ChatGPT image ──► refs/ ──► tripo_client.py ──► tripo/raw/*.glb
                                                   │
                           char_cleanup.py ◄───────┘
                                  │
                        anim_*.py (story actions added)
                                  │
env_*.py + props.py + cameras.py ─┤
                                  ▼
                       export (.glb, Draco, KTX2)
                                  │
                                  ▼
                       web/public/assets ──► Three.js
```

### 3.1 Tripo client
- One script with subcommands: `balance`, `model <image>`, `rig <task>`, `animate <task> <preset>`, `download <task>`.
- Every paid call writes the balance before and after to `spend-log.md`.
- Hard stop: it refuses to run a paid task if the balance would drop below the reserve set in `GAME-PLAN.md`.
- A retry always asks you first.

### 3.2 Character cleanup (`char_cleanup.py`)
- Scale to real height (Tobious 1.75 m, Lios 1.40 m, Iwang 2.6 m). Origin at the feet, facing +Z.
- Decimate to a budget: 25k triangles for main characters, 15k for extras.
- Iwang: remove faces inside the torso gap, add a separate transparent material slot for the rim of the hollow.
- Rename bones to one standard set so animations can be shared.
- Preview: a turntable GIF in `blender/previews/`.

### 3.3 Story animations (`anim_*.py`)
Each script keyframes one action onto the standard skeleton and saves it as a named action.

| Action | Characters | Notes |
|---|---|---|
| `kneel_gather` | Tobious | S1 grains |
| `fall_struck` | Tobious | S1, three hits and the fall |
| `crouch_work` | Tobious, workers | Drain, knot, clamp |
| `reach_threshold` | Tobious | U6 |
| `rod_poke_drop` | Tobious | U5, U7 |
| `lever_pull_left` | Tobious | U11, left hand |
| `rope_haul` | Tobious, Samon | U11 |
| `wedge_shove` | Tobious, Samon | U11 |
| `spear_sweep_left` | Tobious | U11 |
| `crawl` | Tobious | U12 |
| `stoop_idle`, `stoop_walk` | Samon | Edits of the Tripo clips |
| `basket_throw` | Samon | U11 |
| `pinned` | Samon | U12 |
| `lamp_hold`, `clamp_force` | Darran | U3, U8 |
| `spear_thrust`, `struck_stair` | Guard | U8 |
| `sit_hold_jug` | Lios | E1 |
| `hand_press`, `step_through`, `unfold`, `gather_strike`, `retreat_seam` | Iwang | U8 to U11 |

Hands use IK targets that match objects in the room, so a lever pull lands on the lever.

### 3.4 Environments
- Built from primitives and modifiers in code. Dimensions come from the design doc. For example, the threshold is wide enough for two people side by side.
- Tiling stone and mud textures are made procedurally in Blender, then painted over with dirt masks.
- AO and light are baked to a second UV set.
- Every camera in `PROLOGUE-DESIGN.md` section 5 is an actual camera object in the file, exported with the room.
- The walkable floor is a separate, hidden mesh exported for the navmesh.

## 4. Game systems (Three.js)

### 4.1 Core loop
`Game` owns the renderer, the clock and a list of systems. Every frame: input, story, movement, the Iwang, animation, camera, effects, render with post-processing.

### 4.2 Story system
- `data/prologue.json` holds every beat as data. Code does not hard-code the story.
- Each beat has: `id`, `camera`, `onEnter` actions, `steps`, a `checkpoint` flag and `next`.
- A step is one of: `dialogue`, `interaction`, `cutscene`, `wait`, `set` (a flag or a ledger entry), `timer` (for "happens anyway after 8 seconds").
- Because canon is fixed, beats only go forward. Optional steps can be skipped, never branched.

Example:
```json
{
  "id": "U3_drain",
  "camera": "C-U3a",
  "checkpoint": true,
  "steps": [
    { "type": "dialogue", "who": "Darran", "text": "You know the channels?" },
    { "type": "dialogue", "who": "Darran", "text": "Get it out." },
    { "type": "interaction", "id": "look_clean_stones", "kind": "look", "optional": true,
      "ledger": "The lower stones are clean. Water has worn them." },
    { "type": "interaction", "id": "pull_shard", "kind": "use", "anim": "crouch_work" },
    { "type": "set", "flag": "drain_open" },
    { "type": "interaction", "id": "rod_channel", "kind": "hold", "hand": "left", "seconds": 4 }
  ],
  "next": "U4_line"
}
```

### 4.3 Camera zones
- Invisible boxes on the floor, each linked to a camera from the `.glb`.
- When the player enters a zone, the view cuts to that camera. Cutscenes can override.
- Camera-relative movement keeps the old direction after a cut until the stick or key is released.

### 4.4 Movement
- A navmesh from the hidden floor mesh. The player cannot leave it.
- Water zones reduce speed and trigger splash sounds and ripples.

### 4.5 Interaction system
- Objects are tagged in Blender with custom properties, for example `interact=pull_shard`.
- The nearest active object within 1.2 m shows a prompt.
- Types from the design doc: look, use, hold, rhythm, timed, guide.
- `hand: "left"` makes hold actions 30 percent slower and plays the left-hand clip.

### 4.6 Iwang system
- `gradient(p) = opening * falloff(distance(p, threshold))`, with `opening` from 0 (closed) to 1 (fully live).
- `coherence` follows the gradient with a short delay, so it thins and gathers smoothly.
- The material reads `coherence`: low values dissolve the edges into smoke with noise and let light through; high values are solid and cast shadows.
- A simple state machine: `emerge`, `watch`, `approach`, `windup`, `strike`, `recover`, `retreat`. Canon beats force states when needed.
- `windup` exposes the collar, which drives the timed-input window.

### 4.7 Rewind system
- A ring buffer of snapshots every 0.5 seconds (positions, animation times, story step, Iwang state).
- On a canon-breaking fail: desaturate, show the line, restore the snapshot from 5 to 10 seconds earlier.
- A counter per micro-checkpoint turns on the assist after three rewinds.

### 4.8 Save
- The beat id and flags go to `localStorage` at each checkpoint, inside try/catch. The game still works if storage is blocked.

## 5. Visual effects

### 5.1 Water
- A flat plane with a custom shader: normal maps that scroll along a flow direction, plus a ripple buffer written by feet and falling objects.
- The flow direction is animated by the story: still, toward the drain, still, toward the threshold.
- Ripples are masked at the threshold's black line, so none cross it (U6).

### 5.2 Threshold
- **Dormant:** black and non-reflective.
- **Echo:** a render target from a second scene (the Veyr skyline) shown through the frame with a soft edge and a slight wobble. It shows the future Tobious as a textured model inside that scene.
- **Live:** cold white-blue emissive light, a light source that throws the chamber's shadows away from the door, and a particle draft that pulls dust inward.
- The line of light first appears at face height and widens, as in canon.

### 5.3 Lamp
- Point lights with flicker noise. Flames are small cards that lean toward the threshold when the story sets `draft > 0`.

### 5.4 Painterly post-processing
- A Kuwahara-style filter to flatten detail into brush-like patches.
- A paper texture overlay at low strength.
- Colour grading toward the visual bible's ochre, rust, grey-blue and cream.
- Soft bloom on the threshold, a vignette and fine grain.
- Quality presets for weaker machines.

## 6. Performance targets
- 60 fps on a mid-range laptop at 1080p with the high preset. A lower preset for weaker machines.
- Under 60 MB total download for the prologue.
- Under 150 draw calls per room.

## 7. Testing
- Playwright opens the game with a `?beat=U8` URL parameter, so any beat can be tested directly.
- Each test plays the beat's inputs and takes screenshots at set points. I review them before sending you anything.
- A smoke test plays the whole prologue on assist mode from start to end.

## 8. Sharing builds
- Each milestone build can be published as a private claude.ai Artifact link, so you can play it in a browser without installing anything. It stays private until you share it.
- If the build grows past the artifact limits, we host it elsewhere. That decision comes later.

## 9. Risks
| Risk | Effect | Plan |
|---|---|---|
| Tripo fills the Iwang's chest | It loses its key look | Cut it open in Blender |
| Tripo rig fails on the Iwang | No animation | Rig it in Blender from a template skeleton |
| Tripo textures clash with the painted style | The look is inconsistent | Painterly filter, plus texture repaint in Blender |
| Keyframed animation looks stiff | Weak scenes | Tight framing and cuts; keep motion short |
| `bpy` wheel or Cycles bake is too slow in this container | Slow iteration | Bake at lower resolution, or use AO only |
| Browser performance | Low frame rate | Quality presets, texture compression |
