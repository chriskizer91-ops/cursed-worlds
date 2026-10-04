// The Creek Bottom (creek), traced to its painting (art/places/08-creek-bottom.webp, 1536 x 1024). Every number is in
// painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods and bushes); anything whose feet are north of the base goes behind it.
//   deep: how far back a big rock goes; its depth is taken at its middle, so things set on top of it show in front of it.
// ground: kinds of ground over the leaf litter: c the creek (no walking in it), s the gravel bars along it.
// trails: [width, points...], always walkable. spots: where the game's things are used. exits: where a trail leaves.
window.TRACES = window.TRACES || {};
window.TRACES.creek = {
  id: 'creek', painting: '08-creek-bottom', size: [1536, 1024], ground0: 'f',
  stand: [
    // the woods down the left edge, and the big pecan at the top left (its trunk meets the ground among its roots)
    {id: 'woodsW', kind: 'woods', base: 'col', pts: [[0, 0], [140, 0], [140, 120], [170, 190], [230, 220], [256, 260], [250, 330], [220, 370], [150, 380], [80, 420], [0, 430]]},
    {id: 'pecanNW', kind: 'tree', base: 328, pts: [[140, 0], [540, 0], [530, 110], [480, 180], [420, 210], [398, 250], [404, 300], [412, 328], [292, 328], [300, 280], [298, 230], [240, 210], [180, 180], [150, 120]]},
    // the second big pecan, its crown reaching over to the pale tree behind it
    {id: 'pecanMid', kind: 'tree', base: 474, pts: [[540, 0], [770, 0], [778, 120], [770, 230], [730, 290], [676, 320], [668, 474], [616, 474], [614, 330], [560, 318], [500, 300], [462, 250], [450, 170], [490, 100]]},
    // the white sycamore by the creek
    {id: 'sycamore', kind: 'tree', base: 230, pts: [[770, 0], [930, 0], [930, 70], [910, 140], [870, 186], [850, 200], [848, 230], [778, 230], [772, 150]]},
    // the grapevine tree, its crown and the curtains of vine hanging to the ground round its trunk
    {id: 'grapeTree', kind: 'tree', base: 764, pts: [[0, 430], [80, 420], [150, 380], [220, 370], [300, 360], [360, 380], [404, 420], [410, 500], [396, 560], [396, 640], [392, 700], [300, 740], [282, 764], [192, 764], [150, 740], [80, 772], [0, 776]]},
    // the big leafy bush in the middle, and the rock beside the trail
    {id: 'bushMid', kind: 'woods', base: 'col', pts: [[396, 610], [400, 530], [430, 540], [500, 540], [580, 548], [636, 580], [648, 640], [630, 700], [590, 740], [520, 752], [440, 748], [404, 716], [392, 660]]},
    {id: 'rockTrail', kind: 'rock', base: 782, deep: 30, pts: [[370, 762], [380, 742], [410, 732], [440, 742], [450, 764], [440, 782], [380, 782]]},
    // stones on the near bank
    {id: 'rockBankN', kind: 'rock', base: 372, deep: 30, pts: [[866, 340], [880, 326], [910, 324], [924, 342], [920, 372], [870, 372]]},
    {id: 'rockBankM', kind: 'rock', base: 614, deep: 40, pts: [[832, 570], [846, 548], [880, 544], [900, 566], [898, 600], [880, 614], [840, 614]]},
    // the fallen pecan limb below the trail
    {id: 'limb', kind: 'woods', base: 'col', pts: [[648, 846], [700, 822], [760, 796], [820, 776], [868, 764], [878, 782], [830, 800], [770, 822], [710, 848], [660, 866]]},
    // the brush along the bottom, from the left edge to the creek
    {id: 'brushS', kind: 'woods', base: 'col', pts: [[0, 852], [130, 858], [256, 864], [384, 850], [520, 842], [600, 838], [650, 866], [710, 856], [770, 830], [880, 790], [904, 760], [960, 756], [1030, 758], [1084, 726], [1120, 730], [1148, 760], [1146, 830], [1150, 900], [1162, 960], [1172, 1024], [0, 1024]]},
    // across the creek: the woods along the top, and the bois d'arc grove in front of them
    {id: 'woodsNE', kind: 'woods', base: 'col', pts: [[1022, 0], [1536, 0], [1536, 210], [1410, 210], [1350, 230], [1250, 220], [1180, 200], [1120, 228], [1096, 240], [1082, 200], [1094, 150], [1070, 100], [1040, 50]]},
    {id: 'osageA', kind: 'tree', base: 414, pts: [[1120, 228], [1180, 200], [1250, 220], [1258, 300], [1240, 360], [1206, 372], [1204, 414], [1172, 414], [1170, 372], [1136, 350], [1124, 300]]},
    {id: 'osageB', kind: 'tree', base: 482, pts: [[1250, 220], [1350, 230], [1350, 330], [1318, 370], [1310, 420], [1314, 482], [1260, 482], [1266, 420], [1256, 370], [1250, 300]]},
    {id: 'osageC', kind: 'tree', base: 526, pts: [[1350, 230], [1410, 210], [1420, 300], [1404, 400], [1402, 526], [1360, 526], [1364, 420], [1350, 380], [1350, 330]]},
    {id: 'osageD', kind: 'tree', base: 538, pts: [[1410, 210], [1536, 210], [1536, 400], [1490, 420], [1462, 440], [1474, 538], [1402, 538], [1418, 470], [1414, 420], [1404, 400], [1420, 300]]},
    // brush on the far bank, either side of the downstream path
    {id: 'brushE1', kind: 'woods', base: 'col', pts: [[1240, 600], [1262, 584], [1290, 600], [1300, 650], [1312, 690], [1350, 700], [1366, 740], [1360, 776], [1320, 784], [1300, 750], [1278, 712], [1260, 680], [1244, 646]]},
    // stones along the far bank
    {id: 'rockE1', kind: 'rock', base: 828, deep: 20, pts: [[1326, 814], [1336, 802], [1356, 800], [1366, 814], [1360, 828], [1330, 828]]},
    {id: 'rockE2', kind: 'rock', base: 872, deep: 24, pts: [[1348, 852], [1360, 836], [1386, 834], [1400, 852], [1394, 872], [1352, 872]]},
    {id: 'rockE3', kind: 'rock', base: 978, deep: 30, pts: [[1346, 956], [1356, 938], [1384, 934], [1398, 954], [1390, 978], [1352, 978]]},
    {id: 'brushE2', kind: 'woods', base: 'col', pts: [[1462, 440], [1536, 400], [1536, 800], [1470, 792], [1430, 740], [1408, 660], [1406, 560], [1474, 538]]}
  ],
  ground: [
    // the creek, from the top edge down to the bottom right
    ['c', [[928, 0], [1016, 0], [1030, 64], [1066, 128], [1092, 192], [1070, 256], [1036, 320], [1014, 384], [1020, 420], [1050, 470], [1065, 520],
      [1110, 568], [1150, 592], [1200, 626], [1240, 664], [1272, 702], [1300, 740], [1316, 780], [1322, 832], [1330, 896], [1340, 960], [1350, 1024],
      [1172, 1024], [1162, 960], [1150, 900], [1146, 830], [1148, 760], [1120, 730], [1084, 712], [1060, 690], [1010, 650], [990, 610], [950, 560],
      [915, 500], [888, 448], [898, 384], [905, 320], [934, 256], [958, 192], [936, 128], [938, 64]]],
    // the gravel bar on the near side, and the sandy bank on the far side
    ['s', [[900, 690], [960, 640], [1010, 650], [1060, 690], [1095, 720], [1100, 750], [1030, 750], [960, 744], [900, 750]]],
    ['s', [[1065, 520], [1080, 480], [1120, 470], [1170, 500], [1160, 560], [1110, 560]]]
  ],
  trails: [
    // west to the River Bank, past the grapevine tree and the fallen limb, to the gravel bar
    [40, [0, 814], [128, 826], [256, 834], [384, 812], [500, 800], [640, 788], [768, 760], [870, 730]],
    // the ford: over the gravel bar and through the shallow riffle to the far bank
    [36, [870, 730], [950, 696], [1010, 640], [1060, 588], [1110, 548], [1170, 526]],
    // the path downstream along the far bank, past the bois d'arc grove, off the bottom edge
    [40, [1170, 526], [1230, 532], [1272, 556], [1300, 580], [1326, 606], [1356, 636], [1374, 672], [1392, 740], [1420, 804], [1446, 870], [1466, 937], [1486, 1024]]
  ],
  hub: [870, 730],
  exits: [['river', 0, 814]],
  // the game's spots: two big pecans, the grapevine tree, the fallen limb, the bois d'arc grove, the white sycamore,
  // and the path on downstream
  spots: {pecans: [[352, 336], [642, 482]], grapes: [[238, 772]], hardwood: [[790, 786]], osage: [[1286, 490], [1382, 534]],
    stand: [[812, 238]], down: [[1476, 996]],
    // the pool below the riffle, fished from the gravel bar
    fishhole: [[1040, 744]]}
};
