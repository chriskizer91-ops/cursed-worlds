# The ranch (working name)

A game about working a Zebu cattle herd on a ranch in Bardwell, Texas, based on Chris's real job there.
The name of this folder is only a placeholder until the game has a real one.

The animals are kept in [`animal-3d-models/zebu-cattle/`](../animal-3d-models/zebu-cattle/).

## Try it

The link is in the chat where it was made. `The_Ranch.html` is the same page as one file, built with
`node the-ranch/tools/build.mjs` (it isn't kept in the repository, because it's rebuilt every time).

**The second look (October 5, 2026): the cartoon map and cartoon cows, in a realistic world.** Chris asked for "the
cartoon maps and cartoon cows with realistic environment". So the painted map stays the ground, Henry, the herd and the
chickens are soft 3D cartoons, and the world round them is drawn to look real, the way envoi's *Colossus in the Meadow*
draws its meadow:

- The ground is your painted map of the ranch at every height, looking just as it was painted. Drag to move, pinch to
  zoom, twist with two fingers to turn.
- It is lit by a real sun, high in the north-west where the painting has it: the trees and buildings throw shadows on
  it, cloud shadows drift over it, and the pond ripples in the wind and mirrors the sky. Come right down and the map
  keeps its own painted grass and dirt (cut from open places on the painting and laid on smaller), so it stays the
  cartoon map instead of turning blurry.
- Every painted tree stands up as a real-looking tree (post oaks, cedars and taller round trees), swaying in the wind
  and casting its shadow. The houses and sheds have metal roofs and siding or old boards, the barn is corrugated metal,
  the fences are cedar posts and barbed wire, the bull pens are steel pipe, and the railroad has rails, ties and gravel.
- Get close to the herd and grass grows round you, and bends out of the way of the animal you're watching.
- The herd (Henry and the five others) are the same cartoon cattle as on Henry's own page. They graze along the cow
  trails, wander, lie down now and then, swat flies, shake their heads, lick their noses and moo. Henry leads; the others
  follow him, and the calf keeps by its mother.
- **Today's work** (top left) has the first four jobs of your day: put out a bale in the hay ring (the herd walks in
  along the trails to eat), fill the troughs up by the house in the bottom-left corner (thirsty cattle come to drink),
  let the chickens out of the coop by the same house and feed them, and look the cattle over (tap each one to see it
  up close, walk round it, and make it walk, eat, lie down, stand or moo).
- **1×** makes time go four times faster. **Whole ranch** goes back to the full map.
- If a phone can't keep up, the page lightens its picture by itself (fewer pixels first, then a little less grass).

Signs for the bull pens, the fence line, the salt, the pond, the barn and the house are there, but those jobs come later.

The first look (the toy-like 3D with flat-colored trees, October 4, 2026) is kept as it was in
`versions/the-ranch-2026-10-04.html`; open it in a browser to compare.

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
- Each painted tree gets a 3D tree in the same spot, its green taken from the painting under it.
- `ranch-land.js` draws the world round the painted map. It works out from the painting's colors where grass grows
  and where the water is, lights the map, and builds the trees, buildings, fences and railroad. It uses the land kit that Henry's page uses
  too (`animal-3d-models/viewer/land-kit.js`: the sky, the sunlight, the wind, the grass and the painted textures) and
  envoi's film camera (`animal-3d-models/viewer/cinema.js`).

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
                                         # (it also checks the 3D trees, the grass, the painting's colors and the cartoon herd)
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
