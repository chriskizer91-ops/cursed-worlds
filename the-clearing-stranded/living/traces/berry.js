// The Berry Thicket, traced to its painting (art/places/05-berry-thicket.webp, 1536 x 1024). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods, bushes and the bramble); anything whose feet are north of the base goes behind it.
// ground: kinds of ground over the grass: G tallgrass, f leaf litter. trails: [width, points...], always walkable.
// spots: where things are used. exits: where a trail leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.berry = {
  id: 'berry', painting: '05-berry-thicket', size: [1536, 1024],
  stand: [
    // the woods along the top, and down the left side in two pieces so each meets the ground where it ends
    {id: 'woodsN', kind: 'woods', base: 'col', pts: [[0, 0], [880, 0], [880, 166], [840, 160], [800, 170], [770, 186], [730, 200], [690, 196], [640, 190], [600, 176], [560, 206], [500, 214], [470, 160], [420, 146], [330, 146], [306, 204], [270, 214], [240, 250], [146, 256], [100, 300], [50, 316], [0, 330]]},
    {id: 'woodsW1', kind: 'woods', base: 'col', pts: [[0, 330], [50, 316], [100, 300], [146, 256], [140, 300], [150, 340], [160, 380], [160, 420], [150, 470], [122, 500], [0, 500]]},
    {id: 'woodsW2', kind: 'woods', base: 'col', pts: [[0, 500], [122, 500], [118, 560], [140, 606], [150, 640], [120, 680], [60, 700], [0, 720]]},
    // the bush between the thicket and the mulberry
    {id: 'bushN', kind: 'woods', base: 'col', pts: [[800, 170], [840, 160], [880, 170], [915, 200], [922, 260], [910, 320], [880, 360], [840, 362], [812, 330], [800, 260]]},
    // the blackberry thicket: arching thorny canes, nobody walks through it
    {id: 'thicket', kind: 'bramble', base: 'col', pts: [[180, 380], [247, 372], [300, 352], [347, 320], [433, 287], [521, 250], [565, 231], [627, 244], [677, 240], [721, 250], [765, 281], [790, 337], [815, 369], [860, 410], [905, 470], [893, 493], [847, 527], [813, 540], [773, 560], [747, 593], [713, 620], [687, 653], [640, 673], [560, 662], [500, 662], [440, 640], [360, 632], [310, 612], [250, 592], [200, 566], [172, 500], [167, 453], [160, 400]]},
    // the huge red mulberry: its crown, and its trunk down to where the roots meet the ground
    {id: 'mulberry', kind: 'tree', base: 424, pts: [[880, 0], [1536, 0], [1536, 296], [1504, 314], [1447, 343], [1370, 305], [1313, 333], [1256, 314], [1214, 362], [1222, 424], [1118, 424], [1112, 380], [1094, 362], [1018, 343], [961, 333], [904, 352], [870, 330], [880, 200]]},
    // bushes round the open ground under the mulberry
    {id: 'bushM1', kind: 'woods', base: 'col', pts: [[968, 400], [1000, 380], [1050, 384], [1076, 420], [1072, 470], [1020, 478], [976, 470]]},
    {id: 'bushM2', kind: 'woods', base: 'col', pts: [[1254, 450], [1280, 436], [1314, 448], [1318, 500], [1290, 516], [1258, 508]]},
    {id: 'bushM3', kind: 'woods', base: 'col', pts: [[1340, 350], [1380, 330], [1440, 336], [1470, 360], [1470, 470], [1456, 500], [1390, 500], [1346, 470]]},
    {id: 'bushE', kind: 'woods', base: 'col', pts: [[1470, 570], [1500, 556], [1536, 550], [1536, 646], [1490, 648], [1472, 620]]},
    // the Chickasaw plums: small trees with many thin stems, at the bottom left
    {id: 'plum1', kind: 'tree', base: 891, pts: [[150, 640], [200, 622], [250, 642], [285, 672], [340, 676], [386, 690], [392, 740], [386, 800], [372, 845], [372, 891], [228, 891], [200, 845], [150, 800]]},
    {id: 'plum2', kind: 'tree', base: 958, pts: [[378, 800], [400, 770], [450, 755], [520, 756], [570, 775], [590, 820], [590, 880], [540, 920], [521, 958], [431, 958], [420, 920], [380, 880]]},
    {id: 'plum3', kind: 'tree', base: 1018, pts: [[536, 880], [560, 845], [610, 830], [660, 835], [700, 870], [700, 930], [660, 958], [656, 1018], [619, 1018], [600, 960], [550, 940]]},
    // the woods in the bottom left corner, under and round the plums
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 720], [60, 700], [120, 680], [150, 690], [150, 800], [200, 845], [228, 891], [300, 880], [380, 880], [420, 920], [431, 958], [520, 940], [560, 940], [600, 950], [640, 1024], [0, 1024]]},
    {id: 'woodsS', kind: 'woods', base: 'col', pts: [[640, 800], [700, 790], [760, 776], [850, 790], [862, 900], [906, 920], [920, 1024], [600, 1024]]},
    // the woods and flat rocks in the bottom right corner
    {id: 'woodsSE', kind: 'woods', base: 'col', pts: [[1290, 770], [1330, 730], [1403, 706], [1465, 698], [1536, 690], [1536, 1024], [1180, 1024], [1176, 870], [1250, 850], [1270, 800]]}
  ],
  ground: [
    // tall grass along the right edge
    ['G', [[1470, 300], [1504, 314], [1536, 296], [1536, 550], [1500, 556], [1470, 570], [1460, 520], [1470, 470]]],
    // leaf litter and bare dirt in the shade under the mulberry
    ['f', [[1094, 362], [1118, 424], [1222, 424], [1214, 362], [1256, 330], [1313, 340], [1340, 360], [1346, 470], [1300, 430], [1250, 470], [1200, 500], [1100, 500], [1076, 440], [1060, 380]]]
  ],
  trails: [
    // east to camp: from the dirt clearing south-east of the thicket, out the right edge
    [36, [866, 584], [936, 594], [1016, 609], [1086, 629], [1156, 654], [1180, 668], [1280, 683], [1372, 691], [1449, 683], [1536, 668]]
  ],
  hub: [900, 600],
  exits: [['camp', 1536, 668]],
  // the game's spots: the thicket's open south and east edge (where you pick), the mulberry's trunk, and the plums'
  // open side
  spots: {thicket: [[560, 680], [716, 632], [820, 556], [910, 508], [470, 262]], mulberry: [[1170, 428]], plums: [[396, 700], [486, 748]]}
};
