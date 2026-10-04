// The Boulders (camp), traced to its painting (art/places/01-camp.webp, 1536 x 1024). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods and bushes); anything whose feet are north of the base goes behind it.
//   walk: true for things you can walk under or through (the stand only hides you). deep: how far back a big rock
//   goes; its depth is taken at its middle, so things set on top of it show in front of it.
// ground: kinds of ground over the grass: G tallgrass. trails: [width, points...], always walkable.
// spots and sites: where things are used and built. exits: where a trail leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.camp = {
  id: 'camp', painting: '01-camp', size: [1536, 1024], ground: 'g',
  stand: [
    // the woods along the top, either side of the north trail
    {id: 'woodsN1', kind: 'woods', base: 'col', pts: [[512, 0], [916, 0], [914, 150], [906, 262], [884, 288], [866, 196], [836, 150], [690, 148], [664, 168], [624, 196], [590, 214], [556, 196], [512, 176]]},
    {id: 'woodsN2', kind: 'woods', base: 'col', pts: [[960, 0], [1536, 0], [1536, 148], [1460, 168], [1400, 150], [1290, 148], [1262, 236], [1214, 236], [1196, 150], [1150, 140], [1100, 150], [1060, 150], [1010, 150], [976, 156], [962, 200]]},
    // shrubs and rocks east of the north trail, and the cedars standing in the tallgrass
    {id: 'brushNE', kind: 'woods', base: 'col', pts: [[962, 200], [1010, 160], [1100, 158], [1160, 176], [1170, 250], [1140, 290], [1120, 336], [1060, 336], [1030, 300], [1000, 330], [970, 300]]},
    {id: 'cedarA', kind: 'tree', base: 372, pts: [[1150, 286], [1176, 262], [1206, 288], [1210, 372], [1150, 372]]},
    {id: 'cedarB', kind: 'tree', base: 292, pts: [[1366, 214], [1392, 186], [1420, 214], [1428, 292], [1364, 292]]},
    {id: 'cedarC', kind: 'tree', base: 484, pts: [[1240, 380], [1290, 340], [1340, 380], [1350, 484], [1236, 484]]},
    // the big post oak with the long limb (the food hang), and the woods and brush round it to the west
    {id: 'oakW', kind: 'tree', base: 388, pts: [[0, 0], [512, 0], [512, 176], [470, 168], [440, 160], [470, 230], [500, 286], [486, 326], [430, 330], [384, 302], [300, 258], [236, 262], [222, 300], [218, 388], [160, 388], [156, 300], [120, 264], [60, 272], [0, 282]]},
    {id: 'brushW', kind: 'woods', base: 'col', pts: [[0, 312], [64, 316], [104, 362], [112, 430], [146, 498], [210, 528], [214, 576], [178, 602], [64, 622], [0, 640]]},
    {id: 'junW', kind: 'tree', base: 392, pts: [[500, 300], [534, 282], [566, 312], [570, 392], [500, 392]]},
    // the three boulders
    {id: 'rockN', kind: 'rock', base: 312, deep: 70, pts: [[690, 210], [716, 168], [770, 148], [830, 152], [866, 190], [876, 250], [870, 300], [846, 312], [724, 312], [696, 290], [686, 250]]},
    {id: 'rockW', kind: 'rock', base: 432, deep: 84, pts: [[560, 330], [584, 296], [636, 278], [690, 286], [716, 312], [724, 372], [716, 418], [690, 432], [596, 432], [566, 410], [556, 370]]},
    {id: 'rockE', kind: 'rock', base: 442, deep: 84, pts: [[826, 336], [846, 296], [890, 282], [944, 290], [978, 320], [984, 380], [976, 430], [950, 442], [860, 442], [834, 418], [822, 380]]},
    // the woods to the south-west, and brush at the bottom
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 706], [60, 692], [150, 682], [250, 668], [330, 662], [380, 692], [404, 744], [424, 800], [470, 862], [500, 920], [520, 1024], [0, 1024]]},
    {id: 'brushS', kind: 'woods', base: 'col', pts: [[512, 872], [560, 858], [636, 876], [652, 958], [700, 1024], [512, 1024]]},
    {id: 'junSE', kind: 'tree', base: 990, pts: [[940, 860], [976, 820], [1014, 852], [1024, 990], [936, 990]]},
    // the big post oak at the bottom right, and the brush and woods round it
    {id: 'oakSE', kind: 'tree', base: 912, pts: [[1084, 720], [1112, 650], [1164, 606], [1280, 594], [1380, 622], [1452, 660], [1536, 624], [1536, 1024], [1040, 1024], [1040, 880], [1068, 800]]},
    {id: 'brushSE', kind: 'woods', base: 'col', pts: [[1000, 720], [1040, 690], [1084, 720], [1068, 800], [1040, 880], [1040, 1024], [1024, 1024], [1018, 860], [990, 800]]}
  ],
  ground: [
    ['G', [[1150, 150], [1536, 148], [1536, 640], [1452, 660], [1380, 622], [1280, 594], [1200, 580], [1160, 520], [1150, 400]]]
  ],
  trails: [
    // north to the Oak Woods: down from the top edge, round the east side of the east boulder to the open ground
    [44, [938, 0], [940, 120], [932, 220], [944, 280], [990, 330], [1000, 400], [968, 470], [880, 500], [850, 540]],
    // the fire ring's east side, from the junction up to the boulders
    [36, [772, 624], [826, 590], [848, 540], [838, 488]],
    // up from the fire ring between the west and east boulders, into the pocket
    [40, [772, 520], [780, 470], [784, 410], [780, 360]],
    // south to the River Bank
    [40, [772, 624], [770, 760], [774, 900], [770, 1024]],
    // east to the Prairie
    [40, [772, 624], [900, 626], [1010, 622], [1100, 616], [1200, 604], [1290, 588], [1340, 560], [1378, 516], [1404, 466], [1440, 438], [1500, 402], [1536, 388]],
    // west to the Berry Thicket
    [40, [772, 624], [600, 620], [440, 618], [330, 620], [240, 650], [130, 676], [0, 696]],
    // north-west to the Cedar Stand, past the big oak's trunk
    [36, [330, 620], [270, 590], [236, 530], [190, 470], [140, 420], [118, 370], [96, 320], [50, 298], [0, 292]]
  ],
  hub: [772, 624],
  exits: [['oak', 938, 0], ['cedar', 0, 292], ['berry', 0, 696], ['prairie', 1536, 388], ['river', 770, 1024]],
  // the game's spots: the pocket between the boulders (sleep, rest, build the shelter) and the oak's long limb (the food hang)
  spots: {boulders: [[784, 372]], hangoak: [[440, 456]]},
  // the camp's build sites and the spots on the ground
  ring: [767, 552, 40, 24],     // the fire ring: centre, and its half width and half height
  pocket: [784, 364],           // the sheltered pocket between the boulders
  sites: {ring: [767, 552], wood: [884, 586], rack: [462, 520], rain: [500, 452], bench: [870, 716], cache: [1080, 420], look: [1100, 540],
    crate: [640, 548], pot: [812, 576], work: [640, 690], hang: [404, 412],
    // the hut plots: open ground round the boulders, in the order huts go up (each the middle of a hut's floor)
    hut1: [340, 470], hut2: [575, 785], hut3: [1160, 480], hut4: [905, 800]}
};
