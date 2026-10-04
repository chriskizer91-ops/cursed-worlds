// The Pond (pond), traced to its painting (art/places/07-pond.webp, 1536 x 1024). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods, bushes and reeds); anything whose feet are north of the base goes behind it.
// ground: kinds of ground over the grass: o the pond, G tallgrass. Later ones win.
// trails: [width, points...], always walkable. spots: where the game's spots meet the ground. exits: where a trail
//   leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.pond = {
  id: 'pond', painting: '07-pond', size: [1536, 1024],
  stand: [
    // the woods along the top, down to the water's north shore
    {id: 'woodsN', kind: 'woods', base: 'col', pts: [[0, 0], [900, 0], [904, 60], [900, 118], [850, 124], [826, 180], [812, 214], [800, 256], [720, 260], [650, 266], [560, 276], [500, 284], [450, 292], [386, 298], [340, 290], [300, 288], [296, 200], [240, 150], [160, 128], [60, 120], [0, 128]]},
    // the tree at the left, its trunk standing in the grass west of the cattails
    {id: 'treeW', kind: 'tree', base: 430, pts: [[0, 128], [60, 120], [160, 128], [240, 150], [296, 200], [300, 290], [260, 306], [236, 330], [236, 384], [150, 386], [144, 432], [98, 432], [96, 404], [40, 404], [0, 410]]},
    // the big oak at the top right, and the bushes along the east shore
    {id: 'oakNE', kind: 'tree', base: 334, pts: [[1050, 60], [1100, 10], [1200, 0], [1536, 0], [1536, 240], [1460, 244], [1450, 300], [1446, 336], [1336, 336], [1314, 220], [1260, 216], [1180, 214], [1100, 196], [1060, 150]]},
    {id: 'juniperE', kind: 'tree', base: 438, pts: [[1256, 340], [1290, 304], [1330, 310], [1342, 360], [1336, 410], [1316, 440], [1300, 440], [1300, 418], [1276, 416], [1270, 380]]},
    {id: 'bushE', kind: 'woods', base: 'col', pts: [[1308, 410], [1340, 392], [1380, 394], [1404, 420], [1404, 470], [1380, 490], [1320, 498], [1312, 470]]},
    {id: 'bushEdge', kind: 'woods', base: 'col', pts: [[1462, 300], [1466, 250], [1536, 244], [1536, 456], [1500, 450], [1470, 420], [1460, 360]]},
    {id: 'rockE', kind: 'rock', base: 484, deep: 30, pts: [[1436, 470], [1450, 446], [1490, 443], [1508, 456], [1506, 484], [1440, 484]]},
    // the cattail beds: one at the west shore, one along the north shore
    {id: 'cattailsW', kind: 'reeds', base: 'col', pts: [[250, 388], [300, 380], [342, 396], [374, 430], [380, 500], [374, 560], [362, 600], [320, 612], [280, 600], [250, 572], [210, 556], [188, 540], [186, 452], [226, 446]]},
    {id: 'cattailsN', kind: 'reeds', base: 'col', pts: [[810, 196], [850, 178], [950, 172], [1050, 172], [1150, 188], [1184, 214], [1186, 300], [1182, 376], [1100, 374], [1000, 352], [900, 334], [840, 306], [812, 260]]},
    // the woods at the bottom left, its rocks and cedar, and the bushes and trees along the bottom
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 540], [40, 536], [70, 580], [130, 584], [180, 600], [220, 622], [240, 660], [244, 700], [290, 734], [316, 780], [324, 840], [322, 852], [236, 852], [236, 1024], [0, 1024]]},
    {id: 'rockSW1', kind: 'rock', base: 890, deep: 30, pts: [[232, 870], [250, 852], [300, 850], [325, 870], [322, 892], [236, 892]]},
    {id: 'rockSW2', kind: 'rock', base: 998, deep: 60, pts: [[285, 960], [300, 925], [350, 915], [400, 905], [430, 930], [430, 990], [300, 1000]]},
    {id: 'cedarS', kind: 'tree', base: 916, pts: [[320, 840], [340, 800], [380, 780], [420, 790], [444, 840], [440, 900], [400, 920], [330, 916]]},
    {id: 'woodsS', kind: 'woods', base: 'col', pts: [[236, 892], [322, 892], [300, 925], [285, 960], [300, 1000], [430, 990], [430, 1024], [236, 1024]]},
    {id: 'bushS', kind: 'woods', base: 'col', pts: [[430, 990], [440, 880], [470, 830], [520, 810], [580, 818], [620, 850], [680, 856], [760, 866], [830, 880], [860, 920], [880, 1024], [430, 1024]]},
    {id: 'bushSE', kind: 'woods', base: 'col', pts: [[990, 1024], [1000, 900], [1060, 884], [1135, 876], [1178, 833], [1228, 811], [1299, 783], [1344, 768], [1352, 1024]]},
    {id: 'treeSE', kind: 'tree', base: 1024, pts: [[1344, 768], [1363, 761], [1421, 726], [1478, 697], [1536, 676], [1536, 1024], [1352, 1024]]}
  ],
  ground: [
    // the pond, following its painted shore
    ['o', [[326, 394], [360, 362], [400, 332], [450, 302], [500, 292], [560, 284], [650, 274], [720, 266], [800, 262], [830, 282], [900, 322], [1000, 344], [1100, 364], [1180, 376], [1222, 400], [1250, 438], [1278, 474], [1296, 510], [1296, 550], [1284, 584], [1250, 610], [1201, 630], [1164, 652], [1114, 677], [1082, 696], [1040, 705], [1000, 712], [960, 725], [930, 745], [910, 760], [880, 762], [800, 762], [700, 758], [660, 752], [620, 716], [590, 690], [560, 668], [510, 652], [460, 638], [410, 614], [372, 590], [362, 520], [350, 450]]],
    // tallgrass at the water's edge south of the west cattails
    ['G', [[250, 614], [320, 618], [362, 604], [380, 596], [410, 620], [460, 644], [500, 658], [480, 690], [400, 700], [300, 690], [256, 660]]]
  ],
  trails: [
    // east to the River Bank: from the gravelly edge round the south-east shore and out the right edge
    [40, [996, 760], [1050, 776], [1103, 762], [1169, 742], [1269, 720], [1369, 700], [1469, 667], [1536, 640]]
  ],
  hub: [1120, 752],
  exits: [['river', 1536, 640]],
  // the game's spots
  spots: {
    pondedge: [[1000, 730]],                         // the gravel where the trail reaches the water
    shallows: [[780, 774]],                          // the near (south) shore, over the clear shallows
    cattailsP: [[176, 500], [300, 636], [1198, 300]] // beside the west bed (its west side and its south end) and the north bed's east end
  }
};
