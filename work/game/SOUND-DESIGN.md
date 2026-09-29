# Sound design

Draft for approval. Nothing here is built yet.

## 1. The idea
Sound carries half the story underground. The player often hears a danger before seeing it.

1. **Sound teaches the Iwang's rules.** Clicks mean it is gathering. A hollow note means it is moving. A heavy thud means it is solid and can strike.
2. **Sound follows the threshold.** Every state of the door (dormant, echo, live, closing) has its own sound. When the door opens, the whole mix changes.
3. **Silence is a tool.** The echo starts when the water and the hum go silent, as in the book: *"The humming stopped. The water around his feet went still."*
4. **Sounds from the world first, music second.** Underground there is no score, only the room, the water and the door.
5. **No voice acting.** Speech is subtitled. Breath and effort sounds are also left out, so no fake voice sits beside the text.

## 2. An honest limit
**I can't hear.** I can build sounds in code, measure their volume and frequency, and draw spectrograms, but I can't judge how they feel. You will have to listen to every sound milestone and tell me what's wrong. I'll make that easy with a sound test page where each cue plays on its own button.

## 3. Sound layers

### 3.1 Ambience (one bed per space)
| Space | What you hear |
|---|---|
| Story cards (surface) | Sea wind, olive leaves, far gulls, the village murmur, soldiers' boots on paving, grain pouring into sacks |
| Stair and passage | Wind fading as you go down, dripping, baskets scraping, workers' tools |
| Circular chamber | Slow drips, water lapping at the walls, lamp oil hissing, a low stone room tone with a short echo |
| Around the threshold | A very low hum from inside the wall, present but hard to notice |
| Surface at dusk (E1) | Evening wind, a distant well rope, women's vessels clinking, far voices |

### 3.2 Foley (the player's actions)
- Footsteps on dry stone, on mud, and in ankle-deep water (splash and drag).
- Cloth, rope creaking under load, the knot pulling tight.
- The rod scraping through the drain channel, the shard pulling free, the rush of water finding the drain.
- Clay: Lios's jug breaking on stone.
- Bronze: the spear ringing on the far wall, scraping the collar.
- The slab: a deep grinding of stone on stone, the wedge knocking in, the clamp snapping *"like a jar cracking at the kiln"*.
- The collapse: a beam falling, rubble, dust hissing down.

### 3.3 The threshold
| State | Sound |
|---|---|
| Dormant | The low hum. When the rod touches the clamp, the hum grows louder and slightly rough, and the rod rattles. |
| Echo begins | The hum and the water stop at once. About one second of near silence. |
| Echo (41 s) | The future city heard as if through water: high wind between towers, a far rumble, the whoosh of the silver carriage, the road cracking and falling. The future Tobious's lines are subtitled with the city sound dipping under them. |
| Echo ends | The city thins to nothing. The chamber's drips return. |
| Live opening | A metal click, then **pressure in the teeth**: a deep swell under everything, and every other sound muffles slightly, like when your ears block on a descent. Then an air rush toward the door, and the water starts moving. |
| Closing | The air rush speeds up and cuts off. A falling tone. The line of light's hum shrinks to nothing. |

### 3.4 The Iwang
| Behaviour | Sound |
|---|---|
| Gathering near a live seam | **Mineral clicking**: dry clicks like small stones knocked together, in short clusters |
| Moving | A **low hollow note**, air passing through its open torso, like wind over a bottle mouth. The pitch rises with speed. |
| Thin (far from the door) | Airy and quiet, with no low end |
| Solid (near the door, about to strike) | The clicks tighten, a heavy thud on each step, grit |
| Strike | A fast whip, then impact on stone, shield or body |
| Bronze on the collar | A short sizzle, the burned salt, and dark grains scattering on the steps |
| Retreat | The hollow note bends down and follows the closing air rush into the seam |

The **coherence** value from the game controls its sound directly, so it always sounds as solid as it looks.

