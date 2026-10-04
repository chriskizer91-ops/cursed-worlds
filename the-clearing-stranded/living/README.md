# The living world

Stranded's places as Dagr asked for them (October 4, 2026): **only the backgrounds are pictures; everything else is
made in code.** Each place is a painting, and a 3D layer on top of it holds the survivor, the fire, the shelter, the
animals, the moving grass, and all the light, weather and seasons. The technique is the one the envoi project uses for
its living battlefields (`envoi-on-the-longest-night`, `living-battlefields/field.js` and the Bramble Colossus's wild
meadow): a locked camera that matches the painter's, with the painting itself brought to life by its shader.

**The demo:** https://claude.ai/artifact/AZrgkoinHZgrpD8rup55dT (the camp; private, works on a phone).
`Stranded_Living_Camp.html` here is the same page as one file that works offline.

## How it fits together

| File | What it is |
|---|---|
| `stage.js` | `makeStage(opts)`: the painting and the locked 3D camera (looking down at 33 degrees with no perspective, 54.5 painting pixels to the metre, measured from the camp painting's fire ring and the size of a person). The painting writes each pixel's depth from the trace, so 3D things go behind boulders and trees. Its shader does the hour (dawn, day, golden evening, dusk, night), the season (summer drying, fall color, winter's straw grass and brown oak leaves, snow lying in drifts), the wind (leaves moving more the higher up a tree they are, gusts across the grass), cloud shadows, rain darkening the ground with rippling puddles, lightning, mist and firelight. Particles: rain, snow, falling leaves (from the painted trees), pollen, dust, smoke, embers, sparks, fireflies. |
| `trace.js`, `traces/camp.js` | A place traced to its painting: the 48 x 32 walk grid, the trails, the exits, the build sites, and the shapes of everything that stands up (with where each meets the ground). `tools/trace-check.mjs camp` draws it over the painting to check by eye. |
| `survivor.js` | `makeSurvivor(opts)`: the survivor in the game's colors (blaze-orange cap, slate-blue shirt, dark trousers, boots, canvas pack and bedroll; the partner in olive with no pack), toon-shaded with an outline. Walks, runs, and holds or plays moves: bow drill, blowing on a coal, working the ground, picking up, snapping a stick, drinking, sitting, sleeping, waving, looking out, wiping the brow, stretching, flinching; carries an armload of wood; shivers when cold. |
| `camp.js` | `makeCamp(stage)`: the fire (out, coals, burning, roaring, with its light, smoke and embers), the three shelters the game has (the lean-to with half the blue tarp, the tarp across the boulders, the walled hut with a hide door), the grass bed and hide blanket, drying rack and meat, woodpile, rain catcher, food hang and crates. |
| `life.js` | `makeLife(stage)`: tallgrass that sways and parts round whoever walks through it (colored from the painting itself), birds overhead with their shadows, cardinals and sparrows that fly off when you come close, butterflies, a cottontail that bolts for the brush. |
| `walker.js` | `makeWalker(stage, figure)`: tap-to-walk over the walk grid, with the path pulled straight. |
| `merge.js` | Joins the parts of things that never come apart, so a phone draws the scene in about 120 calls. |
| `camp-alive.html`, `.css`, `.js` | The demo page's source. |
| `vendor/three.r128.min.js` | three.js r128, the same version envoi uses, kept here so the game works offline. |

## Checking a change

```
node tools/build-living.mjs                 # builds Stranded_Living_Camp.html
node tools/living-check.mjs                 # plays it on a phone-sized screen; must end with "all good"
node tools/trace-check.mjs camp             # draws the camp's trace over its painting into shots/
```

## A new painting

1. Compress it into `art/places/` (`convert in.png -define webp:lossless=false -quality 80 out.webp`) and keep the
   original in `art/originals/`.
2. Trace it in `traces/<place>.js`, checking with `tools/trace-check.mjs` until the walk grid and the shapes sit on the
   painting.

## Still to do

- Put the living layer into the game itself, place by place as the paintings arrive (the camp first).
- The game's other things in code: the river's fish trap and seep, snares, the workbench, the lookout, and the
  animals you meet (deer, turkey, hogs, snakes, coyotes).
- Sound, as envoi makes it in code (`living-battlefields/sfx.js`): fire, wind, rain, birds and insects.
