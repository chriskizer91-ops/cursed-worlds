# The living world

Stranded's places as Dagr asked for them (October 4, 2026): **only the backgrounds are pictures; everything else is
made in code.** Each place is a painting, and a 3D layer on top of it holds the survivor, the fire, the shelter, the
animals, the moving grass, and all the light, weather and seasons. The technique is the one the envoi project uses for
its living battlefields (`envoi-on-the-longest-night`, `living-battlefields/field.js` and the Bramble Colossus's wild
meadow): a locked camera that matches the painter's, with the painting itself brought to life by its shader.

**In the game** since October 4, 2026: every place is drawn this way (the bridge is the `lv...` functions in `index.html`,
next to the walk). The game's walking, menus, quests and exits are unchanged; they read each place's trace.
**The camp demo:** https://claude.ai/artifact/AZrgkoinHZgrpD8rup55dT (private, works on a phone). `Stranded_Living_Camp.html`
here is the same page as one file.

## How it fits together

| File | What it is |
|---|---|
| `stage.js` | `makeStage(opts)`: the painting and the locked 3D camera (looking down at 33 degrees with no perspective, 54.5 painting pixels to the metre, measured from the camp painting's fire ring and the size of a person). The painting writes each pixel's depth from the trace, so 3D things go behind boulders and trees. Its shader does the hour (dawn, day, golden evening, dusk, night), the season (summer drying, fall color, winter's straw grass and brown oak leaves, snow lying in drifts), the wind (leaves moving more the higher up a tree they are, gusts across the grass), cloud shadows, rain darkening the ground with rippling puddles, lightning, mist and firelight. Particles: rain, snow, falling leaves (from the painted trees), pollen, dust, smoke, embers, sparks, fireflies. |
| `trace.js`, `traces/*.js` | Each place traced to its painting (all nine): the 48 x 32 walk grid, the trails, the exits, the build sites, and the shapes of everything that stands up (with where each meets the ground). `tools/trace-check.mjs camp` draws it over the painting to check by eye. |
| `survivor.js` | `makeSurvivor(opts)`: the survivor as the model sheets draw him (`docs/model-sheets/20` to `25j`): blaze-orange cap, denim-blue work shirt with the sleeves rolled, charcoal cargo trousers, tan work boots, a belt with a brass buckle and a knife on the hip, the tan canvas pack with the grey wool bedroll; the partner in olive with a short beard and no pack (`26`). Toon-shaded with an outline. Walks, runs, and holds or plays moves: bow drill, blowing on a coal, working the ground, crouching to gather, snapping a branch, drinking, aiming the rifle, drawing the bow, a spear thrust, warming hands, sitting, asleep in the bedroll, waving, looking out, wiping the brow, stretching, flinching; carries an armload of wood; shivers when cold. |
| `camp.js` | `makeCamp(stage)`: the fire (out, coals, burning, roaring, with its light, smoke and embers), the three shelters (the lean-to with half the teal tarp, the tarp across the boulders, the walled hut with a hide door), and everything the game lets you build, after the sheets (`docs/model-sheets/30` to `49`): grass bed on its log frame, spotted hide, drying rack over its smoky pit, woodpile or thatched wood store, rain catcher over a stone-lined pit, food hang, crates with rope handles, workbench, food cache, stone hearth, lookout, clay pot and bowl. |
| `life.js` | `makeLife(stage)`: tallgrass that sways and parts round whoever walks through it (colored from the painting itself), birds overhead with their shadows, cardinals and sparrows that fly off when you come close, butterflies, a cottontail that bolts for the brush. |
| `beasts.js` | `makeBeast(kind)`: the animals the game tracks (deer, turkey, cottontail, fox squirrel, bison, and the quail, doves and wood ducks that fly), walking and grazing. |
| `things.js` | `makeThing(kind)`: the snare, the fish trap, the seep well and the water bag. |
| `hunt.js` | `Hunt.play(o, done)`: the hunting game, on its own stage over the place's painting. The animal comes out where cover meets the open; press and hold for the sights (they sway, settle, and drift), let go to shoot; three shots. A shot hits what's under the sights as the animal is drawn. Quail flush, doves and ducks fly across, bison come as a herd. `Hunt.practice` is the practice range. |
| `fishing.js` | `Fishing.play(o, done)`: the fishing game, a plain 2D canvas: the place's painting above the water and the water cut away below. Fifteen fish drawn in code (`Fishing.drawFish`, also used by the Journal's catch log), each with its own depth, nibbling, fight and quirks. `Fishing.practice` is the practice pond. |
| `sound.js` | `GameSound`: the rifle, the reel, splashes, the line snapping, quail flushing. Made in code with Web Audio. |
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

- The animals you only meet in encounters (hogs, snakes, coyotes, the bear) in code, for those moments.
- Sound for the walking world, as envoi makes it in code (`living-battlefields/sfx.js`): fire, wind, rain, birds and
  insects. The hunting and fishing games have theirs (`sound.js`).
