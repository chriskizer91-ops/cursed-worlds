// The River Bank (river), traced to its painting (art/places/06-river-bank.webp, 1536 x 1024). Every number is in
// painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods, bushes and reeds); anything whose feet are north of the base goes behind it.
//   walk: true for things the walk grid leaves alone (the snag lies in the river, which already stops you).
// ground: kinds of ground over the grass: w the river, m mud, s sand, G tallgrass. Later ones win.
// trails: [width, points...], always walkable. spots: where the game's spots meet the ground. exits: where a trail
//   leaves the painting.
window.TRACES = window.TRACES || {};
window.TRACES.river = {
  id: 'river', painting: '06-river-bank', size: [1536, 1024],
  stand: [
    // the woods along the top, west of the north trail, and the big post oak standing out in front of them
    {id: 'woodsNW', kind: 'woods', base: 'col', pts: [[0, 0], [738, 0], [746, 60], [742, 120], [736, 170], [730, 232], [692, 238], [664, 200], [656, 150], [640, 60], [540, 28], [420, 18], [300, 22], [236, 60], [236, 200], [250, 258], [180, 252], [100, 262], [0, 256]]},
    {id: 'oakW', kind: 'tree', base: 438, pts: [[236, 60], [300, 22], [420, 18], [540, 28], [640, 60], [656, 150], [660, 250], [640, 300], [600, 332], [456, 332], [450, 440], [386, 440], [384, 394], [334, 394], [330, 330], [300, 326], [250, 290], [236, 200]]},
    // the black willow leaning over the water at the left; the west trail runs behind its trunks
    {id: 'willow', kind: 'tree', base: 606, pts: [[0, 256], [100, 262], [180, 252], [250, 258], [300, 290], [330, 330], [332, 400], [300, 440], [264, 500], [250, 560], [252, 612], [180, 614], [110, 610], [40, 612], [0, 610]]},
    // the bush on the bank east of the willow, and the cedar and bushes between the oak and the trail
    {id: 'bushBank', kind: 'woods', base: 'col', pts: [[252, 500], [300, 486], [360, 490], [392, 520], [396, 600], [384, 636], [300, 640], [252, 630]]},
    {id: 'bushOak', kind: 'woods', base: 'col', pts: [[480, 380], [520, 340], [560, 328], [610, 332], [648, 370], [652, 430], [640, 478], [600, 488], [540, 488], [492, 476], [478, 430]]},
    // east of the north trail: the shrubs and woods along the top, the cottonwood, the cedar by the trail, rocks
    {id: 'woodsNE', kind: 'woods', base: 'col', pts: [[786, 0], [1536, 0], [1536, 140], [1470, 152], [1420, 138], [1365, 130], [1320, 166], [1290, 230], [1250, 262], [1190, 262], [1170, 220], [1150, 130], [1060, 40], [960, 20], [904, 60], [900, 128], [850, 134], [800, 130], [794, 60]]},
    {id: 'cottonwood', kind: 'tree', base: 340, pts: [[842, 90], [880, 20], [980, 0], [1100, 0], [1160, 40], [1172, 140], [1150, 226], [1080, 250], [1074, 342], [1018, 342], [1010, 250], [930, 240], [848, 214]]},
    {id: 'cedarE', kind: 'tree', base: 408, pts: [[798, 300], [820, 264], [850, 256], [880, 280], [900, 330], [900, 400], [860, 410], [806, 410], [798, 370]]},
    {id: 'rocksE', kind: 'rock', base: 404, deep: 30, pts: [[900, 380], [920, 364], [960, 366], [976, 384], [970, 404], [904, 404]]},
    {id: 'rocksNE', kind: 'rock', base: 320, deep: 50, pts: [[1256, 270], [1280, 246], [1330, 244], [1350, 270], [1348, 316], [1260, 320]]},
    // bushes along the bank west of the clay, and the grey clay cut bank itself
    {id: 'bushE1', kind: 'woods', base: 'col', pts: [[930, 604], [962, 560], [962, 500], [1000, 486], [1060, 490], [1086, 520], [1090, 590], [1080, 638], [1005, 640], [930, 638]]},
    {id: 'bushE2', kind: 'woods', base: 'col', pts: [[1142, 560], [1170, 540], [1206, 550], [1212, 600], [1206, 634], [1142, 634]]},
    {id: 'claybank', kind: 'ledge', base: 636, pts: [[1160, 540], [1200, 528], [1300, 524], [1384, 530], [1386, 636], [1300, 638], [1200, 634], [1160, 630]]},
    // the canebrake at the right, with the dark bush at its west end, and the tree hanging over the water below it
    {id: 'cane', kind: 'reeds', base: 'col', pts: [[1244, 392], [1290, 374], [1340, 362], [1400, 352], [1470, 346], [1536, 340], [1536, 590], [1480, 594], [1430, 628], [1386, 636], [1384, 530], [1310, 526], [1306, 482], [1250, 478]]},
    {id: 'bushSE', kind: 'tree', base: 770, pts: [[1386, 640], [1410, 600], [1460, 588], [1536, 580], [1536, 800], [1490, 800], [1440, 764], [1400, 720], [1386, 690]]},
    // the cattails standing in the shallows at the left
    {id: 'cattails', kind: 'reeds', base: 'col', pts: [[0, 616], [130, 612], [200, 616], [262, 630], [330, 640], [358, 680], [358, 730], [320, 770], [300, 796], [220, 800], [200, 772], [120, 772], [40, 768], [0, 762]]},
    // the snag: a fallen dead tree lying in the current
    {id: 'snag', kind: 'tree', base: 'col', walk: true, pts: [[1046, 828], [1100, 812], [1180, 800], [1240, 788], [1280, 730], [1310, 736], [1300, 800], [1400, 840], [1460, 880], [1440, 896], [1350, 876], [1250, 852], [1150, 846], [1050, 842]]},
    // the trees on the near bank (below the picture) hanging over the water
    {id: 'treeSW', kind: 'tree', base: 1024, pts: [[0, 840], [40, 820], [100, 808], [190, 804], [250, 836], [300, 890], [324, 930], [330, 1024], [0, 1024]]},
    {id: 'treeS', kind: 'tree', base: 1024, pts: [[324, 930], [360, 900], [420, 876], [480, 874], [540, 900], [600, 916], [660, 958], [710, 996], [740, 1024], [330, 1024]]}
  ],
  ground: [
    // the river: everything below the painted bank
    ['w', [[0, 606], [130, 610], [250, 630], [390, 636], [420, 622], [500, 626], [560, 638], [644, 648], [652, 682], [700, 684], [790, 684], [800, 668], [900, 660], [1000, 660], [1100, 664], [1200, 668], [1300, 672], [1420, 672], [1470, 700], [1536, 740], [1536, 1024], [0, 1024]]],
    // the mud flat with the crawfish chimneys, and the muddy margin under the clay bank
    ['m', [[350, 640], [384, 622], [480, 620], [560, 636], [644, 646], [656, 680], [668, 712], [656, 740], [600, 762], [540, 772], [460, 770], [400, 762], [360, 740], [350, 700]]],
    ['m', [[1000, 642], [1100, 640], [1200, 636], [1300, 640], [1386, 636], [1430, 640], [1440, 672], [1300, 672], [1200, 668], [1000, 662]]],
    // the sand spit reaching out into the river
    ['s', [[783, 666], [860, 658], [993, 658], [1010, 690], [1040, 715], [1080, 738], [1106, 758], [1090, 778], [1040, 792], [980, 806], [900, 814], [840, 806], [790, 786], [766, 766], [790, 730], [815, 700], [828, 686]]],
    // tallgrass on the rise north of the creek trail
    ['G', [[1400, 160], [1470, 152], [1536, 145], [1536, 295], [1480, 312], [1420, 330], [1400, 260]]]
  ],
  trails: [
    // north to camp: down from the top edge to the meeting of the trails
    [40, [757, 0], [770, 80], [781, 143], [786, 220], [786, 300], [782, 380], [770, 450], [758, 500]],
    // on down to the flat rock at the water's edge
    [40, [758, 500], [742, 540], [726, 575], [712, 602]],
    // west, upstream, to the Pond: behind the willow's trunks and out the left edge
    [38, [758, 500], [640, 505], [520, 500], [440, 488], [360, 476], [300, 452], [250, 432], [200, 424], [120, 415], [40, 416], [0, 418]],
    // east, downstream, to the Creek Bottom: along the top of the canebrake and out the right edge
    [40, [758, 500], [840, 478], [900, 462], [1000, 438], [1100, 410], [1200, 384], [1300, 362], [1410, 336], [1480, 318], [1536, 306]]
  ],
  hub: [758, 500],
  exits: [['camp', 757, 0], ['pond', 0, 418], ['creek', 1536, 306]],
  // the game's spots, from left to right along the bank
  spots: {
    cattails: [[378, 690]],           // on the mud flat's west edge, beside the cattail clumps
    mudflat: [[500, 700]],            // among the crawfish chimneys
    edge: [[716, 656]],               // on the flat rock where the north trail meets the water
    sandbar: [[920, 744]],            // out on the sand spit
    snag: [[1084, 762]],              // the tip of the sand spit, nearest the fallen tree
    claybank: [[1270, 654]],          // the mud at the foot of the clay bank
    canebrake: [[1294, 500], [1440, 338]]  // the cane's west edge, and its top edge from the creek trail
  }
};
