# Zebu cattle

The Zebu herd Chris looks after on a ranch in Bardwell, Texas. Each animal has its own folder with
its character sheet. Henry also has real photos and notes.

**Names:** Henry is the only real name. The names on the other character sheets (Sage, Shadow,
Cinnamon, Speckle) were made up by the AI that drew them, so the folders are named by how each cow
looks until we know their real names. The "Whitey" sheet turned out to be Henry, so it's in his folder.

| Folder | Coat | Horns | Name on the sheet |
|---|---|---|---|
| [henry](henry/) | white bull | left horn whole, right horn broken off | Whitey (pixel sheet) |
| [tan-cow](tan-cow/) | solid tan | long, upright, sweeping | Sage |
| [black-cow](black-cow/) | solid black | moderate, curved | Shadow |
| [red-brown-cow](red-brown-cow/) | rich red-brown | short, curved | Cinnamon |
| [speckled-cow](speckled-cow/) | tan and white speckled | long, curved | Speckle |

`herd-photos/` has real photos of the herd together. The young black animal at the front of the sunrise photo is in
the game as the calf.

The character sheets are drawings, so the real animals and Chris's word come first wherever they
disagree.

## In 3D

Each animal comes in three looks (see [the guide](../HOW-TO-MAKE-3D-MODELS.md)):

- **Full detail**, `zebu-hd.js`: `makeZebuHD('henry')`. One skin over a skeleton; the hump, the hip bones, the muscles
  and the folds of the dewlap under it; hair painted into the coat so it catches the light; dark moist eyes under a
  glossy cornea; his whole left horn with its rings and his broken right one, pink and spotted; split hooves; a tail
  switch of single hairs. About 140,000 triangles.
- **Storybook**, `makeZebuStorybook('henry')` in `zebu.js`: What the Map Forgot's look. A big round head, short legs,
  big shining eyes, flat warm colours and an ink outline.
- **Ranch game**, `makeZebu('henry')` in `zebu.js`: the cartoon the ranch map uses for the whole herd.

Henry's shape is measured off Chris's photos: the hump over his shoulders, the loose folded skin down his throat, the
long drooping ears, the dark nose and hooves, the black tail tuft, his whole left horn and his broken right one.
The cows are a little smaller, with smaller humps and both horns.

Each one can stand, walk (one foot at a time, the way cattle do), eat with its head down in the grass and chewing,
and lie down the way cattle really do it: front knees first, then the back end; getting up, back end first. The ears
flick and the tail swats flies.

- `henry/model-full-detail.jpg`: the full-detail Henry from the sides, his head close up, eating, kneeling and lying.
- `henry/model-storybook.jpg`: the storybook Henry.
- `henry/model-turnaround.png`: the ranch game's Henry from every side.
- `herd-lineup.png`: the whole herd side by side, in the ranch game's look.
