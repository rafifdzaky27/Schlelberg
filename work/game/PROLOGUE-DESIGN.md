# Prologue design: "The Door Without Wind"

Covers Chapters 1 and 2 of the manuscript. Canon is fixed. Every line of dialogue below comes from `work/manuscript/01-the-kings-measure.md` or `02-the-door-without-wind.md` unless it is marked **[game]**.

Target length: 15 to 20 minutes on a first play.

---

## 1. Design goals

1. **Feel the book's first lesson.** Strength does not win here. Noticing things, knowing water and working with another person do.
2. **The player lives inside canon.** They never choose a different outcome. They choose where to look, when to act and how to reach each canon moment.
3. **Names over numbers.** The player learns names as Tobious does: Mariya, Samon, Darran, Lios. The dead guard stays "the guard", as in the book.
4. **The Iwang is frightening because it follows rules.** The player learns those rules by watching them.

---

## 2. Core mechanics

### 2.1 Controls (keyboard and mouse only)
| Input | Action |
|---|---|
| WASD or arrow keys | Walk. "Up" means away from the camera. |
| E | Look, use, hold, rhythm |
| Space | Timed inputs (the spear sweep, the wedge) |
| Tab | Open the ledger |
| Mouse | Story cards (S1 to S3), the ledger, menus. Click also works for E prompts. |
| Esc | Pause menu |

### 2.1b Movement
- When the camera cuts, the old direction stays in effect until the player lets go of the key. This stops Tobious from turning around by accident at every cut.
- Walk only. There is no run button. Tobious runs only in scripted moments.
- Water slows him by 20 percent and makes splash sounds.

### 2.2 Interaction types
| Type | Input | Used for |
|---|---|---|
| **Look** | E near a marked object | Details that fill the ledger, such as the measure's extra band or the line on the step |
| **Use** | E | Single actions, such as pulling a shard or picking up the rod |
| **Hold** | Hold E, a ring fills | Slow effort, such as clearing mud or hauling a rope |
| **Rhythm** | E pressed on beat markers | Working with Samon: lift, wedge, release |
| **Timed** | Space inside a highlighted window | The spear sweep across the Iwang's collar |
| **Guide** | Walk while an NPC follows | Taking Lios to the wall |

Interaction prompts appear as small painted labels near the object, never as floating arrows.

### 2.3 The injured right hand
- The spear shaft hits Tobious's right wrist in beat S1. From then on the HUD shows a small hand icon, and the right hand is shaded.
- **Hold** actions that need grip show "left hand". They take 30 percent longer.
- Some moments force the right hand in canon, such as the rod in beat U7. There the grip fails on schedule. This is scripted, not a fail state.
- The icon is the only permanent HUD element. There is no health bar.

### 2.4 The ledger (names, not numbers)
- Opened with Tab. It is drawn as Mariya's waxed tally board.
- **People:** a name appears only when Tobious learns it in the story. Before that the entry says "the water boy" or "the overseer".
- **Things noticed:** Look interactions add a short quote from the book, with its chapter. For example: *"The rim used to end there. You've added another band."* (Chapter 1).
- The ledger never changes outcomes. It records what Tobious knows, and in later chapters it becomes Mariya's roll.

### 2.5 Canon-safe failure ("That is not how it went")
- Tobious cannot die, and nobody else's fate can change.
- If the player misses a critical timing, for example letting the Iwang reach Samon too early, the screen desaturates, one line of text appears: **"No. That is not how it went."** [game], and play rewinds 5 to 10 seconds to the last micro-checkpoint.
- No penalty, no counter. The idea is memory correcting itself.
- After three rewinds at the same point, an assist turns on: timing windows double and the prompts show their input. The player can switch assist on or off at any time in the menu.

### 2.6 Iwang rules (the gradient)
- The open threshold creates a **gradient field**. Its strength grows with how wide the opening is and falls with distance from it.
- **Coherence** is how solid the Iwang is. It follows the local gradient.
  - **High:** solid body, casts a shadow, can strike, collar knot visible.
  - **Low:** edges turn to smoke, light passes through, it cannot strike.
- It thins through things instead of breaking them, like the wicker basket in U8.
- **Strike cycle:** wind-up of about 1 second (limbs gather, the collar turns dark and solid), the strike, then a recovery. The collar is exposed only during wind-up and recovery.
- **Signals the player can learn:** dust moving against the draft, mineral clicking, water trembling, lamp flames leaning.
- When the current closes, it follows the current back. It does not flee from Tobious.

