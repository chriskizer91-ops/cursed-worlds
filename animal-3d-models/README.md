# Animal 3D models

The 3D animals for the games, each kind of animal in its own folder. They are made in code, not pictures, the same
way Stranded makes its animals: rounded parts on joints, coloured flat like a cartoon with a thin dark outline.

- **[HOW-TO-MAKE-3D-MODELS.md](HOW-TO-MAKE-3D-MODELS.md)**: how to make a model so it works with all of the games.
- `zebu-cattle/` is the Zebu herd from the ranch in Bardwell, Texas, in three looks:
  - `zebu-hd.js`: full detail (Henry is about 140,000 triangles), for close-ups;
  - `makeZebuStorybook` in `zebu.js`: the What the Map Forgot storybook look;
  - `makeZebu` in `zebu.js`: the ranch game's cartoon, light enough for the whole herd.
- `viewer/`: the Henry page, all three looks to turn by hand. `tools/build-viewer.mjs` makes it one file
  (`Henry_Three_Ways.html`), and `tools/viewer-check.mjs` tries it on a phone-sized screen.
- `vendor/three.r128.min.js` is three.js, the 3D library, kept here so everything works with no internet (the same
  copy Stranded uses).
- `tools/turnaround.mjs` photographs an animal from every side and in each pose, so it can be checked against its
  character sheet:

```
node animal-3d-models/tools/turnaround.mjs --look henry --model hd --poses stand,eat,lie   # --model game|hd|storybook
```

The pictures land in `animal-3d-models/shots/<animal>/`; it ends with "all good".
