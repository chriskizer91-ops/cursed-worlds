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

`zebu.js` builds each of them in code: `makeZebu('henry')`, `makeZebu('tan-cow')` and so on, plus `calf`.
Henry's shape is measured off Chris's photos: the hump over his shoulders, the loose folded skin down his throat, the
long drooping ears, the dark nose and hooves, the black tail tuft, his whole left horn and his broken right one.
The cows are a little smaller, with smaller humps and both horns.

Each one can stand, walk (one foot at a time, the way cattle do), eat with its head down and chewing, and lie down
the way cattle really do it: front knees first, then the back end; getting up, back end first. The ears flick and the
tail swats flies.

- `henry/model-turnaround.png`: Henry from every side, eating and lying down.
- `herd-lineup.png`: the whole herd side by side.
