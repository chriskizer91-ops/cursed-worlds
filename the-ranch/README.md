# The ranch (working name)

A game about working a Zebu cattle herd on a ranch in Bardwell, Texas, based on Chris's real job there.
The name of this folder is only a placeholder until the game has a real one.

The animals are kept in [`animal-3d-models/zebu-cattle/`](../animal-3d-models/zebu-cattle/).

## Try it

The first playable look (October 4, 2026) is the ranch from the sky, in 3D. The link is in the chat where it was made;
`The_Ranch.html` is the same page as one file, built with `node the-ranch/tools/build.mjs` (it isn't kept in the
repository, because it's rebuilt every time).

- Zoomed all the way out you look straight down at your map of the ranch. Drag to move, pinch to zoom, twist with two
  fingers to turn.
- Zoom in and the view tips over, and the trees, the houses and sheds, the barn, the fences and the things you work
  with stand up out of the map around you, with a little bounce. Pull back out and they sink back into the painting.
- The herd (Henry and the five others) grazes along the cow trails, wanders, and lies down now and then. Henry is the
  head of the herd: he decides where to go, and the others follow him (the calf keeps by its mother).
- **Today's work** (top left) has the first four jobs of your day: put out a bale in the hay ring (the herd walks in
  along the trails to eat), fill the troughs up by the house in the bottom-left corner (thirsty cattle come to drink),
  let the chickens out of the coop by the same house and feed them, and
  look the cattle over (tap each one to see it up close, walk round it, and make it walk, eat, lie down or stand).
- **1×** makes time go four times faster. **Whole ranch** goes back to the full map.

Signs for the bull pens, the fence line, the salt, the pond, the barn and the house are there, but those jobs come later.

## A day on the ranch (Chris, October 4, 2026)

This is the real job, in the order Chris does it. The game is built from it.

1. Feed the cows a bale of hay, using the tractor.
2. Fill their water troughs.
3. Let the chickens out and feed them.
4. Look the cows over.
5. Walk the fence line.
6. Fix the fence.
7. Take care of any animal that needs it: check on the pregnant mamas and the newborn calves.
8. At some times of year, set out salt.
9. The rowdy bulls are kept in pens and fed separately, or handled differently.

## The land

From Chris's satellite picture (`reference/ranch-satellite-marked.jpg`, his marks on it):

- **Yellow is the edge of the property.** It's a long wedge: a plowed field along the west (left) side, the
  railroad along the east (right) side running corner to corner, the road along the bottom, and a narrow point at
  the top.
- **The cow trails** run across the pasture and all lead back to where the hay is set out, so they spread out from
  that spot: the bare dirt by the first house, in the bottom-left corner.
- **Blue circle: the pond**, near the bottom right.
- **Blue line: a little creek**, running down to the road west of the pond.
- **Three homes**, each with its own outbuildings, along the bottom.
- The muddy pond across the railroad is outside the property.

The street address on the satellite picture is covered, because this repository is public.

## How the map works

- `map/tiles/`: the six pieces of the map from the sky (the `straight-down` set), compressed for the game.
- `map/trace.js`: where the cattle can walk, made by `tools/make-trace.mjs`. It reads the painting's colours (the
  dirt of the trails, the grass, the dark green of the trees) and adds what was measured by hand: the pasture's edge,
  the buildings, the yards, the pond, the fences and the places of the day's work. The cattle prefer the trails, the
  way real cattle do, and walk round the trees.
- Each painted tree gets a 3D tree in the same spot, coloured from the painting under it.

## Changing the map in Walking Paths

Walking Paths is Chris's map editing tool (in the building-with-assets- repo, `editing-tools/walking-paths/`). The
ranch map is ready for it in `map/ranch-walking-paths.json`: the picture, the green walk area (the pasture), the red
blocks (the yards, the buildings, the pond and every tree in the pasture) and the places of the day's work (the "look"
spots: hay ring, troughs, coop and the rest).

1. Open Walking Paths, then **Open** `map/ranch-walking-paths.json`.
2. Move, add or take away walk areas and blocks, and drag the places where they really are. Walk it with F2 to try it.
3. **Save the maps file** and put it back as `map/ranch-walking-paths.json`.
4. Run `node the-ranch/tools/make-trace.mjs` and `node the-ranch/tools/build.mjs`. While the file is there it decides
   where the cattle can walk and where the places are; the painting still decides the trails and the trees.

`node the-ranch/tools/make-trace.mjs --export` writes the file afresh from what's written in the tool.

## Checking a change

```
node the-ranch/tools/make-trace.mjs      # after changing the map or the places
node the-ranch/tools/trace-check.mjs     # draws the trace over the map into the-ranch/shots/; ends with "trace ok"
node the-ranch/tools/build.mjs           # builds The_Ranch.html
node the-ranch/tools/ranch-check.mjs     # plays it on a phone-sized screen; must end with "all good"
```

## Reference pictures

- `reference/ranch-satellite-marked.jpg`: the real ranch from a satellite, with Chris's marks.
- `reference/ranch-from-the-sky.png`: a cartoon of the ranch seen from above. Chris says it's very close
  to how the real ranch looks.
- `reference/sky-tiles/`: the ranch from above in six pieces, closer up (Chris, October 4, 2026).
  `six-tiles-together.png` shows how they fit. `straight-down/` are the six pieces of the cartoon map, larger
  (they line up with it exactly, and the game uses them). `detailed/` are richer repaintings of the pieces, two or
  more tries each, for the close-up places later.
- `reference/barn-sheet.png`: the barn (corrugated metal, rusty) from the front, both sides, the back and the top, with its fences and gates.
- `reference/barn-background.png`: a painting of the barn and corrals with the sun going down behind the trees.