### 2.7 Accessibility
- Subtitles on by default, with a speaker name and adjustable size.
- Assist mode for all timing (see 2.5).
- Every sound cue has a visual cue too: the clicks show as trembling water, the hum as a shake on the rod.
- Reduced flashing option for the threshold light.
- Hold actions can be switched to toggle.

---

## 3. Story flow

```
S1 Granary yard ──► S2 Behind the granary ──► S3 Ancestor terrace
                                                     │
  ┌──────────────────────────────────────────────────┘
  ▼
U1 Stair and passage ─► U2 Samon's knot ─► U3 The drain ─► U4 The line on the step
                                                                │
  ┌─────────────────────────────────────────────────────────────┘
  ▼
U5 The clamp ─► U6 The echo (41 s) ─► U7 After the echo ─► U8 The live opening
                                                                │
  ┌─────────────────────────────────────────────────────────────┘
  ▼
U9 Lios ─► U10 Samon returns ─► U11 The slab ─► U12 Collapse
                                                    │
  ┌─────────────────────────────────────────────────┘
  ▼
E1 The surface ─► End card
```

Checkpoints: the start of every beat, plus micro-checkpoints inside U8, U9 and U11.

---

## 4. Beats in detail

Each beat lists: place, camera, what the player does, what happens in canon, dialogue, and assets needed.

### How the story cards work (S1 to S3)
The surface opening is told with **painted story cards**, not 3D. Decision: option B.

- Each card is one painting in the visual-bible style, generated with ChatGPT from prompts I write.
- Every painting is split into 3 or 4 depth layers: sky, background, figures, foreground. The camera drifts slowly across them, so the image has depth without being 3D.
- Book text appears in a caption box at the bottom, one line at a time. Click or press E to move on.
- Some cards have **hotspots**. Hovering highlights a detail. Clicking adds a quote to the ledger or starts the next moment.
- Sound runs under the cards exactly as in 3D: wind, the yard, soldiers' boots, grain pouring.
- The right-hand injury, the ledger and the rewind all begin here, so the cards teach the controls.

### S1. Granary yard (Chapter 1): 5 cards
| Card | Painting | Player | Text (from the book) |
|---|---|---|---|
| S1-1 | Wide view: Aras terraces falling to the bay, the granary, soldiers arriving with donkeys, the red cloth of Telassar on the far ridge | Click to continue | *"On the ninth day of the occupation, the soldiers came for the seed."* |
| S1-2 | Mariya at the jars with her pebble board, Tobious beside her, the officer in his bronze corselet | Hotspots: the pebble board, the boy with the rope, the scribe | *"Fourteen jars. Eleven for the palace. Three for sowing after the rains."* |
| S1-3 | Close on the wooden measure in a soldier's hand, the dark line around the wood | **Required hotspot:** the rim. Tobious speaks. | *"That's too deep."* / *"Your measure. The rim used to end there. You've added another band."* |
| S1-4 | A soldier dragging the jar with the scratched leaf toward the threshold | **Hold E** on the jar handle. It always fails. If the player waits, it happens after 8 seconds anyway. | *"Tobious did not think of the seven spears. He saw a crack running down beneath the leaf."* |
| S1-5 | Close on the paving: one barley grain between two stones, an ant crossing it | Click. The hand icon appears (right wrist injured). | *"You'll start now. Under the hill. Until the work is done."* / *"We still have two. Help me keep them."* |

### S2. Behind the granary (Chapter 1): 2 cards
| Card | Painting | Player | Text |
|---|---|---|---|
| S2-1 | Mariya cleaning blood from Tobious's lip, a bowl of water turning red | Click through the dialogue | *"You gave them my name?"* / *"Without asking me."* / *"He would have taken it from you."* / *"I saw it, Tobi."* |
| S2-2 | His hands breaking the flattened half loaf | **Use** the bread. The card changes: Mariya looks at the smaller piece and swaps it for his. | *"They ate without speaking."* |

### S3. Ancestor terrace (Chapter 1): 1 card
| Card | Painting | Player | Text |
|---|---|---|---|
| S3-1 | Soldiers lowering the wrapped statue of the woman with the bowl beside the well, the stairs going down between two old walls | Hotspot: the pale circle where she stood. Then click the stairs to go down. | *"A guard pushed him between the shoulders with a spear shaft. 'Down.'"* |

The transition from S3-1 into U1 is the moment the game becomes 3D. The painting dissolves into the 3D stair seen from the same angle.

