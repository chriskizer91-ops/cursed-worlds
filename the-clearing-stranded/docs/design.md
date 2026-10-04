# Stranded: the redesign

*Stranded* is the game Dagr calls it. Its world is **The Clearing**: a wide clearing in North Texas, in a world where
people never existed. This note is the plan for turning it from "tap the box" into a game you play with your hands.
The paintings and the code both follow it, so the art lines up with the game.

## What was wrong

- **It was a clicker.** The "Next step" card had a button that did the next thing for you, and the Here tab was a
  list of buttons. You could play by tapping the same box over and over.
- **The goals jumped around.** The card picked whatever mattered most this minute: water, then a bed, then a fish
  trap. There was no story, and no sense of finishing something.

## What it becomes

1. **You walk the world.** Each of the nine places is its own painted map, seen from above at an angle. Your survivor
   walks on top of it. Tap the ground to walk there, or use the D-pad. Trails at the edges lead to the next place, and
   walking off one is the trip, with the same time and water cost as before.
2. **You use things, not menus.** Tap a cedar and you walk up to it, then choose between breaking off poles and
   stripping bark. Tap the river's edge to drink or fill your bag. Every job in the game belongs to a thing in a place.
   There is no list of buttons any more.
3. **Quests with a story.** The survivor's first days, told as quests: water, fire, a roof, safe water, food that
   lasts, a real camp, then exploring and the long haul. Each quest says what to do, where to go, and how. A marker
   shows the place and the thing. Nothing does it for you.
4. **Skill moments.** The skill jobs become quick hands-on moments of a few seconds. You saw the bow drill and blow on
   the coal, time a spear strike, steady your aim, and pick only the ripe berries. How well you do changes the odds.
   Plain chores (firewood, poles, clay) are walk up to it and do it.
5. **The rules stay.** Dagr's rules don't change: real plants, real animals, real weather, and the animals evolve.
   Water, food, fire, shelter, sickness and seasons all work as before. Only the way you play changes.

Until the paintings arrive, each place is drawn by the game itself in pixel art, from the same layout. When a painting
comes back, it replaces that drawing, and the walkable ground gets traced to match it.

## How hard it is

It is a survival game: it should teach survival and feel like surviving. It is meant to be hard, and the hard
times of year should be hard.

**Three levels**, picked on the title screen:

| Level | Who it's for | How it differs |
|---|---|---|
| **Easy** | Learning the ropes | Softer bites and falls, fewer infections, better luck, gentler cold and heat |
| **Medium** | The real game with a little slack | Real odds, with a small cushion on damage and spoilage |
| **Hard** | As real as it gets | Real numbers everywhere: full cold and heat stress, full spoilage, full infection odds, fewer ration bars |

**The seasons**, at every level:

| Season | Feel | Why |
|---|---|---|
| Spring (Mar–May) | Easy | Dewberries, mulberries, greens, onions, eggs; mild days; rain fills the catcher |
| Summer (Jun–Aug) | Hard | Heat over 95 °F doubles the water you lose; hard work in the heat risks heat stroke; meat rots in hours. Fruit is still there: blackberries, plums, grapes, prickly pear |
| Fall (Sep–Nov) | Easy | Pecans, acorns, persimmons, grapes; cool days; animals fat; the best time to stockpile |
| Winter (Dec–Feb) | Hardest | Freezing nights, ice storms, short days, almost no plant food after January, fish slow down; the fire has to live all night, and wet clothes kill |

Starting in spring is the easiest start, but not a safe one. Spring and fall are for getting ready, because summer
and winter will test you: smoked meat and nuts put by, a woodpile, a hide blanket, walls. The title screen says
which starts are easy and which are hard. The auto-player measures every change: how often players die in each
season, and how fast food and health drain in each. The numbers get tuned until winter is clearly the worst, summer
second, and spring and fall gentle.

## The survivor

A grown-up, like the figure already in the game: blaze-orange cap, slate-blue shirt, dark work trousers, boots, a
canvas pack with a rolled bedroll. In the two-person game the partner wears an olive shirt and no pack.

## The nine places

Every painting is **1536 × 1024** (landscape, 3:2), seen from **a high three-quarter view looking down at about 30
degrees**. The sun is high in the upper left, so shadows fall down and to the right. It is always daytime in the
painting, because the game darkens it for dusk and night. Positions are given as **percent across, percent down** from
the top-left corner.

