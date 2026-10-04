# Animal 3D models

The 3D animals for the games, each kind of animal in its own folder. They are made in code, not pictures, the same
way Stranded makes its animals: rounded parts on joints, coloured flat like a cartoon with a thin dark outline.

- **[HOW-TO-MAKE-3D-MODELS.md](HOW-TO-MAKE-3D-MODELS.md)**: how to make a model so it works with all of the games.
- `zebu-cattle/` is the Zebu herd from the ranch in Bardwell, Texas:
  - `zebu-hd.js`: full detail (Henry is about 140,000 triangles), in two styles: envoi's cinematic look, and What the Map
    Forgot's storybook look (a bigger head, shorter legs, big painted eyes and an ink outline);
  - `zebu-moves.js`: how the full-detail animals move. They walk and trot, graze, lie down and sleep, and have nine moves
    (moo, shake off the flies, swat a fly with the tail, paw the ground, toss the horn, buck, hop, stretch, lick the
    nose). Ears, tail, dewlap and hump swing after the body; they blink, breathe and look about;
  - `makeZebuStorybook` and `makeZebu` in `zebu.js`: the lighter storybook and ranch-game looks, light enough for a
    whole herd.
- `viewer/` has two Henry pages:
  - **Henry in Motion** (`henry-motion.html`): Henry as a cute cartoon (the default) or realistic, with a button for
    everything he does, a camera that walks round with him, and his sounds made in code. Both stand in the ranch pasture,
    by day, at dusk or at night under a big moon (the button at the top changes it), drawn the way envoi's *Colossus in
    the Meadow* draws its wild meadow (`henry-meadow.js`), and filmed through envoi's own film camera (`cinema.js`, copied
    from envoi). The cartoon is the storybook Henry lit softly, the way a 3D cartoon film lights its characters.
  - **Henry Three Ways** (`henry.html`): full detail, storybook and the ranch game, to turn by hand.
  - `tools/build-viewer.mjs --page henry-motion` (or `--page henry`) makes either page one file that works offline
    (`Henry_In_Motion.html`, `Henry_Three_Ways.html`).
- `vendor/three.r128.min.js` is three.js, the 3D library, kept here so everything works with no internet (the same
  copy Stranded uses).

## Checking

Each of these ends with "all good" and leaves pictures in `animal-3d-models/shots/`:

```
node animal-3d-models/tools/build-viewer.mjs --page henry-motion && node animal-3d-models/tools/henry-motion-check.mjs
node animal-3d-models/tools/build-viewer.mjs --page henry && node animal-3d-models/tools/viewer-check.mjs
node animal-3d-models/tools/turnaround.mjs --look henry --model hd --poses stand,graze,lie   # --style storybook too
node animal-3d-models/tools/turnaround.mjs --look tan-cow                                    # the ranch game look
```

- `henry-motion-check.mjs` plays every move and state with both Henrys, tries day, dusk and night, then taps the
  buttons, drags round Henry and pats him like a person would. It makes a contact sheet of each Henry (`shots/motion/`).
- `turnaround.mjs` photographs an animal from every side and in each pose, to check against its character sheet.
- `solve-pose.mjs` works out the joint angles for a pose that touches the ground (lying down, kneeling, grazing) from
  where the joints should rest: `node animal-3d-models/tools/solve-pose.mjs animal-3d-models/tools/poses/lie.json`.