### U1. Stair and passage (Chapter 1)
- **Place:** steps down between old walls, cooler air, lamp oil.
- **Cameras:** C-U1a top of the stair looking down, C-U1b along the passage.
- **Player:** walks down. Six Aras workers are clearing rubble. The light shifts from day to lamp.
- **Assets:** stair and passage environment, workers x3 to x4 (worker body variants), baskets, lamps.

### U2. Samon's knot (Chapter 1)
- **Canon:** Samon, fastening a rope around a block. "What's wrong with your hand?" / "Someone hit it." He offers the unfinished knot. "Use the other one."
- **Player:** **Hold E** (left hand) to finish the knot. A close shot of the hands.
- **Ledger:** Samon added by name.

### U3. The drain (Chapter 1)
- **Place:** the circular flooded chamber. Water ankle-deep. The lower opening beneath the slab in the center.
- **Cameras:** C-U3a high wide shot of the chamber, C-U3b low at the wall and drain.
- **Canon:** Darran with his three-wicked lamp: "You know the channels?" / "Get it out."
- **Player puzzle (reading water):**
  1. Look at the walls. Moss fills the joints, but the lower stones are clean and worn. The ledger notes the clean stones as flow marks.
  2. Follow the water's faint movement, drawn as drifting grit, to the drain.
  3. **Use** to pull the pottery shard free. A current tugs at his ankles.
  4. When Darran puts a foot on the steps, a **Look** prompt on the dark water line unlocks Tobious's warning: "The water stood higher than the opening..." Darran waits. This is optional, but if the player misses it, Tobious says it anyway after a delay.
  5. **Hold E** to work the rod through the channel while Samon holds the lamp. Wrist pain slows him and he changes grip. That is canon.
- **Assets:** chamber, water shader, drain grate, shard, rod, mud baskets.

### U4. The line on the step (Chapter 1)
- **Canon:** as the water falls, a line appears on the lowest step. Darran checks his hide drawing. "The rest of you. Out." / "He stays."
- **Player:** **Look** at the line. The ledger notes "Too straight for a joint in the stone."
- **Staging:** Samon pauses at the entrance, then follows the others. Only Tobious, Darran and the guard on the stair remain.
- **Dialogue:** "What's down there?" / "Storage." / "Storehouse doors usually have handles."

### U5. The clamp (Chapter 1)
- **Place:** the black threshold in its stone frame. Mud on its lower edge. The recess with the green metal clamp, one end broken.
- **Camera:** C-U5 close three-quarter view of the frame, lamp from the left.
- **Player:**
  1. **Hold E** to clear the recess with the corner of his clothes.
  2. **Use** the rod on the clamp. A hum travels into the rod (a visible shake and a low tone). He lets go, and the rod drops into the water. Canon.
  3. Darran: "Pick it up." / "There's something inside." / "I told you to clean it."
  4. The guard shifts his spear. **Hold E** to draw out the packed mud. The scraped knuckles leave a smear of blood on the recess edge. Scripted.
- **Canon result:** the hum stops. The water goes still. A line of light appears on the black surface at the height of Tobious's face.

### U6. The echo (Chapter 1, 41 seconds)
- **Duration:** exactly **41 seconds**, the length the root records in Chapter 12.
- **Camera:** C-U6a behind Tobious, looking through the threshold. C-U6b reverse shot of the future Tobious.
- **Visual:** the light widens into pale sky, towers, roads with no pillars, a silver carriage. It is rendered live in a second scene. The lamp's three flames stretch toward the opening with no wind. Ripples in the water stop at the black line.
- **Player can:** walk forward into the water toward the light, as in canon. He cannot cross.
- **The future Tobious:** short hair, a scar under the left eye, close-fitted clothes, blood between the fingers at the right ribs. The roadway bows and small figures fall from it.
- **Dialogue:** "Don't go with him." / "Tobi. Listen. They aren't looking for stores." / "That door is what they came for. And now they know you can open it."
- **Assets:** a future-Tobious variant (the Tobious model with a short-hair and field-clothes texture set, or a separate Tripo model later), a Veyr skyline built in Blender, skyway, carriage.

### U7. After the echo (Chapter 2 opening)
- **Canon:** the image thins and goes black. Darran: "Tell me what he said." Lios drops his jug at the bend. It breaks.
- **Player:** **Use** the rod on the black surface. It strikes something hard. The wrist gives, and the rod falls. Canon, forced right-hand grip.
- **Canon:** "A picture," the soldier says. Darran names the missing second contact. The guard: "Darran. We should fetch the captain." Tobious learns the name. Ledger: Darran added.
- **Player:** tells Lios "Go up." (a **Use** prompt on the boy). Lios doesn't move, because the soldier blocks the stair. Canon.

