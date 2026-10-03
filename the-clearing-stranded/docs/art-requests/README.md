# Art for Stranded (The Clearing)

These are the pictures the game needs, written as prompts ready to paste into your image tool.

## How to use this

1. Open a batch file and go down it in order.
2. Paste each prompt (the quoted block under each heading) into your image tool.
3. Attach the picture each prompt names:
   - **[match style: file]**: attach that picture as the style reference.
   - **[edit: file]**: attach that picture and ask the tool to change it, keeping everything else.
   - **[also attach: file]**: attach this one too (usually so a person or an animal looks the same every time).
4. Save each picture with the exact file name the prompt gives, like `01-camp.png`.
5. Zip them and send the zip back. High resolution is fine; I'll compress everything for the game.

Each prompt is marked **Must** (the game needs it) or **Nice** (it makes the game better, but can wait). It helps to
make each picture two to four times and keep the best one.

## What to do first

| Order | File | What it is | How many | Priority |
|---|---|---|---|---|
| 1 | `batch-01-places.md` | The nine places you walk around, in late spring | 9 | Must |
| 2 | `batch-02-survivor.md` | The survivor (and the partner for the two-person game): model sheets, walking, and poses for each job | 20 | Must |
| 3 | `batch-03-camp.md` | The shelter as you build it, and the things you build or own | 23 | Must (one Nice) |
| 4 | `batch-04-seasons.md` | The nine places in summer, fall and winter | 27 | Must |
| 5 | `batch-05-animals.md` | Animals on the map, and the pictures for meeting them | 28 | Map animals Must, encounter pictures Nice |
| 6 | `batch-06-moments.md` | The title picture, the skill-moment backdrops, and the item icons | 25 | Title and backdrops Must, icons Nice |

Start with **01-camp.png** and stop there until you like it. Every picture after it uses it as the style reference,
so it sets the look of the whole game.

## The style reference

For `01-camp.png`, attach **`walk-top-meadow.png`**, the Thareia meadow walking map (the bright daylight meadow
seen from above, with the big oak and the dirt path). If you need to find it again, it's in the New-game repo on
the branch `claude/tender-babbage-4wiplk`, in `thareia/art-in/scenes/`. The prompt tells the tool to copy only its
style, not what's in it: this world has never had people, so no walls, fences or paths made by anyone.

After that, every prompt says **[match style: `01-camp.png`]**, so all the places, people, animals and things
match the first approved picture.

## Things that hold for every picture

- **Always daytime**, with the sun high in the upper left. The game darkens the pictures itself for dusk and night.
- **Nothing made by people** in any place: no roads, fences, buildings, ruins or trash. If one sneaks in, try again.
- **No people, animals or text** in the place pictures. The game puts the survivor and the animals on top.
- **No fruit on the fruit plants** (berries, mulberries, plums, grapes, persimmons, prickly pear). The game draws the
  ripe fruit itself, at the right time of year.
- **No snow.** The game adds it when it snows.
- **See-through backgrounds** for single objects and animals. If your tool paints a checkerboard instead of real
  transparency, ask for a flat light gray background (#D9D9D9) instead; I can remove that.

## File names

| Numbers | What |
|---|---|
| `01` to `09` | The nine places (`01-camp.png`, `02-cedar-stand.png`, and so on) |
| `01b` to `01d` | The camp with the lean-to, with the roof, with the walls |
| `01-camp-summer.png` and so on | Each place in summer, fall and winter |
| `20` to `27d` | The survivor and the partner |
| `30` to `49` | Things you build or own |
| `50` to `62` | Animals on the map |
| `70` to `84` | Encounter pictures |
| `90` to `94` | The title picture and the skill moments |
| `100` to `119` | Item icons |

## If a painting moves things

Every place prompt lists where things go, as *percent across* from the left and *percent down* from the top. The
game puts its walkable ground, its exits and the things you tap in the same spots. If a painting moves a trail or a
tree a lot, that's fine if you like the picture: keep it, and just tell me what moved. The game gets re-traced to
each painting.

When the game's own drawing of a place is ready, a screenshot of it makes a good extra attachment: it shows the tool
where everything goes.
