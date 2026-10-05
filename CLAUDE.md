# CLAUDE.md

## What this is

Games Chris builds from what his son Dagr describes. Each game gets its own folder. The first is
`the-clearing-stranded/` (Dagr calls it Stranded); its own `README.md` says how it works and how to check it.

## Rules

- This is the only repository to write to. These are read-only references; reuse their art, 3D models,
  tools and techniques, but never commit to them: `20-min`, `New-game`, `follow-me-down-witch-way`,
  `building-with-assets-`, `envoi-on-the-longest-night`, `what_the_map_forgot`.
- When copying art or code from one of them, name the source repo and path in the commit message.
- What Dagr wants for a game always outranks anything in another repo. Never bring in another game's
  lore, tone rules or mechanics over his.
- Keep each game's first version untouched in its `versions/` folder.
- Every change ends with something Chris can open on his phone: a playable link or screenshots.
- Chris isn't a programmer. Write anything he reads in plain words.
- When new art is needed, write the image prompts as markdown files in the game's `docs/art-requests/`
  for Chris to generate.

## Stranded

- It is meant to be hard and to teach real survival. Spring and fall are the easiest seasons, summer is
  harder, winter is hardest. Easy, Medium and Hard scale the whole game; the seasons differ inside each.
- No quest or action can be won by pressing one button over and over. Quests must say where to go and what to do.
- Only the backgrounds are pictures (Dagr, October 4, 2026). The survivor, the animals, the fire, the shelter, the
  things you build, the icons, and all light, weather and seasons are made in code (`the-clearing-stranded/living/`,
  three.js r128, the envoi living-battlefield technique). Ask Chris only for background paintings.
- Each painting is traced to the game (`living/traces/`); check a trace with `tools/trace-check.mjs` and the living
  page with `tools/living-check.mjs`, which must end with "all good".
- The robot players (`tools/autoplay.mjs`), the phone test (`tools/phone-check.mjs`) and the hunting and fishing
  test (`tools/minigames-check.mjs`) must all end with "all good" before a push.
- Hunting and fishing are games of their own (`living/hunt.js`, `living/fishing.js`). Their balance is measured
  against the engine's own dice, which the robot players use; keep a careful player near those odds.

## The ranch (the farm game)

- It is Chris's real job on the Zebu ranch in Bardwell, Texas; `the-ranch/README.md` has his day of work in order.
- The cartoon map and cartoon cows in a realistic environment (Chris, October 4 and 5, 2026): Henry and the herd are the
  cartoon models (`makeZebuHD(key, {style: 'storybook', shade: 'soft'})`); the painted map stays the ground at every
  height (close up it keeps its own painted grass and dirt, never real-looking turf); the sky, light, shadows, trees,
  grass, buildings and water are drawn realistically, the way envoi's Colossus in the Meadow draws its meadow
  (`the-ranch/ranch-land.js`, built on `animal-3d-models/viewer/land-kit.js`, which Henry's pasture uses too).
- Only Henry's name is real; the other cattle go by how they look until Chris knows their names.
- The work is done by a cartoon rancher Chris gives jobs to (`ranch-orders.js`, a simple helper inside the game, never an
  outside service), with a realistic tractor (`ranch-crew.js`). New jobs go to him as orders he works out into steps.
- The ranch check (`the-ranch/tools/ranch-check.mjs`) must end with "all good" before a push.
