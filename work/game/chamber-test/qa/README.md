# Playtest

`playtest.mjs` loads the scene in headless Chromium, runs the game at a fixed 60 fps with keys held
(through `window.__ct.sim`), and checks the results with numbers: direction of travel for each key,
facing, camera drift, animation state, root slide, what sits above the pit floor, and the whole door
sequence (echo, live, Iwang, closing).

Run it with the scene served on port 8766 and three.js 0.180.0 installed where the script's `T` path points.