In the game the map is a grid of 48 × 32 squares, 32 painting pixels each. A square is about two feet. The survivor
stands about 2½ squares tall.

### 1 · The Boulders (camp)

A wide natural clearing of short grass and wildflowers, ringed by Cross Timbers woods. In the middle are three
sandstone boulders, each about ten feet tall, standing in a triangle. Between them is a sheltered pocket that opens to
the south. Everything you build goes here.

| What | Where |
|---|---|
| Three boulders: west, east, north | (44%, 36%), (57%, 36%), (50%, 23%); each about 8% wide |
| The pocket between them (sleep, build the shelter) | (50%, 33%) |
| Fire ring: bare dirt and a ring of stones | (50%, 52%) |
| Open grass left clear for building | west (25–38%, 40–62%), east (62–76%, 34–60%), south (38–64%, 58–74%) |
| Big post oak with a high limb (food hang) | (12%, 30%) |
| Big post oak | (88%, 80%) |
| Woods, thick | along the top edge (to 16% down) and both top corners |
| Tallgrass edge | right side (86–100%, 18–62%) |

Trails, worn dirt footpaths, all meet on the open ground south of the fire ring at (50%, 64%):

- north to the **Oak Woods**: leaves the top edge at 60% across, passing east of the boulders
- northwest to the **Cedar Stand**: leaves the left edge at 28% down
- west to the **Berry Thicket**: leaves the left edge at 72% down
- east to the **Prairie**: leaves the right edge at 46% down
- south to the **River Bank**: leaves the bottom edge at 48% across

### 2 · Cedar Stand

A thin scatter of eastern red cedars at the edge of the woods: dense, dark green cones on stringy red-brown trunks, with
dry dead branches low down. Post oaks thicken along the top and left edges.

| What | Where |
|---|---|
| The best cedar, low dry branches (poles, bark) | (46%, 34%) |
| More cedars | (22%, 30%), (30%, 48%), (62%, 24%), (70%, 50%), (84%, 30%), (12%, 60%), (56%, 80%) |
| Pile of fallen dry cedar deadwood (firewood) | (32%, 64%) |
| Fallen dead tree smothered in greenbrier, grapevine and some poison ivy (vines) | (66%, 72%) |
| Rotten log half sunk in the grass beside flat rocks (grubs) | (80%, 42%) |

Trails: east to **camp** leaves the right edge at 58% down; northeast to the **Oak Woods** leaves the top edge at 78%
across.

### 3 · Oak Woods

Open Cross Timbers woods of post oak and blackjack oak. The floor is leaf litter with patches of grass, and the trees
are spaced so you can walk between them.

| What | Where |
|---|---|
| Heap of fallen oak limbs and deadwood (firewood) | (30%, 62%) |
| Acorn-dropping oaks with greenbrier climbing them (forage) | (62%, 58%) |
| Deer trail worn into the leaves, a sapling rubbed raw by antlers (hunt, snares) | trail from the right edge at 30% down to (56%, 40%); sapling at (70%, 34%) |
| Darker path deeper into the woods (explore) | leaves the top edge at 30% across |
| Thick brush hiding a faint uphill trail to the spring (only after you find it) | top-right corner (84–100%, 0–24%); trail leaves the top edge at 92% across |

Trails: south to **camp** leaves the bottom edge at 45% across; west to the **Cedar Stand** leaves the left edge at 60%
down.

### 4 · Prairie

Open rolling tallgrass (little bluestem and Indian grass) with wildflowers. The land rises toward the top right to a
low limestone ridge scattered with loose fist-sized stones.

| What | Where |
|---|---|
| Limestone ridge with loose stones (cooking stones) | (76%, 18%) |
| Yucca clumps (yucca leaves) | (30%, 28%), (42%, 72%) |
| Prickly pear patches (forage) | (62%, 74%), (86%, 56%) |
| Patch of dry, straw-colored grass (dry grass) | (22%, 56%) |
| A lone hackberry tree on a slight rise (watch for game) | (56%, 40%) |
| Rabbit runs worn through the grass (snares) | around (40%, 52%) |
| The far prairie, grass running on and on (explore) | right edge at 44% down |

Trail: west to **camp** leaves the left edge at 55% down.

### 5 · Berry Thicket

| What | Where |
|---|---|
| A big sprawling blackberry thicket, thorny arching canes, dewberry runners along its edges (pick berries) | center left (24–50%, 30–66%) |
| One huge red mulberry tree, wide crown, open ground under it (shake it over the tarp) | (72%, 34%) |
| A thicket of small Chickasaw plum trees | (20%, 80%) |
| Woods | along the left and top edges |