### U8. The live opening (Chapter 2)
- **Canon:** Darran pushes the damaged clamp into its recess, braced by the guard's spare spear. Metal clicks. Pressure in the teeth (low rumble, screen compression). The black surface bends inward. Lamp flames lean. **This time the water moves.**
- **Visual:** air draws at his tunic. Water flows toward the threshold. A narrow place of pale walls, lit without flame. Smell text in the ledger: "hot stone after rain, spoiled salt, something sweet beneath it".
- **The Iwang arrives:**
  1. A shape against the pale wall, then a second set of limbs unfolding.
  2. A hand with too many joints and no nails presses on the threshold, thins like smoke, then gathers.
  3. A long shoulder. Where a chest should be, the bright wall shows through, distorted like water.
  4. It turns its head toward the boy.
- **Canon:** the guard lets the clamp go and thrusts. Bronze passes through the hollow middle and rings on the far wall. The creature closes around the shaft. Its outline hardens. The collar knot appears, dark and ridged. Bronze scrapes it. The smell of burned salt. It strikes. The hide shield folds. The guard is driven against the stair.
- **Player:** this is the tutorial for Iwang signals. The camera holds while the rules play out in front of the player: thinning, gathering, the collar.
- **Micro-checkpoint** at the Iwang's first step onto the chamber floor.

### U9. Lios (Chapter 2)
- **Goal:** get Lios off the lower stair and against the wall.
- **Player:**
  1. Walk to Lios, keeping to the side of the chamber where the Iwang is thin (far from the gradient). The dust and water signals show the safe line.
  2. **Use** on the rope: it is caught under the fallen guard's boot. Lios falls. Tobious stops pulling. Canon.
  3. **Hold E** (left hand) to work the swollen knot. A close shot of the hands.
  4. Canon dialogue: "Your name." / "What do they call you?" / "Lios." / "Lio. Stay against the wall."
  5. **Hold E** to loop the rope around a stone projection and haul it free of the boot. The right hand fails halfway, so he winds the rope on his left forearm.
  6. **Guide:** Lios follows past the fallen man.
- **Canon, sound only:** the soldier thrusts again. The spear finds the collar. Dark grains spray the steps. Tobious does not see the moment the guard dies. He hears the spear fall. The screen does not show the death. The camera stays on Lios.
- **Fail handling:** if Tobious walks into the solid zone near the Iwang, it winds up. If it strikes, rewind (2.5).
- **Ledger:** Lios added by name.

### U10. Samon returns (Chapter 2)
- **Canon:** Darran tries to wrench the clamp free. His lamp falls into the water, one wick still burning. The opening widens a finger's breadth. He flees up the steps. Samon and two workers come running with baskets and ropes. "Out. Seal it." / "How?"
- **Player:** **Look** at the rope Samon tied around the slab an hour earlier, running through a notch to a wooden lever. The ledger notes: "The beam can shift the slab a little. The clamp sits under its near corner."
- **Dialogue:** "Samon. The rope." / "Leave it." / "The metal is keeping the door open."
- **Canon:** Samon decides to believe him. The workers carry Lios up. Darran runs after them.
- **The Iwang enters the chamber.** It pauses by the lamp. Light through its open middle throws moving bars on the stones. It attends to the two men and the rope.
- **Dialogue:** "Where does the drain lead?" / "Down the west channel." / "Then if the roof comes?" / "The water goes that way." / "I meant us."

### U11. The slab (Chapter 2)
The central sequence. Four rounds in canon order. Each has a micro-checkpoint.

| Round | Canon | Player input | Iwang |
|---|---|---|---|
| 1 | Both haul. The slab moves a thumbnail's width. | **Rhythm:** press E on each pull marker with Samon's call | Moves closer. Samon throws his basket. It thins through the weave, then turns heavy near the stone. Scripted. |
| 2 | Tobious takes the lever with his left hand, foot braced, pulls until the wood bends. Green metal appears. "A stone. Put it under." Samon wedges. | **Hold E** on the lever, left hand. Keep the ring inside a tension band by easing off and pulling (lift, wedge, release, lift again). | Strikes Samon's back. One limb touches his tunic and leaves a hole. Scripted, no fail. |
| 3 | The creature gathers. Tobious drops the beam, grabs the guard's spear from the water with his left hand, sweeps the point across the collar. | **Timed:** press Space when the collar turns solid during wind-up | Recoils from the contact. |
| 4 | "Now." Samon pulls alone. Tobious shoves the stone into the new space. The slab drops. The clamp snaps out "like a jar cracking at the kiln". | **Timed:** press E when the slab lifts to its highest point | Air rushes down the passage and stops. |

