# Stranded (The Clearing)

Dagr's survival game. You are a grown-up stranded alone in the North Texas wild in a world where people never existed. You have to find water, make fire, build a camp and live through a whole year.

Play it here: https://claude.ai/artifact/CeSyczAQN8DmkVMw2rAKZM

## What changed from the first version

- **You walk now.** Each place is its own map. Tap the ground to walk there. Tap a thing (the river's edge, a fallen log, the fire ring) to walk up to it and see what you can do with it. You can't win any more by pressing one button over and over.
- **Quests tell a story and say how.** Five chapters: Stranded, Safe water, Food that lasts, A real camp, The long haul. Each step says where to go and what to tap. The journal keeps the list. Side quests open up as you go (mulberries, pecans, the deer herd and more).
- **Skill moments.** Starting a fire with a bow drill, throwing a spear, gigging a frog, shooting an arrow, picking berries and killing a snake are short games of their own. Doing them well makes them work more often. You can skip them and get average luck.
- **Difficulty.** Easy, Medium or Hard, picked when you start. Inside each one the seasons behave the way they really do: spring and fall are the gentlest, summer is hot and dry, winter is the hardest, with cold fronts (northers), wind chill, ice and being wet in the cold.
- **The original** is kept untouched in `versions/the-clearing-2026-09-24.html`.

## Art

The game uses drawn stand-in art for now. The painted pictures will replace it.

The image prompts are in `docs/art-requests/`. Read `README.md` there first, then start with batch 1. Make `01-camp.png` first, using the Thareia meadow painting (`walk-top-meadow.png`) as the style reference, and check you like it before doing the rest. Name each image exactly as its prompt says and send them back. Big, high-resolution images are fine; they get shrunk for the game.

## Files

| File | What it is |
|---|---|
| `index.html` | The game. One file, works offline. |
| `versions/` | Older versions, kept as they were. |
| `docs/design.md` | The plan: places, quests, seasons, difficulty, skill moments. |
| `docs/art-requests/` | Image prompts, in batches. |
| `tools/` | Test players (see below). |

## Checking a change (for whoever works on it next)

```
node tools/autoplay.mjs --games 24 --days 200 --quests   # robot players; must end with "all good"
node tools/autoplay.mjs --trial                          # how each season goes on each difficulty
node tools/phone-check.mjs                               # plays the first quest in a phone-sized browser; "all good"
```

`phone-check` saves screenshots to `shots/`.
