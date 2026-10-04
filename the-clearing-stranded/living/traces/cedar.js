// The Cedar Stand, traced to its painting (art/places/02-cedar-stand.webp, 1536 x 1024; the season paintings line up
// with it pixel for pixel, so this one trace serves them all). Every number is in painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods and bushes); anything whose feet are north of the base goes behind it.
//   deep: how far back a rock goes; its depth is taken at its middle.
// ground: kinds of ground over the grass: G tallgrass. trails: [width, points...], always walkable.
// spots: where the game's things are used. exits: where a trail leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.cedar = {
  id: 'cedar', painting: '02-cedar-stand', size: [1536, 1024], ground0: 'g',
  stand: [
    // the big post oak in the north-west corner, and the oak woods along the top, either side of the trail north
    {id: 'oakNW', kind: 'tree', base: 256, pts: [[0, 0], [420, 0], [400, 50], [380, 100], [350, 140], [310, 180], [262, 215], [240, 256], [110, 256], [60, 248], [0, 240]]},
    {id: 'woodsN', kind: 'woods', base: 'col', pts: [[400, 0], [1140, 0], [1128, 40], [1120, 90], [1080, 100], [1040, 104], [990, 108], [930, 100], [880, 120], [860, 140], [820, 132], [760, 130], [700, 122], [640, 128], [600, 148], [560, 170], [530, 150], [500, 110], [450, 104], [410, 80]]},
    {id: 'woodsNE', kind: 'woods', base: 'col', pts: [[1182, 0], [1536, 0], [1536, 270], [1500, 262], [1460, 250], [1420, 240], [1400, 200], [1390, 140], [1340, 130], [1300, 128], [1240, 122], [1200, 110], [1184, 60]]},
    // the woods down the west edge and along the bottom-left
    {id: 'woodsW', kind: 'woods', base: 'col', pts: [[0, 240], [130, 258], [166, 300], [168, 352], [142, 392], [150, 452], [164, 520], [152, 600], [142, 680], [160, 720], [0, 720]]},
    {id: 'woodsSW', kind: 'woods', base: 'col', pts: [[0, 700], [142, 680], [196, 738], [248, 786], [262, 860], [300, 880], [420, 878], [470, 896], [520, 870], [600, 858], [680, 866], [720, 896], [748, 904], [760, 930], [764, 1024], [0, 1024]]},
    // two small bushes in the grass at the bottom, and the big shrubs in the south-east corner
    {id: 'bushS1', kind: 'woods', base: 'col', pts: [[950, 950], [966, 932], [1000, 934], [1012, 960], [1000, 986], [956, 984]]},
    {id: 'bushS2', kind: 'woods', base: 'col', pts: [[1046, 1000], [1060, 960], [1090, 950], [1120, 966], [1126, 1024], [1046, 1024]]},
    {id: 'woodsSE', kind: 'woods', base: 'col', pts: [[1250, 1024], [1256, 930], [1290, 894], [1360, 884], [1420, 890], [1456, 880], [1470, 820], [1500, 806], [1536, 800], [1536, 1024]]},
    // the eastern red cedars
    {id: 'cedarBig', kind: 'tree', base: 466, pts: [[540, 300], [548, 230], [580, 170], [630, 132], [700, 120], [760, 128], [810, 160], [846, 210], [860, 270], [852, 340], [820, 390], [790, 430], [770, 466], [640, 466], [600, 420], [560, 380]]},
    {id: 'cedarNE', kind: 'tree', base: 256, pts: [[868, 210], [884, 150], [920, 108], [970, 104], [1000, 150], [1010, 210], [996, 256], [880, 256]]},
    {id: 'cedarW', kind: 'tree', base: 410, pts: [[262, 330], [272, 270], [306, 226], [345, 208], [386, 236], [410, 296], [408, 360], [384, 410], [292, 410], [266, 380]]},
    {id: 'bushW', kind: 'woods', base: 'col', pts: [[166, 360], [184, 326], [214, 322], [232, 350], [230, 392], [170, 396]]},
    {id: 'bushNW', kind: 'woods', base: 'col', pts: [[362, 180], [384, 140], [430, 128], [462, 160], [462, 220], [430, 244], [396, 240]]},
    {id: 'cedarMid', kind: 'tree', base: 528, pts: [[420, 460], [434, 410], [476, 376], [518, 392], [544, 446], [540, 500], [516, 528], [440, 528], [422, 500]]},
    {id: 'cedarW2', kind: 'tree', base: 654, pts: [[170, 590], [186, 530], [236, 486], [288, 500], [328, 556], [336, 616], [304, 654], [184, 654]]},
    {id: 'cedarSW', kind: 'tree', base: 880, pts: [[262, 810], [284, 750], [330, 712], [384, 742], [412, 810], [420, 880], [262, 880]]},
    {id: 'cedarS', kind: 'tree', base: 918, pts: [[850, 694], [880, 710], [905, 750], [935, 790], [952, 850], [940, 895], [900, 918], [820, 918], [800, 906], [772, 870], [760, 850], [772, 800], [800, 756], [826, 712]]},
    {id: 'cedarSE', kind: 'tree', base: 538, pts: [[994, 470], [1010, 420], [1052, 388], [1092, 400], [1124, 450], [1132, 510], [1110, 538], [1002, 538]]},
    {id: 'cedarE', kind: 'tree', base: 346, pts: [[1204, 270], [1222, 196], [1262, 146], [1304, 156], [1340, 216], [1354, 290], [1330, 346], [1214, 346]]},
    {id: 'cedarE2', kind: 'tree', base: 378, pts: [[1410, 330], [1430, 290], [1460, 280], [1490, 300], [1500, 350], [1490, 378], [1415, 378]]},
    {id: 'cedarE3', kind: 'tree', base: 496, pts: [[1400, 450], [1412, 414], [1430, 398], [1452, 420], [1460, 470], [1450, 496], [1404, 496]]},
    // the pile of dead grey cedar, the dead tree smothered in vines, and the rotten log among the flat rocks
    {id: 'deadfall', kind: 'brush', base: 'col', pts: [[412, 610], [440, 578], [500, 582], [560, 562], [620, 576], [664, 612], [706, 640], [702, 690], [644, 702], [600, 726], [560, 732], [500, 702], [450, 684], [412, 652]]},
    {id: 'tangle', kind: 'bramble', base: 'col', pts: [[906, 680], [930, 644], [980, 634], [1030, 650], [1080, 660], [1130, 640], [1160, 624], [1200, 640], [1260, 680], [1330, 700], [1380, 740], [1430, 770], [1462, 810], [1462, 860], [1420, 872], [1380, 884], [1300, 884], [1240, 870], [1180, 850], [1130, 826], [1080, 826], [1030, 800], [1000, 780], [960, 776], [920, 760]]},
    {id: 'logrocks', kind: 'rock', base: 'col', pts: [[1132, 380], [1160, 364], [1210, 372], [1240, 382], [1290, 378], [1340, 394], [1386, 420], [1390, 452], [1368, 464], [1300, 460], [1296, 488], [1260, 494], [1232, 488], [1210, 462], [1200, 420], [1136, 422]]},
    {id: 'bushE', kind: 'woods', base: 'col', pts: [[1160, 596], [1176, 578], [1210, 576], [1232, 598], [1226, 630], [1170, 630]]}
  ],
  ground: [
    ['G', [[1400, 650], [1536, 630], [1536, 800], [1470, 816], [1440, 780], [1400, 740]]]
  ],
  trails: [
    // north-east up to the Oak Woods: from the fork, up and round to the top edge
    [40, [868, 520], [884, 480], [910, 440], [944, 400], [976, 360], [1020, 322], [1062, 290], [1104, 262], [1132, 236], [1142, 192], [1134, 128], [1142, 64], [1162, 0]],
    // east to camp
    [40, [868, 520], [900, 530], [940, 544], [992, 552], [1040, 562], [1092, 570], [1192, 580], [1292, 590], [1392, 604], [1492, 610], [1536, 610]],
    // the short spur south from the fork, fading out in the grass above the lone cedar
    [36, [868, 520], [856, 580], [846, 640], [832, 690], [818, 736]]
  ],
  hub: [868, 530],
  exits: [['camp', 1536, 610], ['oak', 1162, 0]],
  // the game's spots: the cedars (where each trunk meets the ground), the deadfall, the vine tangle and the rotten log
  spots: {
    cedar: [[710, 470], [941, 260], [1282, 350], [340, 414], [482, 532], [236, 658], [1066, 542], [846, 920]],
    deadfall: [[560, 740]],
    tangle: [[1200, 876]],
    rotlog: [[1330, 472]]
  }
};
