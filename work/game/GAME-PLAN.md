# Schlelberg: game plan

Status: agreed direction, 29 September 2026.

## Decisions
- **First target:** a prologue covering Chapters 1 and 2, "The Door Without Wind". About 10 to 15 minutes of play.
- **Canon is fixed.** Player choices never change who lives or dies. They change pacing, small details and what the player notices.
- **Language:** English.
- **Pipelines:** Tripo (image to 3D model, rig and animation), Blender run headless through `bpy` (cleanup, environments, materials), and Three.js in the browser (the game itself).

## Format: cinematic third person with a fixed camera per room
Each space has one or more authored camera angles, framed like the book's paintings. The player walks Tobious through the space and uses context actions. There is no free camera and no open combat.

Why this format:
- **It plays to the strongest parts of the pipeline.** Lighting, fog, water, shaders and painterly post-processing make most of the visual quality, and every frame can be composed and checked.
- **It hides the weakest part.** Tripo's animations are generic. Fixed angles and cuts let simple animations read well. Precise actions like untying a knot become short framed shots, not full-body motion capture.
- **It matches the book.** Tobious can't win fights in Chapters 1 and 2. The drama is about timing, water and working with other people, not about beating enemies.
- **It fits the budget.** Small spaces, few characters and reused animations.

## Visual target
- A painterly gouache look that matches `work/redesign/art/visual-bible.png`.
- A post-processing painterly filter unifies the Tripo models with the environment.
- Warm oil-lamp light against cold, flameless light from the threshold.
- Ankle-deep dark water that reacts to feet, the rod and the pull of the opening.

## Prologue beats
1. **Granary yard (Ch 1).** The seed levy. The player notices the extra band on the measure. Grabbing the jar always fails. The spear shaft hits Tobious's right wrist. From here on, some actions are left-handed only.
2. **The stair and the circular chamber (Ch 1).** Samon hands over a knot. Clear the blocked drain with the rod. The water starts to move.
3. **The threshold (Ch 1).** Clear the mud from the clamp. Blood from the scraped knuckles touches the frame. The echo shows the future city and the future Tobious. He speaks the canon lines.
4. **The live opening (Ch 2).** Darran forces the clamp. Air pulls toward the door and the water moves. The Iwang's hand, then its shoulder, comes through.
5. **Lios (Ch 2).** Free the rope from under the soldier's boot, left-handed, then guide Lios to the wall.
6. **The slab (Ch 2).** A rhythm action with Samon: lift, wedge, release, lift. The spear strike on the collar is a timed input. The clamp snaps and the door closes. The beam falls on Samon's leg, which is canon.
7. **The surface (Ch 2).** Lios holds his broken jug, and Tobious is taken away. End card.

## Iwang rules in the game
- It thins away from the live gradient and turns solid near the threshold or when it strikes.
- The dark knot at the collar is the only weak point, and it shows only when the creature is solid.
- Warnings: dust moving against the draft, mineral clicks, water trembling.
- It leaves when the current closes. The player never kills it.

## Order of work
1. Blender: the chamber, the stair and the threshold as environment.
2. Three.js: the fixed-camera controller, the water and threshold shaders, the painterly filter.
3. Test scene: the threshold lights up and a placeholder Iwang steps through.
4. Tripo: Iwang first, then Tobious, then the others, checked against `character-sheet.md`.
5. Build the beats in order, then add the granary yard last.
