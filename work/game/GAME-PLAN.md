# Schlelberg: game plan

Status: design decisions fixed on 29 September 2026. Nothing is built yet.

## Documents
| File | What it holds |
|---|---|
| `GAME-PLAN.md` | This overview: decisions, format, pipeline roles, budget, milestones |
| `PROLOGUE-DESIGN.md` | The full prologue: story flow, every beat, mechanics, cameras, dialogue, fail handling |
| `TECH-DESIGN.md` | How it is built: folders, systems, data formats, tools, testing |
| `SOUND-DESIGN.md` | Every sound layer, where each sound comes from, and cues per beat |
| `character-sheet.md` | Every physical detail from the novel, with chapter references |
| `prompts/character-image-prompts.md` | ChatGPT image prompts for the cast |

## What the game is like

### In one sentence
A short, quiet, tense story game where you live through the first two chapters of *Schlelberg* as Tobious. You don't win by fighting. You win by noticing things, reading water and working with the people beside you.

### How it feels to play
- **Mostly you walk, look and work with your hands.** You clear a drain, finish a knot, lever a slab, untie a rope. Every action is something a farmer would do.
- **The camera is like a film.** Each room has composed angles, the way the book's paintings are framed. You never steer the camera.
- **The screen stays almost empty.** No health bar, no map, no inventory. Only a small hand icon for the injured wrist, and a short painted prompt when you can act.
- **Tension comes from rules you learn.** The Iwang follows the book's rules. You learn by watching and listening when it is solid and when it is smoke, and when its collar is open.
- **You can't change what happens,** and the game says so. If you miss a timing, the screen drains and a line appears: *"No. That is not how it went."* Then time steps back a few seconds.

### What it is not
No combat system, no levels or skill points, no dialogue choices, no collectibles for their own sake, no voice acting.

### Similar games (for feel only)
- *Inside* and *Little Nightmares:* composed cameras, few words, dread from space and sound.
- *A Plague Tale:* a fixed story, companions, a creature with learnable rules.
- *What Remains of Edith Finch:* a book-like story told through playable moments.

### One minute of play (beats U8 and U9)
Darran forces the clamp. Metal clicks. The sound muffles as the pressure builds, and the lamp flames lean toward the black stone. Then the water around Tobious's ankles starts to move toward the door. A pale hand with too many joints presses against the threshold, turns to smoke, gathers again. The guard stabs, and the spear passes through the creature's empty chest. Lios is crouched on the lowest step with the rope still on his neck. You walk along the far wall, where the dust shows the creature is thin, and reach the boy. The rope is trapped under the fallen guard's boot. You hold E, and Tobious works the swollen knot with his left hand while the clicks get closer. Offscreen, a spear falls. The camera stays on Lios's face. *"Your name."* *"Lios."*

### Length and shape
- About 15 to 20 minutes.
- Opens with 8 painted story cards on the surface, then 12 playable 3D beats underground, then a short ending.
- Ends with a ledger screen: the names you learned, the lines you noticed, and the guard, still unnamed.

### The bigger game, later
The prologue is the first of five parts that follow the novel. Later parts add Veyr and Severance's guarded cut with a partner covering you. From Part 3 you also play as Mariya: counting the living, timing the ninth-step clicks, dividing rations with the council, planning stretcher routes. Each part would be designed and approved the same way as this one.

## Decisions already made
- **First target:** a prologue covering Chapters 1 and 2. About 15 to 20 minutes of play.
- **Surface scenes:** painted story cards. The 3D game starts underground.
- **Canon is fixed.** No player action changes who lives, who dies or what is said.
- **Rewind line:** "No. That is not how it went."
- **Controls:** keyboard and mouse only.
- **The guard's death:** sound only, as in the book.
- **Ledger:** quotes the book, with chapter numbers.
- **Language:** English.
- **Format:** cinematic third person, with a fixed camera for each zone of a room.
- **Pipelines:** Tripo, Blender (headless, through `bpy`), Three.js, plus ChatGPT for the story card paintings.

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
| Story card paintings | | | display (ChatGPT makes the paintings) |

## Tripo budget (600 credits, 14 days)
I estimate about 75 credits per character for model, rig, idle and walk. I'll confirm the real cost on the first task.

| Priority | Character | Tripo work | Estimate |
|---|---|---|---|
| 1 | Iwang | model, rig, idle, walk | 75 |
| 2 | Tobious (farmer) | model, rig, idle, walk | 75 |
| 3 | Samon | model, rig, idle, walk | 75 |
| 4 | Darran | model, rig, idle, walk | 75 |
| 5 | Telassari guard | model, rig, idle, walk | 75 |
| 6 | Lios | model, rig, idle | 55 |
| | Reserve for retries | | 170 |
| | **Total** | | **600** |

Mariya appears only in the story cards in the prologue, so she gets no Tripo model yet. The workers reuse the Samon and Darran bodies with new textures in Blender. If the reserve is still unused near day 12 of the free credits, it can go to Mariya for the later parts.

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
| M6 | Story cards S1 to S3 and the ending E1 | Playable link |
| M7 | Sound: sound test page, then the full mix | A sound test page for your review |
| M8 | Polish: painterly filter, subtitles, checkpoints, performance | Final prologue build |
