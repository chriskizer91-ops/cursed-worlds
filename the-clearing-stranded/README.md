# Stranded (The Clearing)

Dagr's survival game. You are a grown-up stranded alone in the North Texas wild in a world where people never existed. You have to find water, make fire, build a camp and live through a whole year.

Play it here: https://claude.ai/artifact/CeSyczAQN8DmkVMw2rAKZM

**The living camp (October 4, 2026):** https://claude.ai/artifact/AZrgkoinHZgrpD8rup55dT. This is a demo of where the game is going.
Dagr wants everything made in code except the backgrounds. So your camp painting is the background, and the survivor,
the fire, the shelter, the animals, the moving grass, the light, the weather and the seasons are all made in code on
top of it. Tap the ground to walk there; tap the fire ring, the shelter or the woodpile to use them. The `living/`
folder has the details.

## What changed from the first version

- **You walk now.** Each place is its own map. Tap the ground to walk there. Tap a thing (the river's edge, a fallen log, the fire ring) to walk up to it and see what you can do with it. You can't win any more by pressing one button over and over.
- **Quests tell a story and say how.** Five chapters: Stranded, Safe water, Food that lasts, A real camp, The long haul. Each step says where to go and what to tap. The journal keeps the list. Side quests open up as you go (mulberries, pecans, the deer herd and more).
- **Skill moments.** Starting a fire with a bow drill, throwing a spear, gigging a frog, shooting an arrow, picking berries and killing a snake are short games of their own. Doing them well makes them work more often. You can skip them and get average luck.
- **Difficulty.** Easy, Medium or Hard, picked when you start. Inside each one the seasons behave the way they really do: spring and fall are the gentlest, summer is hot and dry, winter is the hardest, with cold fronts (northers), wind chill, ice and being wet in the cold.
- **The original** is kept untouched in `versions/the-clearing-2026-09-24.html`.

## Art

Only the backgrounds are pictures. The camp painting is in (`art/places/01-camp.webp`; the original is in
`art/originals/`). The other eight places and five backgrounds are in `docs/art-requests/`: attach `01-camp.png` as
the style reference for each, name each image exactly as its prompt says, and send them back. Big, high-resolution
images are fine; they get shrunk for the game. The game still uses its drawn stand-in art for places that don't have a
painting yet.

## Files

| File | What it is |
|---|---|
| `index.html` | The game. One file, works offline. |
| `versions/` | Older versions, kept as they were. |
| `docs/design.md` | The plan: places, quests, seasons, difficulty, skill moments. |
| `docs/art-requests/` | Image prompts, in batches. |
| `art/` | The paintings: compressed for the game in `places/`, as they came in `originals/`. |
| `living/` | The living world: the painting with everything else made in code. Its demo is the camp. |
| `tools/` | Test players (see below). |

## Checking a change (for whoever works on it next)

```
node tools/autoplay.mjs --games 24 --days 200 --quests   # robot players; must end with "all good"
node tools/autoplay.mjs --trial                          # how each season goes on each difficulty
node tools/phone-check.mjs                               # plays the first quest in a phone-sized browser; "all good"
```

`phone-check` saves screenshots to `shots/`.

For the living camp:

```
node tools/build-living.mjs      # builds living/Stranded_Living_Camp.html
node tools/living-check.mjs      # plays it on a phone-sized screen; must end with "all good"
```
