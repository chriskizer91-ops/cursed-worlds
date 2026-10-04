# Animal 3D models

The 3D animals for the games, each kind of animal in its own folder. They are made in code, not pictures, the same
way Stranded makes its animals: rounded parts on joints, coloured flat like a cartoon with a thin dark outline.

- `zebu-cattle/` is the Zebu herd from the ranch in Bardwell, Texas. `zebu.js` builds every animal in it.
- `vendor/three.r128.min.js` is three.js, the 3D library, kept here so everything works with no internet (the same
  copy Stranded uses).
- `tools/turnaround.mjs` photographs an animal from every side and in each pose, so it can be checked against its
  character sheet:

```
node animal-3d-models/tools/turnaround.mjs --look henry --poses stand,eat,lie
```

The pictures land in `animal-3d-models/shots/<animal>/`; it ends with "all good".
