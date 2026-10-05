// The Prairie, traced to its painting (art/places/04-prairie.webp, 1536 x 1024). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods, bushes and the ledge running across the slope); anything whose feet are north of
//   the base goes behind it. walk: true for things you can walk through (the stand only hides you). deep: how far
//   back a big rock goes; its depth is taken at its middle, so things set on top of it show in front of it.
// ground: kinds of ground over the grass: G tallgrass. trails: [width, points...], always walkable.
// spots: where things are used. exits: where a trail leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.prairie = {
  id: 'prairie', painting: '04-prairie', size: [1536, 1024],
  stand: [
    // bushes and cedars along the top left
    {id: 'bushNW', kind: 'woods', base: 'col', pts: [[0, 52], [40, 56], [64, 90], [70, 116], [110, 118], [150, 124], [196, 146], [230, 180], [234, 226], [214, 250], [150, 254], [80, 238], [30, 228], [0, 222]]},
    {id: 'bushN1', kind: 'woods', base: 'col', pts: [[108, 0], [190, 0], [192, 40], [176, 66], [130, 66], [108, 40]]},
    {id: 'bushN2', kind: 'woods', base: 'col', pts: [[196, 40], [240, 30], [272, 50], [276, 100], [256, 122], [210, 122], [192, 90]]},
    {id: 'bushN3', kind: 'woods', base: 'col', pts: [[280, 0], [410, 0], [412, 50], [390, 72], [330, 74], [290, 60]]},
    // the band of oak brush and cedars across the top
    {id: 'woodsN', kind: 'woods', base: 'col', pts: [[410, 0], [830, 0], [832, 60], [812, 92], [760, 118], [700, 122], [660, 108], [600, 104], [540, 108], [480, 104], [430, 92], [410, 60]]},
    {id: 'bushNL', kind: 'woods', base: 'col', pts: [[730, 124], [780, 112], [812, 84], [850, 84], [886, 110], [888, 160], [850, 166], [800, 182], [740, 180]]},
    // the cedar east of the first yucca
    {id: 'cedarY', kind: 'tree', base: 280, pts: [[514, 280], [512, 236], [540, 196], [566, 184], [600, 200], [618, 240], [616, 280]]},
    // bushes down the left side, above and below the trail to camp
    {id: 'bushW2', kind: 'woods', base: 'col', pts: [[96, 300], [130, 280], [200, 280], [236, 300], [240, 340], [220, 362], [110, 362], [92, 340]]},
    {id: 'bushW3', kind: 'woods', base: 'col', pts: [[0, 356], [40, 354], [80, 372], [100, 410], [104, 470], [92, 512], [0, 516]]},
    {id: 'bushW4', kind: 'woods', base: 'col', pts: [[0, 590], [40, 580], [90, 590], [130, 612], [150, 650], [140, 690], [90, 696], [0, 694]]},
    // the cedars and brush in the bottom left corner
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 724], [40, 726], [70, 744], [110, 750], [150, 764], [200, 752], [240, 734], [280, 748], [320, 780], [350, 786], [420, 788], [470, 806], [500, 840], [504, 880], [470, 914], [400, 930], [300, 938], [210, 932], [140, 944], [70, 938], [0, 946]]},
    // the limestone ridge: ledges of stacked rock running across the slope, the rock pile below them, and the bushes on them
    {id: 'ledgeN', kind: 'ledge', base: 'col', pts: [[830, 14], [896, 10], [935, 22], [985, 38], [1025, 52], [1075, 56], [1117, 62], [1112, 132], [1090, 142], [1054, 128], [1012, 120], [960, 128], [912, 128], [874, 106], [866, 56], [832, 52]]},
    {id: 'ledgeE', kind: 'ledge', base: 'col', pts: [[1100, 80], [1135, 62], [1190, 84], [1222, 96], [1268, 98], [1322, 104], [1336, 128], [1390, 138], [1430, 160], [1436, 192], [1410, 234], [1368, 256], [1262, 256], [1226, 222], [1150, 224], [1122, 184], [1104, 140]]},
    {id: 'rockPile', kind: 'rock', base: 242, deep: 40, pts: [[962, 196], [990, 186], [1040, 190], [1070, 212], [1070, 240], [1020, 244], [966, 228]]},
    {id: 'bushR1', kind: 'woods', base: 'col', pts: [[996, 120], [1040, 112], [1080, 130], [1082, 172], [1040, 178], [998, 170]]},
    {id: 'bushR2', kind: 'woods', base: 'col', pts: [[1086, 204], [1110, 196], [1138, 206], [1140, 246], [1090, 248]]},
    {id: 'bushTop', kind: 'woods', base: 'col', pts: [[940, 0], [1040, 0], [1036, 30], [1000, 44], [956, 40]]},
    {id: 'bushNE', kind: 'woods', base: 'col', pts: [[1322, 0], [1536, 0], [1536, 96], [1480, 92], [1420, 90], [1360, 88], [1324, 60]]},
    {id: 'bushE1', kind: 'woods', base: 'col', pts: [[1404, 170], [1440, 160], [1478, 176], [1482, 230], [1460, 256], [1410, 254]]},
    {id: 'bushE2', kind: 'woods', base: 'col', pts: [[1156, 256], [1200, 246], [1240, 262], [1246, 310], [1226, 334], [1170, 332], [1154, 300]]},
    {id: 'cedarE', kind: 'tree', base: 392, pts: [[1380, 392], [1384, 350], [1402, 326], [1422, 346], [1430, 392]]},
    // the lone hackberry: crown and trunk, and the brush round its foot
    {id: 'hackberry', kind: 'tree', base: 517, pts: [[652, 376], [652, 339], [677, 270], [727, 226], [784, 201], [846, 189], [915, 201], [965, 245], [1002, 276], [1021, 314], [1052, 351], [1066, 395], [1040, 426], [990, 446], [952, 432], [902, 428], [886, 464], [892, 517], [822, 517], [822, 440], [784, 420], [727, 414], [677, 401]]},
    {id: 'bushT', kind: 'woods', base: 'col', pts: [[734, 452], [780, 440], [822, 452], [822, 517], [800, 530], [760, 524], [736, 500]]},
    {id: 'bushT2', kind: 'woods', base: 'col', pts: [[824, 524], [870, 518], [902, 528], [904, 556], [870, 566], [828, 562]]},
    // the cedar the east path passes behind
    {id: 'cedarM', kind: 'tree', base: 540, pts: [[1124, 540], [1128, 500], [1150, 474], [1174, 494], [1184, 540]]},
    // the prickly pear clumps: spines, nobody walks through them
    {id: 'pearW', kind: 'brush', base: 'col', pts: [[834, 760], [852, 712], [900, 700], [922, 686], [976, 694], [1002, 726], [1026, 762], [1006, 782], [972, 818], [920, 804], [870, 800], [840, 790]]},
    {id: 'pearE', kind: 'brush', base: 'col', pts: [[1182, 580], [1200, 540], [1250, 526], [1288, 520], [1326, 544], [1348, 566], [1366, 606], [1350, 624], [1304, 638], [1270, 622], [1224, 616], [1190, 604]]},
    // the two yuccas in flower: their stalks hide you, but you can step round them
    {id: 'yuccaN', kind: 'brush', walk: true, base: 340, pts: [[420, 330], [430, 290], [452, 268], [456, 206], [472, 206], [478, 268], [505, 280], [518, 318], [506, 344], [430, 344]]},
    {id: 'yuccaS', kind: 'brush', walk: true, base: 792, pts: [[596, 780], [606, 740], [640, 716], [642, 650], [660, 650], [664, 716], [700, 730], [722, 770], [710, 800], [610, 800]]},
    // the cedars and brush in the bottom right corner
    {id: 'cedarSE', kind: 'tree', base: 767, pts: [[1084, 767], [1090, 700], [1120, 650], [1150, 650], [1190, 690], [1208, 740], [1200, 767]]},
    {id: 'woodsSE', kind: 'woods', base: 'col', pts: [[1210, 736], [1260, 724], [1300, 730], [1350, 760], [1400, 800], [1440, 820], [1462, 760], [1500, 744], [1536, 740], [1536, 1024], [1030, 1024], [1030, 940], [1060, 890], [1110, 880], [1120, 800], [1180, 790]]}
  ],
  ground: [
    // tall grass running away to the east, and along the bottom
    ['G', [[1150, 330], [1250, 300], [1380, 320], [1536, 300], [1536, 740], [1500, 744], [1462, 760], [1440, 820], [1400, 800], [1350, 760], [1300, 730], [1260, 724], [1220, 700], [1200, 660], [1160, 620], [1150, 560]]],
    ['G', [[300, 980], [400, 944], [480, 924], [520, 872], [600, 856], [700, 850], [860, 858], [960, 878], [1030, 900], [1030, 1024], [300, 1024]]],
    // the patch of last year's bluestem, cured to straw
    ['G', [[164, 540], [200, 512], [260, 504], [340, 500], [420, 506], [480, 520], [494, 560], [490, 610], [460, 640], [380, 652], [300, 650], [230, 630], [180, 600]]]
  ],
  trails: [
    // west to camp: in from the left edge, round the south side of the dry grass
    [40, [0, 556], [57, 561], [100, 576], [129, 597], [164, 626], [207, 654], [257, 676], [321, 686], [393, 686], [464, 679], [530, 664], [600, 644]],
    // on east past the foot of the hackberry, behind the little cedar, and out into the far prairie
    [36, [600, 644], [680, 610], [760, 584], [840, 584], [910, 566], [980, 544], [1060, 516], [1130, 498], [1188, 494], [1272, 485], [1347, 472], [1413, 456], [1463, 447], [1500, 440]],
    // the faint game trail down through the cedars in the bottom right corner to the salt lick, hidden until it is found
    {w: 34, kind: 'H', to: 'lick', pts: [[1470, 736], [1488, 790], [1510, 846], [1536, 878], [1570, 884]]}
  ],
  hub: [600, 644],
  exits: [['camp', 0, 556], ['lick', 1536, 878, 'hidden']],
  // the game's spots: the ridge's loose stones, the yuccas, the prickly pears, the lone hackberry, the rabbit runs,
  // the dry grass, and the far prairie
  spots: {ridge: [[1290, 272], [1030, 262]], yucca: [[468, 352], [468, 312], [656, 806], [656, 766]], pear: [[910, 828], [1300, 648]], hackberry: [[856, 518]],
    runs: [[608, 500]], dry: [[330, 580]], far: [[1500, 440]]}
};
