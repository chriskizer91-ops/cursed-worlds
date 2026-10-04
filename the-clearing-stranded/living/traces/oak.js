// The Oak Woods, traced to its painting (art/places/03-oak-woods.webp, 1536 x 1024). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods and bushes); anything whose feet are north of the base goes behind it.
//   deep: how far back a rock goes; its depth is taken at its middle.
// ground0: the floor is leaf litter (f); ground: grass (g) over it in the open. trails: [width, points...], always
//   walkable; {w, kind: 'H', pts} is the hidden path, closed until it is found.
// spots: where the game's things are used. exits: where a trail leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.oak = {
  id: 'oak', painting: '03-oak-woods', size: [1536, 1024], ground0: 'f',
  stand: [
    // the woods across the top and the north-east, either side of the dark path north
    {id: 'oaksNW', kind: 'woods', base: 'col', pts: [[0, 0], [470, 0], [478, 60], [470, 110], [444, 150], [400, 186], [340, 200], [296, 236], [292, 264], [250, 262], [240, 300], [236, 314], [150, 314], [140, 290], [100, 256], [40, 250], [0, 250]]},
    {id: 'woodsNE', kind: 'woods', base: 'col', pts: [[512, 0], [1536, 0], [1536, 272], [1452, 284], [1392, 294], [1332, 308], [1292, 328], [1240, 332], [1210, 300], [1172, 236], [1100, 226], [1040, 232], [990, 232], [940, 224], [900, 200], [860, 180], [760, 180], [680, 200], [640, 250], [626, 268], [600, 262], [580, 230], [566, 200], [552, 128], [530, 60]]},
    // the big post oaks in the middle: the one by the trail, and the double-trunked one east of it
    {id: 'oakC', kind: 'tree', base: 470, pts: [[626, 268], [640, 200], [700, 140], [780, 100], [860, 110], [920, 160], [930, 240], [900, 300], [856, 330], [858, 470], [784, 470], [786, 336], [730, 330], [670, 310]]},
    {id: 'oakC2', kind: 'tree', base: 622, pts: [[860, 300], [900, 240], [980, 226], [1060, 236], [1130, 260], [1166, 300], [1170, 380], [1150, 450], [1100, 500], [1040, 530], [1036, 624], [984, 624], [980, 540], [952, 520], [950, 480], [900, 480], [870, 470], [856, 420]]},
    {id: 'oakC2b', kind: 'tree', base: 566, pts: [[898, 476], [950, 476], [950, 566], [898, 566]]},
    // the sapling rubbed raw by antlers, on the deer trail
    {id: 'sapling', kind: 'tree', base: 388, pts: [[1160, 240], [1230, 236], [1236, 290], [1206, 300], [1204, 388], [1180, 388], [1180, 300], [1160, 290]]},
    // bushes: west edge, by the dark path, by the oaks, east of the sapling, and on the east edge under the deer trail
    {id: 'bushesW', kind: 'woods', base: 'col', pts: [[0, 250], [60, 252], [110, 270], [160, 300], [230, 310], [256, 340], [256, 420], [246, 480], [226, 512], [180, 520], [120, 530], [100, 560], [60, 560], [0, 566]]},
    {id: 'bushN', kind: 'woods', base: 'col', pts: [[384, 200], [420, 180], [470, 186], [500, 220], [506, 280], [496, 320], [450, 332], [400, 320], [384, 280]]},
    {id: 'bushTrail', kind: 'woods', base: 'col', pts: [[232, 520], [250, 476], [296, 462], [336, 490], [340, 540], [320, 574], [246, 574]]},
    {id: 'bushC', kind: 'woods', base: 'col', pts: [[690, 350], [716, 322], [756, 330], [770, 380], [766, 440], [700, 440], [686, 400]]},
    {id: 'bushSap', kind: 'woods', base: 'col', pts: [[1222, 420], [1240, 392], [1272, 396], [1284, 440], [1270, 470], [1226, 466]]},
    {id: 'bushesE', kind: 'woods', base: 'col', pts: [[1400, 330], [1460, 316], [1536, 310], [1536, 470], [1470, 470], [1420, 460], [1396, 420]]},
    // the big post oak on the east side, and the woods and brush along the bottom
    {id: 'oakE', kind: 'tree', base: 890, pts: [[1190, 700], [1206, 640], [1244, 604], [1300, 592], [1328, 532], [1372, 480], [1420, 462], [1536, 458], [1536, 890], [1470, 890], [1460, 800], [1400, 790], [1330, 800], [1260, 790], [1200, 770]]},
    {id: 'woodsSE', kind: 'woods', base: 'col', pts: [[1066, 850], [1100, 812], [1170, 812], [1200, 790], [1300, 800], [1400, 800], [1460, 830], [1470, 890], [1536, 890], [1536, 1024], [1150, 1024], [1170, 960], [1110, 950], [1070, 910]]},
    {id: 'cedarBush', kind: 'woods', base: 'col', pts: [[916, 800], [940, 750], [980, 730], [1020, 760], [1030, 820], [1016, 870], [930, 870]]},
    {id: 'bushS', kind: 'woods', base: 'col', pts: [[712, 960], [730, 910], [780, 896], [820, 910], [830, 960], [826, 1024], [716, 1024]]},
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 604], [50, 606], [70, 640], [96, 700], [136, 650], [180, 622], [236, 628], [262, 668], [300, 680], [350, 692], [392, 742], [432, 782], [452, 822], [440, 880], [420, 940], [430, 1024], [0, 1024]]},
    // the heap of fallen oak limbs, and the rocks in the open
    {id: 'deadwood', kind: 'brush', base: 'col', pts: [[270, 580], [300, 560], [360, 540], [420, 520], [470, 500], [520, 510], [560, 520], [606, 540], [606, 600], [580, 630], [520, 640], [440, 640], [380, 630], [320, 620], [276, 606]]},
    {id: 'rockW', kind: 'rock', base: 442, deep: 30, pts: [[300, 396], [330, 386], [370, 404], [382, 430], [360, 442], [316, 440]]}
  ],
  ground: [
    ['g', [[440, 680], [680, 680], [680, 1024], [440, 1024]]],
    ['g', [[720, 640], [1060, 640], [1100, 700], [1190, 780], [1150, 820], [1060, 860], [1050, 1024], [830, 1024], [720, 900]]]
  ],
  trails: [
    // south to camp
    [44, [700, 648], [701, 700], [700, 780], [694, 860], [688, 940], [684, 1024]],
    // the dark path north, into the deeper woods
    [40, [700, 648], [690, 580], [672, 512], [655, 448], [630, 384], [600, 320], [560, 256], [543, 200], [526, 128], [500, 64], [486, 0]],
    // west to the Cedar Stand, under the heap of oak limbs
    [40, [700, 648], [620, 656], [544, 660], [480, 660], [400, 655], [320, 645], [260, 625], [200, 605], [128, 590], [60, 580], [0, 572]],
    // the short branch north-east, fading out under the double oak
    [36, [700, 640], [740, 612], [776, 590], [826, 550], [866, 520], [896, 500]],
    // the deer trail: in from the east edge to the rubbed sapling
    [28, [1196, 404], [1252, 375], [1292, 345], [1332, 325], [1392, 310], [1452, 300], [1536, 290]],
    // the faint uphill trail to the spring, hidden in the brush of the north-east corner until it is found
    {w: 36, kind: 'H', pts: [[1420, 302], [1424, 240], [1418, 180], [1420, 120], [1418, 60], [1420, 0]]}
  ],
  hub: [700, 648],
  exits: [['camp', 684, 1024], ['cedar', 0, 572], ['spring', 1420, 0, 'hidden']],
  // the game's spots: the heap of oak limbs, the acorn oaks (where each trunk meets the ground), the rubbed sapling on
  // the deer trail, and the dark path north into the deeper woods
  spots: {
    deadwood: [[440, 644]],
    acorns: [[822, 476], [1010, 630], [924, 572]],
    deertrail: [[1196, 396]],
    deep: [[560, 256]]
  }
};
