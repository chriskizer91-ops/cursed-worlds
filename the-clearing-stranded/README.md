# Stranded (The Clearing)

Dagr's survival game. You are a grown-up stranded alone in the North Texas wild in a world where people never existed. You have to find water, make fire, build a camp and live through a whole year.

Play it here: https://claude.ai/artifact/CeSyczAQN8DmkVMw2rAKZM

**Alive (October 4, 2026):** every place is now one of your paintings, and everything on top of it is made in code:
the survivor and the partner, the animals, the fire, the shelter and everything you build, the moving grass, the
light from dawn to night, the weather and the seasons. The camp and the Cedar Stand use your summer, fall and winter
paintings; the other places are turned toward the season in code. If a phone can't do 3D, the game falls back to its
own pixel drawing on top of the painting. The camp on its own, to play with: https://claude.ai/artifact/AZrgkoinHZgrpD8rup55dT

## What changed from the first version

- **You walk now.** Each place is its own map. Tap the ground to walk there. Tap a thing (the river's edge, a fallen log, the fire ring) to walk up to it and see what you can do with it. You can't win any more by pressing one button over and over.
- **Quests tell a story and say how.** Five chapters: Stranded, Safe water, Food that lasts, A real camp, The long haul. Each step says where to go and what to tap. The journal keeps the list. Side quests open up as you go (mulberries, pecans, the deer herd and more).
- **Skill moments.** Starting a fire with a bow drill, throwing a spear, gigging a frog, shooting an arrow, picking berries and killing a snake are short games of their own. Doing them well makes them work more often. You can skip them and get average luck.
- **Difficulty.** Easy, Medium or Hard, picked when you start. Inside each one the seasons behave the way they really do: spring and fall are the gentlest, summer is hot and dry, winter is the hardest, with cold fronts (northers), wind chill, ice and being wet in the cold.
- **The original** is kept untouched in `versions/the-clearing-2026-09-24.html`.

## Art

All the art you sent is in (October 4, 2026):

- **The nine places**, and **summer, fall and winter** for the camp and the Cedar Stand: the backgrounds you walk on.
  Compressed for the game in `art/places/`, kept as they came in `art/originals/`. Each one is traced to the game in
  `living/traces/`: where you can walk, what you walk behind, the trails, the ways out, and where each thing you use is.
- **The survivor and partner sheets, the shelter stages and the camp things**: the game makes these in code, so they
  are the model sheets the code was built to match. They're kept, smaller, in `docs/model-sheets/`.

If you'd like more seasons, the other seven places in summer, fall and winter would replace the code's own season
colors there (same names as the camp's: `03-oak-woods-summer.png` and so on).

## Files

| File | What it is |
|---|---|
| `index.html` | The game. One file, works offline. |
| `versions/` | Older versions, kept as they were. |
| `docs/design.md` | The plan: places, quests, seasons, difficulty, skill moments. |
| `docs/art-requests/` | Image prompts, in batches. |
| `art/` | The paintings: compressed for the game in `places/`, as they came in `originals/`. |
| `living/` | The living world: the painting with everything else made in code, and each place's trace. |
| `docs/model-sheets/` | The character, shelter and camp sheets the code matches. |
| `tools/` | Test players (see below). |

## Checking a change (for whoever works on it next)

`index.html` is the game, and loads `living/` and `art/places/` beside it. `Stranded.html` is the same game as one file
that works offline (made by `tools/build-game.mjs`; it isn't kept in git, it's rebuilt).

```
node tools/autoplay.mjs --games 24 --days 200 --quests   # robot players; must end with "all good"
node tools/autoplay.mjs --trial                          # how each season goes on each difficulty
node tools/build-game.mjs                                # builds Stranded.html
node tools/phone-check.mjs                               # plays the first quests in Stranded.html on a phone screen; "all good"
node tools/places-check.mjs                              # every painted place: its spots and ways out can be reached; "all good"
node tools/living-tour.mjs                               # screenshots of every place, the seasons and night; "all good"
node tools/trace-check.mjs camp                          # draws one place's trace over its painting, to check by eye
```

Screenshots go to `shots/`. The camp demo on its own: `node tools/build-living.mjs`, then `node tools/living-check.mjs`.
