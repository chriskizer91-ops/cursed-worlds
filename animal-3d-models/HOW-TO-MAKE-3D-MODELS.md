# How to make 3D models that work with all of Chris's games

This is how the 3D animals here are made, written so they fit Stranded, the ranch, envoi and What the Map Forgot
alike. The first part is for Chris; the second part is the checklist for whoever builds the next model.

## The short version (for Chris)

- **Every model is made in code.** Nothing is drawn in a 3D program or downloaded. The animal is described in a file:
  its shape, its colours, its skeleton and how it moves. That keeps the games working offline in a single file, small
  enough for a phone, and every model can walk, eat and lie down. (envoi tried a model made in Tripo from a picture:
  it came out mushy, 7.8 MB, with no skeleton, so it couldn't move. That's why envoi, and now this folder, build
  everything in code.)
- **One animal, three looks.** The same animal can be made at three levels:

  | Look | What it's for | How many triangles | File |
  |---|---|---|---|
  | **Full detail** | close-ups, cutscenes, the animal you're looking at | 100,000 and up (Henry: about 140,000) | `zebu-cattle/zebu-hd.js` |
  | **Storybook** | games in What the Map Forgot's 3D look | about 20,000 | `makeZebuStorybook` in `zebu-cattle/zebu.js` |
  | **Ranch game** | the whole herd walking the map at once | about 10,000 to 20,000 | `makeZebu` in `zebu-cattle/zebu.js` |

- **What a new animal needs from you:** photos of the real animal and, if you have one, a character sheet. Put them in
  the animal's folder (like `zebu-cattle/henry/`) and say what the sheet gets wrong. Henry's notes are the example: the
  broken horn is his right one, and poses 7, 10, 11 and 12 on his sheet are wrong. The real animal and your word
  always win over a drawing.
- **How you check one:** open the Henry page on your phone (the link is in the chat), turn him with your finger and try
  each move. For any animal there are also turnaround pictures from every side, made by
  `tools/turnaround.mjs` (see below).

## Making a new animal (the checklist)

### 1. The rules every model follows

- three.js r128 as the global `THREE` (the copy in `vendor/`, so it works offline). No other libraries, no model or
  image files: textures are painted on a canvas in code.