The game draws the fruit when it is ripe, so the bushes are painted green with no fruit.

Trail: east to **camp** leaves the right edge at 60% down.

### 6 · River Bank

A slow, muddy brown river runs left to right across the bottom of the picture, its water from about 70% down to the
bottom edge, with a wavy bank. Above it is a grassy bank with a few cottonwoods and black willows. Along the bank, from
left to right:

| What | Where |
|---|---|
| Cattails standing in the shallows (cattail roots) | (15%, 70%) |
| Low mud flat with crawfish chimneys, little mud towers (crawfish, mussels) | (32%, 68%) |
| The water's edge, a flat rock to kneel on (drink, fill containers) | (48%, 66%) |
| A sandbar (dig a seep well) | (60%, 75%) |
| A snag, a fallen log in the water (set the fish trap) | (72%, 80%) |
| A cut bank of gray clay (dig clay) | (82%, 62%) |
| A canebrake of river cane, like bamboo (cut cane) | (93%, 50%) |

Trails: north to **camp** leaves the top edge at 50% across; west, upstream, to the **Pond** leaves the left edge at
55% down; east, downstream, to the **Creek Bottom** leaves the right edge at 40% down.

### 7 · Pond

| What | Where |
|---|---|
| A still oxbow pond with lily pads, a mud edge and cattails around it | center (24–76%, 28–70%) |
| Shallows on the near side for wading (spear fish, gig frogs, feel for turtles) | (50%, 74%) |
| A gravelly edge (drink, fill containers) | (64%, 76%) |
| Cattail beds (cattail roots) | (24%, 44%), (70%, 34%) |
| A big oak | (88%, 24%) |

Trail: east to the **River Bank** leaves the right edge at 70% down.

### 8 · Creek Bottom

Rich bottomland forest in deep shade: tall pecans, white-barked sycamores, a persimmon tree, mustang grapevines hanging
from the limbs. A clear, gravelly creek winds from the top edge at 60% across down to the bottom edge at 76% across.

| What | Where |
|---|---|
| Pecan trees with open ground under them (gather pecans) | (24%, 30%), (40%, 46%) |
| Grapevine-draped oak and a persimmon tree (forage) | (20%, 66%) |
| Fallen hardwood limbs (firewood) | (48%, 76%) |
| Across the creek, a grove of thorny Osage orange (bois d'arc) with green fruit the size of softballs (cut a bow stave, once you find it) | (86%, 30%) |
| Path downstream along the creek (explore) | leaves the bottom edge at 88% across |

Trail: west to the **River Bank** leaves the left edge at 78% down.

### 9 · Hidden Spring

A secluded pocket under a sandstone ledge, with ferns and moss. Cold, clear water seeps from the foot of the ledge at
(55%, 34%) into a pool at (55%, 50%). Thick brush surrounds it on three sides.

Trail: back to the **Oak Woods** leaves the bottom edge at 30% across.

## Quests

Quests come in chapters. One main quest is active at a time, and you can open any other from the Journal. Seasonal
side quests appear when their season comes.

1. **Stranded**: *Water first* (find the river and drink), *Fire* (a cedar pole, a bow-drill kit, bark, firewood, a
   flame), *A roof* (poles, vine cord, the lean-to), *Carry water* (fold a tarp bag and fill it).
2. **Safe water**: *Boil it* (bowl, four dry stones, boil, drink it clean), *A bed off the ground*.
3. **Food that lasts**: *Fish while you sleep* (fish trap, grubs, set it, check it), *A fishing spear*, *The drying
   rack*, *Keep the raccoons out* (food hang).
4. **A real camp**: *Roof the boulders*, *Know the land* (visit every place, explore the woods), *Four walls*.
5. **The long haul**: *Bois d'arc* (find it, cut a stave, carve a bow, make arrows), *The potter* (shape, dry and
   fire a pot), *Homestead* (the five camp upgrades), *A year in the clearing*.

Side quests: *Mulberry rain* (spring), *Pecan harvest* (fall), *The herd* (bison on the prairie), *The flock*
(passenger pigeons), *Acorn flour*, *Snare line*, and *Lean times* (the rabbit-starvation lesson).

Right-now needs, like thirst, nightfall, exhaustion and hunger, still interrupt with a warning that says what to do.
They have no do-it button either.

## Skill moments

