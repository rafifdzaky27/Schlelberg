# Schlelberg: game plan

Status: draft for approval, 29 September 2026. Nothing below is built yet.

## Documents
| File | What it holds |
|---|---|
| `GAME-PLAN.md` | This overview: decisions, format, pipeline roles, budget, milestones |
| `PROLOGUE-DESIGN.md` | The full prologue: story flow, every beat, mechanics, cameras, dialogue, fail handling |
| `TECH-DESIGN.md` | How it is built: folders, systems, data formats, tools, testing |
| `character-sheet.md` | Every physical detail from the novel, with chapter references |
| `prompts/character-image-prompts.md` | ChatGPT image prompts for the cast |

## Decisions already made
- **First target:** a prologue covering Chapters 1 and 2. About 15 to 20 minutes of play.
- **Canon is fixed.** No player action changes who lives, who dies or what is said. The player controls how a canon moment is reached, not what happens.
- **Language:** English.
- **Format:** cinematic third person, with a fixed camera for each zone of a room. No free camera and no open combat.
- **Pipelines:** Tripo, Blender (headless, through `bpy`) and Three.js.

## Why this format
- Lighting, water, shaders and a painterly filter make most of the visual quality. I can compose and check every frame.
- Tripo's generic animations look fine at fixed angles and with cuts. Fine hand work becomes a close shot.
- In Chapters 1 and 2 Tobious cannot win a fight. The drama is about timing, water and working with other people.
- Small spaces and a small cast fit the budget.

## Visual target
- A painterly gouache look that matches `work/redesign/art/visual-bible.png`.
- Warm oil-lamp light against cold, flameless light from the threshold.
- Ankle-deep dark water that reacts to feet, the rod and the pull of the opening.
- A painterly post-processing filter unifies the Tripo models and the Blender rooms.

## Pipeline roles

### Tripo
- Image to 3D model for each character.
- An automatic rig.
- Two generic clips per character: idle and walk. Nothing more, to save credits.
- A spend log records the balance before and after every task.

### Blender (headless, driven by Python scripts)
Blender has no live viewport here. I check my work by rendering still frames and short GIFs, and I send you those previews too.

1. **Environments:** the granary yard, the ancestor terrace, the stair, the passage, the circular flooded chamber, the lower steps, the threshold frame, the clamp recess and the slab. They follow `work/planning/02-world-and-rules.md`.
2. **Materials:** old stone, mud-brick, moss in the joints, mud on the threshold's lower edge, green metal on the clamp.
3. **Baked light:** soft shadows and ambient occlusion baked into textures, so the stone reads as heavy at little cost in the browser.
4. **Character cleanup:** fix scale, facing and origin. Reduce polygons. Reopen the Iwang's hollow chest if Tripo fills it. Fix rig weights where needed.
5. **Story animation, keyframed in code:**
   - Mechanical actions with clear poses: pulling a lever, shoving a wedge, crouching at the drain, reaching toward the threshold, falling.
   - Iwang motion: the hand pressing on the threshold, stepping through, the extra joints unfolding, pulling back into the seam.
   - Edits to Tripo clips: Samon's stoop, the left-handed versions, slowing a walk.
   - Look-at and reach with IK, so hands land on the lever and heads turn to the right target.
   - **Simpler by design:** fine finger work, such as untying the knot, becomes a close shot of the hands. Faces stay mostly still, so emotion comes from framing, light and pose.
6. **Cameras and cutscenes:** every fixed camera angle and every cutscene camera move is authored in Blender and exported in the `.glb` file.
7. **Export:** compressed `.glb` files for the web.

### Three.js (the game in the browser)
1. **Game systems:** scene loading, camera zones, movement on a walkable floor, animation blending, interactions, the story script, dialogue and subtitles, checkpoints.
2. **Shaders:** water, the threshold's echo and live states, the Iwang thinning and turning solid, lamp flicker.
3. **Final look:** painterly filter, soft bloom on the threshold, vignette, film grain.
4. **Sound:** drips, hum, clicks and pressure, made in code where possible.
5. **Testing:** headless Chromium plays each beat and takes screenshots.

### Who does what
| Task | Tripo | Blender | Three.js |
|---|---|---|---|
| Character models | ✓ | cleanup | display |
| Rig | ✓ | fixes | |
| Generic animation (idle, walk) | ✓ | edits | playback |
| Story actions (lever, reach, step through) | | ✓ | playback |
| Rooms and props | | ✓ | display |
| Baked light and shadow | | ✓ | |
| Camera angles and cutscenes | | ✓ | playback |
| Water, threshold, Iwang effects | | | ✓ |
| Controls, interactions, story | | | ✓ |
| Painterly look | | textures | filter |

## Tripo budget (600 credits, 14 days)
I estimate about 75 credits per character for model, rig, idle and walk. I'll confirm the real cost on the first task.

| Priority | Character | Tripo work | Estimate |
|---|---|---|---|
| 1 | Iwang | model, rig, idle, walk | 75 |
| 2 | Tobious (farmer) | model, rig, idle, walk | 75 |
| 3 | Samon | model, rig, idle, walk | 75 |
| 4 | Darran | model, rig, idle, walk | 75 |
| 5 | Telassari soldier | model, rig, idle, walk | 75 |
| 6 | Lios | model, rig, idle | 55 |
| 7 | Mariya | model, rig, idle, walk | 75 |
| | Reserve for retries | | 95 |
| | **Total** | | **600** |

The officer, the scribe and the villagers reuse the soldier and worker bodies with new textures in Blender. See the scope decision in `PROLOGUE-DESIGN.md`.

## Milestones
Each milestone ends with previews you can review before I move on.

| # | Milestone | You receive |
|---|---|---|
| M0 | Design approved | Your sign-off on these three documents |
| M1 | Chamber environment in Blender | Rendered stills from each camera angle |
| M2 | Web test scene: water, threshold echo and live states, placeholder Iwang | A playable link and a short capture |
| M3 | Iwang from Tripo, cleaned and animated | Turntable GIF and the step-through clip |
| M4 | Underground beats U1 to U9 playable with placeholders | Playable link |
| M5 | All underground characters in | Playable link |
| M6 | Surface beats (granary, terrace, ending) | Playable link |
| M7 | Polish: sound, painterly filter, subtitles, checkpoints, performance | Final prologue build |