- **Round 3 fail:** a missed window means the Iwang strikes Samon. Rewind to the start of round 3.
- **Result:** the light narrows. The Iwang follows the vanishing current back through the doorway, drawing itself along the wall. For a moment its collar knot hangs in the passage, solid enough to cast a shadow. Then it slides under the slab into the shrinking seam.

### U12. Collapse (Chapter 2)
- **Cutscene:** the floor lurches. Samon throws himself at Tobious and drives him clear. Stone falls. A beam from the old ceiling pins Samon's left leg below the knee. Darkness, the dropped lamp, a thin, shrinking line of light under the lower stone that narrows to nothing.
- **Player:** **Use** to crawl to Samon. "Don't pull me." The player can try **Hold E** on the beam. The right hand won't close, and the prompt fades. Canon.
- **Player:** **Use** to shout up the stair for poles, wedges and someone who can set a crushed limb. "He could name what was needed. That was the only strength he had left." appears as a text line.
- **Canon:** Darran returns with soldiers. They raise the beam a little at a time. The screen fades during the lift.

### E1. The surface (Chapter 2 ending)
- **Place:** the upper passage, then the yard at dusk.
- **Player:** walks past Lios, who sits against the wall with the pieces of his jug between his knees. The rope has been cut from his neck. **Use** on Lios:
  - Lios: "It was full." Tobious: "I know."
- **Canon:** Darran: "The boy goes to his household. The injured man gets a litter. This one stays." Two soldiers take Tobious by the arms.
- **Final shot:** the empty place beside the well where the statue stood. Evening over the bay. Women coming from the well with vessels on their hips.
- **End card:** *"He had closed a door. He had no idea how long it would stay closed."*
- **Ledger summary screen:** the names he learned, what he noticed and the guard, unnamed.

---

## 5. Cameras (summary)
| ID | Room | Type |
|---|---|---|
| S1 to S3 | Surface | Painted story cards with a slow parallax drift, no 3D camera |
| C-U1a, b | Stair, passage | High down the stair, along the passage |
| C-U3a, b | Chamber | High wide, low at the drain |
| C-U5 | Threshold | Close three-quarter |
| C-U6a, b | Echo | Through the threshold, reverse on the future self |
| C-U8 | Live opening | Low wide, threshold on the right third |
| C-U9 | Lios | Mid shot along the stair |
| C-U11a, b | Slab | Side view of the lever, close on the collar for round 3 |
| C-U12 | Collapse | Handheld-style cutscene camera |
| C-E1a, b | Surface | Passage, then the wide dusk shot |

---

## 6. Sound
The full sound plan is in `SOUND-DESIGN.md`. There is no voice acting. All speech is subtitled.

---

## 7. Cast and asset list for the prologue
| Character | Where | Source |
|---|---|---|
| Tobious (farmer) | U1 to E1, and the cards | Tripo (3D), ChatGPT paintings (cards) |
| Future Tobious | U6 | Tobious model with short hair and a field-clothes texture |
| Mariya | S1, S2 cards only | ChatGPT paintings. **No Tripo model needed for the prologue.** |
| Samon | U1 to U12 | Tripo |
| Darran | U3 to U10, E1 | Tripo |
| Lios | U7 to U9, E1 (and the S1 card) | Tripo |
| Telassari guard | U1 to U9, E1 | Tripo |
| Aras workers (x3 to x4) | U1, U3, U10 | Samon or Darran body with new textures |
| Iwang | U8 to U11 | Tripo |

Officer, scribe, donkeys and the statue scene appear only in the cards, so they need no 3D models.

Props made in Blender: the rod, the shard, the three-wicked lamp, the hide drawing and its tube, spears, the hide shield, the jug and its pieces, baskets, rope, the slab, the lever, the wedge stone, the clamp.

Story card paintings (ChatGPT): 8 cards, S1-1 to S3-1, each delivered as a full painting plus separated layers.

---

## 8. Decisions (fixed on 29 September 2026)
1. **Surface scenes:** option B, painted story cards for S1 to S3. The 3D game starts at U1.
2. **Rewind line:** "No. That is not how it went." Approved.
3. **Controls:** keyboard and mouse only.
4. **The guard's death:** sound only, as in the book.
5. **Ledger:** quotes the book, with chapter numbers.