| Job | What you do | What it changes |
|---|---|---|
| Start a fire with the bow drill | Saw back and forth at a steady rhythm until it smokes, then blow on the coal | Chance the fire catches |
| Spear fish, gig frogs | Strike when a fish slides under the point | How many you land |
| Shoot (rifle or bow) | Hold to steady the wobbling sight, let go on target | Chance to hit |
| Pick berries | Tap the ripe dark ones and leave the red ones and the thorns | How much you pick |
| Kill a snake with the plank or a pole | Strike when it pulls back | Kill it or get bitten |

Doing nothing in a skill moment counts as an average try, so nobody gets stuck.

## Part two: a game a kid plays for hours

Decided by Chris on October 4, 2026, after the living world went in. The game stays hard and real; this is about
making every minute count and giving a kid things to chase. Items marked *proposal* are mine and wait on Chris and Dagr.

### The partner is a helper with a mind of its own

In the two-person game the partner works on their own. They decide what camp needs (water, wood, food), say so
("I'm going to the river for water"), and go. You can follow and watch them do it, or not.

- When the partner is out of sight they don't vanish. Their trip runs on the game clock: so long on the trail,
  so long at the job, so long back. Wherever you go, the game works out where they'd be right then. If you set
  off after them for the river, you find them on the trail or filling water at the river, not back at camp.
- For "wait until they've left, then chase them" to work, the clock has to keep moving slowly while you walk
  about, not only when you do a job. *Proposal:* one real second is one game minute while you walk, so a day of
  walking about is 24 real minutes; jobs and trips still jump the clock as they do now.
- Two jobs now happen at once, so the engine has to let the partner's work run beside yours.

### Hunting is a target game; fishing is a fishing game

- **Hunting:** a short target game. Usually a rabbit or a bird (turkey, quail, dove, duck); now and then a deer;
  very rarely the big ones. *Note:* there are no moose this far south; the rare big ones would be a bison or an elk.
  The rifle never runs out of rounds, but each hunt gives you three shots. A shot still scares the animals
  out of that place for a while.
- **Fishing:** a fishing game: cast, wait for a bite, reel against the line's strain. Different fish by place,
  season and hour, from sunfish to channel catfish and bass, up to the legend: a seven-foot alligator gar.
  Every catch goes in a catch log.
- **Practice:** the menu gets a practice range and a practice pond, to play the two games on their own.

### Doing one thing a lot builds something you can see

- Huts aren't one each. With enough wood you build another, and another, on the open ground round the boulders.
- Any job you keep doing turns into something lasting. *Proposal:* the camp has building plots, and each skill
  has things to build. Wood gives woodpiles, more huts, a palisade and a lodge. Fishing gives fish weirs and a
  smokehouse. Hunting gives a hide-tanning frame and a hide tent.
- **Skill points:** every job earns points in its skill: "+1 Exploring", "+1 Hunting". Points become levels, and
  levels unlock real tricks.
  - Skills: exploring, hunting, fishing, foraging, building, fire, tracking, crafting.
  - Doing the same job again in one day earns less, so mashing one button still doesn't pay.

### Kept from the brainstorm

- **Secret places** beyond the nine, found by exploring. Each needs a background painting from Chris.
- **Legends:** big rare animals with a hunt in steps.
- **A rival:** the raccoon who raids camp.
- **A wolf pup** that grows up beside you.

### A starting kit that buys time to learn, then runs out

*Proposal*, in place of two crates, two big tarps, 100 ration bars, two knives and 50 rounds:

| Item | Why | How it runs out |
|---|---|---|
| Rifle | Hunting, as above | Never: three shots a hunt |
| One good knife | Everything | Doesn't |
| A box of 10 matches | Fire on the first nights | Gone after ten; by then you need the bow drill |
| 50 feet of cord | Shelter and snares early | Used up; then you twist your own from plants |
| One tarp | The first lean-to | Wears out over the months |
| A plastic water bottle | Carrying water | Can't go on a fire, so you still need a way to boil |
| A small fishing kit: hooks, line, sinkers | Fishing from day one | Hooks get lost to big fish and snags |
| A small first-aid kit | Cuts, a sprain | A few uses |
| Three days of food | Time to learn to find food | Three days |

### Still to ask

- Fish and animal pictures for the catch log: Dagr's rule is that only backgrounds are pictures, so by that rule
  they would be made in code like everything else.
- The partner: the model sheet shows a bearded man. Keep him, or should the helper be a woman?