### 3.5 Music
Very little music. Three short pieces, all built from one melody:
1. **Title and story cards:** a single plucked string instrument, like a small lyre, playing a slow village melody. This melody is the work song from Chapter 29, which Mariya and Tobious sing in the shelter.
2. **Underground:** no melody. Only low tones that rise and fall with the gradient. Near the open door they grow tense, and after it closes they fade.
3. **End card:** the work song melody again, slower, with one note left unresolved.

### 3.6 Interface
- Opening the ledger: a wooden board placed down. Writing a new entry: a stylus scratching wax.
- Prompts: a soft tap on clay.
- Rewind: sound drains out along with colour, then returns.

## 4. How the mix reacts
One number, the **gradient** (how open the door is), drives most of the mix:
- It raises the air rush and the pressure layer.
- It muffles the chamber ambience a little, so the door dominates.
- It speeds up and tightens the Iwang's clicks.

Other live controls:
- **Distance:** every source is placed in 3D and gets quieter and duller with distance.
- **Room echo:** the chamber and the passage each get their own short echo, made in code.
- **Camera cuts:** the sound stays on the character, not on the camera, so a cut never makes sounds jump.
- **Rhythm in U11:** the rope creaks on each beat, so the player can follow the rhythm by ear as well as by the markers.

## 5. Where the sounds come from
| Source | Covers | Cost |
|---|---|---|
| **A. Built in code** (Web Audio) | The hum, pressure, air rush, the echo's city wind, the underground tones, the Iwang's clicks and hollow note, interface sounds, the plucked-string music | Free |
| **B. Free recordings with a CC0 licence** (for example freesound.org with the CC0 filter) | Footsteps in water and on stone, cloth, rope, clay breaking, grain pouring, bronze on stone, falling rubble, sea wind | Free. Every file is listed with its source in `audio/CREDITS.md`. |
| **C. Your own recordings** (optional) | Water in a basin, grain poured into a jar, a clay pot tapped | Free, and very authentic |
| **D. AI sound-effect generation** (optional) | Anything missing from A to C | Paid, only if you approve |

**My recommendation:** A and B for the first build. I'd need network access to the recording library, which I'll check when we reach the sound milestone.

## 6. Sound cues by beat
| Beat | Key sounds |
|---|---|
| S1 to S3 cards | Wind, boots, grain pouring, the jar cracking at the threshold, the spear shaft on the wrist, the body hitting the paving |
| U1, U2 | Wind fading, drips, rope creaking, the knot pulling tight |
| U3 | The shard pulling free, water rushing into the drain, the rod scraping in the channel |
| U4 | The water level falling, a quiet click of stone as the line appears |
| U5 | The hum through the rod, the rod dropping into the water, the mud scraped out, then **silence** |
| U6 | The city through water, the falling road, the future voice (subtitled) |
| U7 | The city thinning away, the jug breaking on stone, the rod striking the hard surface |
| U8 | Metal click, the pressure swell, the air rush, the first mineral clicks, the hollow note, the spear ringing on the far wall, the burned-salt sizzle, the shield folding |
| U9 | The rope dragging, the spear falling (the guard's death, heard, not seen), the Iwang's clicks moving closer or further |
| U10 | The lamp falling into the water, Darran's footsteps fleeing, the Iwang's hollow note beside the lamp |
| U11 | Rope creak on each beat, the lever wood straining, wicker thrown, the wedge knocking in, the sizzle on the collar, the clamp snapping |
| U12 | The floor lurching, the beam falling, dust, the air rush cutting off, silence, the drips returning, shouting up the stair |
| E1 | Evening wind, the two jug pieces touching, soldiers' steps, the work song melody |

## 7. Accessibility
- Sound captions in the subtitles, for example *[mineral clicking]* or *[the hum stops]*, can be switched on or off.
- Every important sound also has a visual sign: clicks show as trembling water, the hum as the rod shaking, the air rush as dust moving toward the door.
- Separate volume sliders for ambience, effects, the Iwang and music.