- Metres; y is up; the animal **faces +z** with its feet at y = 0; its **left side is +x**. (So with the animal facing
  you, its right side is on your left. That's how Henry's broken right horn ends up on the viewer's left.)
- One function makes it: `makeZebu(look)`, `makeZebuHD(look, {detail})`, `makeZebuStorybook(look)`, or for a new kind of
  animal `make<Name>(opts)` in its own file.
- It returns the same handle in every look, so a game can swap one look for another:
  - `root`: put this in the scene; set its position and `rotation.y`.
  - `animate(dt, t, speed)` every frame: `dt` seconds since the last frame, `t` the clock, `speed` in metres a second
    (0 standing, about 1 walking).
  - `act(name)`: `'stand'`, `'eat'` or `'lie'`. Lying down and getting up play out the way the real animal does it
    (cattle: front knees first going down, back end first getting up). `busy` is true while that plays; `state` says
    where it is.
  - `pose(name)` jumps straight to a pose (for pictures); `anchor('head' | 'mouth' | 'poll')` gives a world position
    (for a camera or a name tag); `tris` is the triangle count.

### 2. Building the shape

- **Body:** a loft, rings of cross-sections from the rump to the throat (`loft` in both files). Each ring has a width,
  how far it reaches up and down, how square it is, and for cattle a hump on top and a keel below (the dewlap). Make
  the body **one piece** from rump to throat, so nothing shows a seam.
- **Head:** its own loft along the face, tipped down at the angle the animal holds it. Bones and hollows of the face
  (eye ridges, the poll between the horns, nostrils) are pushed in or out of the surface with small bumps (`FACE` in
  `zebu-hd.js`). Muscles and bones of the body work the same way (`BUMPS`).
- **Legs, horns, tail, ears:** tubes along a curve through the joints (`sweep`), with the radius changing along them
  and round them (the point of the hock sticks out behind). Start the top of each leg **inside** the body, or it shows
  as a lump.
- **Hair:** short hair is painted into a normal map, so the coat catches the light. Long hair (a tail switch, lashes,
  the rim of an ear) is hundreds of single thin tubes.
- **Colour:** painted into each point of the surface (darker in creases and under the belly, grey over a white bull's
  hump and neck, the black nose with a soft edge). Look at the photos for where the colour changes.

### 3. The skeleton and moving

- **Full detail:** one skin bound to a skeleton (`THREE.SkinnedMesh`), each point weighted to its nearest bones with
  smooth hand-overs at the joints, so the body bends as one piece. Cattle bones: pelvis, spine, chest, hump, dewlap,
  two neck bones, head, jaw, ears, shoulder, elbow, knee and fetlock in front; hip, stifle, hock and fetlock behind;
  six tail bones.
- **Game and storybook:** rigid parts on joints (each joint is one merged mesh), which is lighter for a whole herd.
- **Walking:** four beats (left hind, left fore, right hind, right fore), each foot on the ground about two thirds of
  the time; the knee folds and the hoof lifts as the leg swings forward.
- **Poses that touch the ground** (eating, kneeling, lying) are worked out from where the joints should rest, not by
  guessing angles: say where the knees, hocks and fetlocks go, and let a small solver find the angles. Then check the
  pictures.

### 4. The three looks, and what makes each one

- **Full detail** (envoi's top level, from `envoi-on-the-longest-night 3d-model-main-characters/io` and the Emberback):
  `MeshPhysicalMaterial` with sheen on the coat, a painted normal map for the hair, a little light carried round into
  the shade (soft white hair and skin), a wet nose, ringed horns, glossy eyes under a clear cornea. It needs a renderer
  with `outputEncoding = sRGBEncoding` and `ACESFilmicToneMapping`, a sky to reflect (`scene.environment` from a PMREM
  of a simple gradient sky) and a sun with soft shadows. The Henry page sets all of this up.
- **Storybook** (What the Map Forgot's `wren-3d`): flat warm colours from that game's palette (ink `#1d1b2c`, paper
  `#f4efe2`), three-step cel shading (ramp 120, 200, 255), a cool rim of light, and an ink outline that follows
  averaged normals so it doesn't split at seams. Proportions are chunky: a bigger, rounder head, shorter legs, a wider
  body, big dark eyes with two catchlights.
- **Ranch game** (Stranded's living world): toon shading with a thin dark outline, light enough for a whole herd.

### 5. Budgets

| Where | Triangles | Draw calls |
|---|---|---|
| A full-detail close-up (one animal) | 100,000 to 1,000,000 | under 15 |
| envoi's game models | 50,000 to 120,000 | 40 or fewer |
| A storybook character (What the Map Forgot) | 10,000 to 55,000 | about 25 |
| One animal of a herd on a map | 10,000 to 20,000 | about 30 |

Henry at full detail is about 140,000 triangles in 8 draws, and takes a second or two to build on a phone.

### 6. Checking it

```
node animal-3d-models/tools/turnaround.mjs --look henry --model hd --poses stand,eat,lie
node animal-3d-models/tools/turnaround.mjs --look henry --model hd --close        # the head up close
node animal-3d-models/tools/turnaround.mjs --look henry --model storybook
node animal-3d-models/tools/turnaround.mjs --look tan-cow                          # the ranch game look
node animal-3d-models/tools/build-viewer.mjs && node animal-3d-models/tools/viewer-check.mjs
```

Each ends with "all good" and leaves pictures in `animal-3d-models/shots/`. Lay them next to the photos and the
character sheet, and look especially at: which side anything one-sided is on (Henry's broken horn), whether the feet
touch the ground in every pose, whether anything pokes through the skin, and whether the leg tops show as lumps.

### 7. Taking a model into each game

- **The ranch** (`the-ranch/`) and **Stranded** (`the-clearing-stranded/living/`): use the handle as it is. Stranded's
  own animals (`beasts.js`) have a smaller interface (`animate(dt, t, speed, graze)`); call `act('eat')` instead of
  passing `graze`.
- **envoi:** its model spec (`docs/specs/model-build-spec.md` there) wants `animate(phase, walk, t, dt)`, `play`,
  `ACTIONS` with `hurt` and `block`, and `anchor('chest' | 'head' | 'hit')`. Wrap the handle in a small adapter rather
  than changing the model. envoi's game lights are plain, so build with `{linear: false}`.
- **What the Map Forgot (wren-3d):** it faces **+x** there, so turn the root by -90°, and scale it by the game's pixels
  per metre (`24 / 1.13`). Its characters can be drawn in (`reveal(fill, line)`: ink first, then colour); a model that
  goes into a scene that uses it needs clipping planes on its materials, like `wick.js` there.
- The other repositories are read-only: copy from them, never commit to them, and name what you copied (repo and path)
  in the commit message.
